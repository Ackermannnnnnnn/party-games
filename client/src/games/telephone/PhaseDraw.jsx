import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import StepHeader from './StepHeader.jsx';
import DrawingCanvas from './DrawingCanvas.jsx';
import { useDraft } from './useDraft.js';

/** Étape "dessin" : dessiner la phrase reçue. */
export default function PhaseDraw() {
  const { gameState } = useGameStore();
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

  return (
    <div className="card space-y-4">
      <StepHeader icon="🎨" title="Dessine !" />

      <div className="text-center bg-slate-900/60 rounded-xl px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-slate-400">À dessiner</p>
        <p className="text-xl sm:text-2xl font-semibold text-white break-words">« {prompt} »</p>
      </div>

      <div className="max-w-2xl mx-auto w-full">
        <DrawingCanvas strokes={strokes} onChange={setStrokes} disabled={done} />
      </div>

      {done ? (
        <div className="text-center space-y-3">
          <p className="text-emerald-300 font-semibold">✅ Dessin envoyé</p>
          <p className="text-slate-400 text-sm">En attente des autres joueurs…</p>
          <button type="button" className="btn btn-ghost text-sm" onClick={() => api.gameAction('edit', {})}>
            ✏️ Modifier
          </button>
        </div>
      ) : (
        <div className="flex justify-center">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => api.gameAction('submitDrawing', { strokes, step: pub.step })}
          >
            ✅ J'ai fini
          </button>
        </div>
      )}
    </div>
  );
}
