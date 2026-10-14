import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import GarticHeader, { RingTimer, WaitingCard } from './GarticHeader.jsx';
import DrawingCanvas from './DrawingCanvas.jsx';
import { useDraft } from './useDraft.js';
import { useTouchLayout } from './useTouchLayout.js';

/**
 * Atelier plein écran pour téléphone : la page ne bouge plus, la toile prend toute la place
 * et reste loin des bords de l'écran (les gestes du navigateur y volent le doigt).
 */
function MobileStudio({ prompt, pub, strokes, setStrokes, onDone }) {
  // Pendant le dessin : on fige la page derrière (pas de défilement ni de « tirer pour rafraîchir »)
  useEffect(() => {
    const html = document.documentElement;
    const previous = { overflow: document.body.style.overflow, overscroll: html.style.overscrollBehavior };
    document.body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = previous.overflow;
      html.style.overscrollBehavior = previous.overscroll;
    };
  }, []);

  const doneCount = (pub.requiredIds || []).filter((id) => (pub.doneIds || []).includes(id)).length;

  return createPortal(
    <div className="gp-studio gp-nosel" role="dialog" aria-label="Dessine">
      {/* Consigne, minuteur, validation */}
      <div className="shrink-0 flex items-center gap-2.5 px-3 py-2 border-b border-white/10">
        <RingTimer endsAt={pub.stepEndsAt} durationSec={pub.stepDurationSec} size={46} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-pink-200/80 font-bold">
            À dessiner · {doneCount}/{(pub.requiredIds || []).length} ont fini
          </p>
          <p className="gp-hand text-2xl leading-tight text-white line-clamp-2 break-words">{prompt}</p>
        </div>
        <button type="button" className="gp-btn px-4 py-2 text-base shrink-0" style={{ minHeight: 44 }} onClick={onDone}>
          ✅ Fini
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <DrawingCanvas strokes={strokes} onChange={setStrokes} layout="mobile" />
      </div>
    </div>,
    document.body,
  );
}

/** Étape "dessin" : dessiner la phrase reçue. */
export default function PhaseDraw() {
  const { gameState } = useGameStore();
  const touch = useTouchLayout();
  const pub = gameState?.public || {};
  const priv = gameState?.private || {};
  const done = !!priv.done;
  const prompt = priv.prompt?.text || '…';

  const [strokes, setStrokes] = useDraft(
    `tel:${pub.gameKey}:${pub.step}`,
    [],
    (value) => api.gameAction('submitDrawing', { strokes: value, step: pub.step, draft: true }),
    { done, endsAt: pub.stepEndsAt, isEmpty: (v) => v.length === 0 },
  );
  const submit = () => api.gameAction('submitDrawing', { strokes, step: pub.step });

  return (
    <div className="space-y-5">
      <GarticHeader title="Dessine !" />

      <div className="flex justify-center">
        <div className="gp-sticky px-6 py-3 max-w-xl -rotate-1 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-800/70 font-bold">À dessiner</p>
          <p className="gp-hand text-3xl sm:text-4xl leading-tight break-words">{prompt}</p>
        </div>
      </div>

      {done ? (
        <WaitingCard icon="🎨" message="Ton dessin est parti. On attend les autres artistes…" onEdit={() => api.gameAction('edit', {})} />
      ) : touch ? (
        <MobileStudio prompt={prompt} pub={pub} strokes={strokes} setStrokes={setStrokes} onDone={submit} />
      ) : (
        <>
          <DrawingCanvas strokes={strokes} onChange={setStrokes} />
          <div className="flex justify-center">
            <button type="button" className="gp-btn text-lg w-full sm:w-auto" onClick={submit}>
              ✅ J'ai fini
            </button>
          </div>
        </>
      )}
    </div>
  );
}
