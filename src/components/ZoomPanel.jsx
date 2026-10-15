import { MAX_ZOOM } from '@/lib/view';
import { WIDTH } from '@/lib/strokes';
import { DwellBar } from './DwellBar';

// Daayein taraf: zoom slider aur minimap.
// data-slider wale hisson par ungli phirane se seedha value badalti hai (rukne ki zaroorat nahi).
export function ZoomPanel({ view, hover, onReset }) {
  const t = Math.log(view.scale) / Math.log(MAX_ZOOM); // 0 se 1
  const resetHovered = hover.id === 'zoom-reset';

  // Minimap mein dikhne wala hissa (screen jaisa, is liye x ulta)
  const x0 = -view.x / view.scale;
  const x1 = x0 + WIDTH / view.scale;
  const y0 = -view.y / view.scale;
  const view720 = 720;

  return (
    <div
      data-ui
      className="absolute bottom-20 right-3 z-10 flex w-28 flex-col items-center gap-2 rounded-xl bg-black/55 p-2 backdrop-blur-sm"
    >
      <div
        data-slider="pan"
        aria-label="Drawing ka hissa chunein"
        className="relative h-14 w-24 overflow-hidden rounded border border-ink-700 bg-ink-900/80"
      >
        <div
          className="absolute rounded-sm border border-cyan-300 bg-cyan-300/20"
          style={{
            left: `${(1 - x1 / WIDTH) * 100}%`,
            top: `${(y0 / view720) * 100}%`,
            width: `${100 / view.scale}%`,
            height: `${100 / view.scale}%`,
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <div
          data-slider="zoom"
          aria-label="Zoom"
          className="relative h-24 w-9 rounded-full border border-ink-700 bg-ink-900/80"
        >
          <div
            className="absolute inset-x-0 bottom-0 rounded-full bg-cyan-400/30"
            style={{ height: `${t * 100}%` }}
          />
          <div
            className="absolute left-1/2 h-4 w-4 -translate-x-1/2 translate-y-1/2 rounded-full bg-cyan-300"
            style={{ bottom: `${t * 100}%` }}
          />
        </div>
        <span className="text-sm font-medium text-ink-100">{view.scale.toFixed(1)}×</span>
      </div>

      <button
        type="button"
        data-gesture-id="zoom-reset"
        onClick={onReset}
        className={`relative w-full cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium text-ink-100 transition ${
          resetHovered ? 'scale-105 border-white bg-ink-700' : 'border-ink-700 bg-ink-900/80'
        }`}
      >
        1×
        {resetHovered && <DwellBar progress={hover.progress} />}
      </button>
    </div>
  );
}