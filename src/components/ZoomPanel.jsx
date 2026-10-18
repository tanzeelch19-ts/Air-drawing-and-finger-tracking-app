import { MAX_ZOOM } from '@/lib/view';
import { WIDTH, HEIGHT } from '@/lib/strokes';
import { DwellBar } from './DwellBar';

// Zoom slider aur minimap.
// Ungli se: data-slider wale hisson par ungli phirane se (AirCanvas sambhalta hai).
// Touch ya mouse se: neeche ke pointer events.
export function ZoomPanel({ view, hover, docked = false, onReset, onSlide }) {
  const t = Math.log(view.scale) / Math.log(MAX_ZOOM); // 0 se 1
  const resetHovered = hover.id === 'zoom-reset';
  const portrait = HEIGHT > WIDTH;

  // Minimap mein dikhne wala hissa (screen jaisa, is liye x ulta)
  const x0 = -view.x / view.scale;
  const x1 = x0 + WIDTH / view.scale;
  const y0 = -view.y / view.scale;

  const slide = (kind) => {
    const report = (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      onSlide(kind, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    };
    return {
      onPointerDown: (e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        report(e);
      },
      onPointerMove: (e) => {
        if (e.buttons) report(e);
      },
    };
  };

  return (
    <div
      data-ui
      className={
        docked
          ? 'flex items-center gap-3 rounded-xl bg-black/55 p-2'
          : 'absolute bottom-20 right-3 z-10 flex w-28 flex-col items-center gap-2 rounded-xl bg-black/55 p-2 @max-3xl:bottom-14 @max-3xl:right-2 @max-3xl:w-24 @max-3xl:gap-1.5 @max-3xl:p-1.5'
      }
    >
      {/* Minimap: drawing ke aspect jaisa (portrait mein tall, landscape mein wide) */}
      <div
        data-slider="pan"
        aria-label="Drawing ka hissa chunein"
        {...slide('pan')}
        style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
        className={`relative touch-none overflow-hidden rounded border border-ink-700 bg-ink-900/80 ${
          portrait ? 'h-24 @max-3xl:h-16' : 'w-24 @max-3xl:w-[71px]'
        }`}
      >
        <div
          className="pointer-events-none absolute rounded-sm border border-cyan-300 bg-cyan-300/20"
          style={{
            left: `${(1 - x1 / WIDTH) * 100}%`,
            top: `${(y0 / HEIGHT) * 100}%`,
            width: `${100 / view.scale}%`,
            height: `${100 / view.scale}%`,
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <div
          data-slider="zoom"
          aria-label="Zoom"
          {...slide('zoom')}
          className="relative h-24 w-9 touch-none rounded-full border border-ink-700 bg-ink-900/80 @max-3xl:h-16 @max-3xl:w-7"
        >
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 rounded-full bg-cyan-400/30"
            style={{ height: `${t * 100}%` }}
          />
          <div
            className="pointer-events-none absolute left-1/2 h-4 w-4 -translate-x-1/2 translate-y-1/2 rounded-full bg-cyan-300"
            style={{ bottom: `${t * 100}%` }}
          />
        </div>
        <span className="text-sm font-medium text-ink-100 max-sm:text-xs">{view.scale.toFixed(1)}×</span>
      </div>

      <button
        type="button"
        data-gesture-id="zoom-reset"
        onClick={onReset}
        className={`relative cursor-pointer touch-manipulation rounded-lg border px-3 py-2 text-sm font-medium text-ink-100 transition max-sm:text-xs @max-3xl:py-1 ${
          docked ? '' : 'w-full'
        } ${resetHovered ? 'scale-105 border-white bg-ink-700' : 'border-ink-700 bg-ink-900/80'}`}
      >
        1×
        {resetHovered && <DwellBar progress={hover.progress} />}
      </button>
    </div>
  );
}