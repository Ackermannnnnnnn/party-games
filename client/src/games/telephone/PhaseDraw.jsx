import { useGameStore } from '../../store/gameStore.js';
import { api } from '../../hooks/useSocket.js';
import GarticHeader, { WaitingCard } from './GarticHeader.jsx';
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
      ) : (
        <>
          <DrawingCanvas strokes={strokes} onChange={setStrokes} />
          <div className="flex justify-center">
            <button
              type="button"
              className="gp-btn text-lg w-full sm:w-auto"
              onClick={() => api.gameAction('submitDrawing', { strokes, step: pub.step })}
            >
              ✅ J'ai fini
            </button>
          </div>
        </>
      )}
    </div>
  );
}
