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
function Cycle({ id, label, value, active = false, hover, onClick }) {
  const hovered = hover.id === id;
  return (
    <button
      type="button"
      data-gesture-id={id}
      onClick={onClick}
      className={`${BASE} ${
        active ? 'border-emerald-400 bg-emerald-900/70' : 'border-ink-700 bg-ink-900/80'
      } ${hovered ? 'scale-105 border-white' : ''}`}
    >
      {label}: {value}
      {hovered && <DwellBar progress={hover.progress} />}
    </button>
  );
}

// Toggles aur speed. docked = true: tray ki sheet ke andar, warna stage ke baayein taraf (ungli se).
// shapes = 'Off', 'Auto' ya 'Hold'. fill = band shapes bhari hon ya nahi.
export function ModePanel({
  skeleton,
  ink,
  shapes,
  fill,
  speed,
  hover,
  docked = false,
  onSkeleton,
  onInk,
  onShapes,
  onFill,
  onSpeed,
}) {
  return (
    <div
      data-ui
      className={
        docked
          ? 'flex flex-wrap gap-2 rounded-xl bg-black/55 p-2'
          : 'absolute bottom-20 left-3 z-10 flex flex-col gap-2 rounded-xl bg-black/55 p-2 @max-3xl:bottom-14 @max-3xl:left-2 @max-3xl:gap-1.5 @max-3xl:p-1.5'
      }
    >
      <Toggle id="toggle:skeleton" label="Skeleton" on={skeleton} hover={hover} onClick={onSkeleton} />
      <Toggle id="toggle:ink" label="Rang" on={ink} hover={hover} onClick={onInk} />
      <Cycle
        id="cycle:shapes"
        label="Shapes"
        value={shapes}
        active={shapes !== 'Off'}
        hover={hover}
        onClick={onShapes}
      />
      <Toggle id="toggle:fill" label="Fill" on={fill} hover={hover} onClick={onFill} />
      <Cycle id="cycle:speed" label="Speed" value={speed} hover={hover} onClick={onSpeed} />
    </div>
  );
}