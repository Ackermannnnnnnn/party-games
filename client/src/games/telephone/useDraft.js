import { useEffect, useRef, useState } from 'react';

/**
 * Brouillon d'une étape (texte ou dessin).
 * - Gardé dans sessionStorage : un rechargement de page en plein dessin ne fait pas tout perdre.
 * - Envoyé régulièrement au serveur comme "brouillon" (sans valider), puis une dernière fois
 *   à la fin du minuteur : si le temps s'écoule, c'est ce brouillon qui est utilisé.
 *
 * @param {string} key        identifiant unique de l'étape (room + partie + étape)
 * @param {*} initial         valeur de départ ('' ou [])
 * @param {(value) => void} sendDraft  envoie le brouillon au serveur
 * @param {object} opts       { done, endsAt, isEmpty }
 */
export function useDraft(key, initial, sendDraft, { done, endsAt, isEmpty }) {
  const [value, setValue] = useState(() => {
    try {
      const saved = sessionStorage.getItem(key);
      return saved ? JSON.parse(saved) : initial;
    } catch {
      return initial;
    }
  });
  const valueRef = useRef(value);
  const doneRef = useRef(done);
  const dirty = useRef(false);
  valueRef.current = value;
  doneRef.current = done;

  const update = (next) => {
    dirty.current = true;
    setValue(next);
    try { sessionStorage.setItem(key, JSON.stringify(next)); } catch {}
  };

  const flush = () => {
    if (doneRef.current || !dirty.current || isEmpty(valueRef.current)) return;
    dirty.current = false;
    sendDraft(valueRef.current);
  };

  // Sauvegarde côté serveur un peu après la dernière modification
  useEffect(() => {
    if (done || !dirty.current) return undefined;
    const t = setTimeout(flush, 1500);
    return () => clearTimeout(t);
  }, [value, done]);

  // Dernier envoi à la fin du minuteur, et quand l'onglet passe en arrière-plan
  useEffect(() => {
    const ms = endsAt ? endsAt - Date.now() : 0;
    const t = ms > 0 ? setTimeout(flush, ms) : null;
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      if (t) clearTimeout(t);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [endsAt]);

  return [value, update];
}
