import { DwellBar } from './DwellBar';

const BASE =
  'relative cursor-pointer touch-manipulation rounded-lg border px-3 py-2.5 text-left text-sm font-medium text-ink-100 transition max-sm:py-2 max-sm:text-xs @max-3xl:px-2 @max-3xl:py-1.5 @max-3xl:text-xs';

function Toggle({ id, label, on, hover, onClick }) {
  const hovered = hover.id === id;
  return (
    <button
      type="button"
      data-gesture-id={id}
      aria-pressed={on}
      onClick={onClick}
      className={`${BASE} ${
        on ? 'border-emerald-400 bg-emerald-900/70' : 'border-ink-700 bg-ink-900/80'
      } ${hovered ? 'scale-105 border-white' : ''}`}
    >
      {label}: {on ? 'On' : 'Off'}
      {hovered && <DwellBar progress={hover.progress} />}
    </button>
  );
}

// Har dabane par agli value (jaise Speed: Smooth, Balanced, Fast)
function Cycle({ id, label, value, hover, onClick }) {
  const hovered = hover.id === id;
  return (
    <button
      type="button"
      data-gesture-id={id}
      onClick={onClick}
      className={`${BASE} border-ink-700 bg-ink-900/80 ${hovered ? 'scale-105 border-white' : ''}`}
    >
      {label}: {value}
      {hovered && <DwellBar progress={hover.progress} />}
    </button>
  );
}

// Toggles aur speed. docked = true: tray ki sheet ke andar, warna stage ke baayein taraf (ungli se).
export function ModePanel({
  skeleton,
  ink,
  shapes,
  speed,
  hover,
  docked = false,
  onSkeleton,
  onInk,
  onShapes,
  onSpeed,
}) {
  return (
    <div
      data-ui
      className={
        docked
          ? 'flex flex-wrap gap-2 rounded-xl bg-black/55 p-2'
          : 'absolute bottom-20 left-3 z-10 flex flex-col gap-3 rounded-xl bg-black/55 p-2 @max-3xl:bottom-14 @max-3xl:left-2 @max-3xl:gap-2 @max-3xl:p-1.5'
      }
    >
      <Toggle id="toggle:skeleton" label="Skeleton" on={skeleton} hover={hover} onClick={onSkeleton} />
      <Toggle id="toggle:ink" label="Rang" on={ink} hover={hover} onClick={onInk} />
      <Toggle id="toggle:shapes" label="Shapes" on={shapes} hover={hover} onClick={onShapes} />
      <Cycle id="cycle:speed" label="Speed" value={speed} hover={hover} onClick={onSpeed} />
    </div>
  );
}