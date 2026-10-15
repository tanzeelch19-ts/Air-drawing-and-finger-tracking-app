import { DwellBar } from './DwellBar';

function Toggle({ id, label, on, hover, onClick }) {
  const hovered = hover.id === id;
  return (
    <button
      type="button"
      data-gesture-id={id}
      aria-pressed={on}
      onClick={onClick}
      className={`relative cursor-pointer rounded-lg border px-3 py-2.5 text-left text-sm font-medium text-ink-100 transition ${
        on ? 'border-emerald-400 bg-emerald-900/70' : 'border-ink-700 bg-ink-900/80'
      } ${hovered ? 'scale-105 border-white' : ''}`}
    >
      {label}: {on ? 'On' : 'Off'}
      {hovered && <DwellBar progress={hover.progress} />}
    </button>
  );
}

// Baayein taraf ke toggles: ungli 0.7 second rakhein to on ya off.
export function ModePanel({ skeleton, ink, shapes, hover, onSkeleton, onInk, onShapes }) {
  return (
    <div
      data-ui
      className="absolute bottom-20 left-3 z-10 flex flex-col gap-3 rounded-xl bg-black/55 p-2 backdrop-blur-sm"
    >
      <Toggle id="toggle:skeleton" label="Skeleton" on={skeleton} hover={hover} onClick={onSkeleton} />
      <Toggle id="toggle:ink" label="Rang" on={ink} hover={hover} onClick={onInk} />
      <Toggle id="toggle:shapes" label="Shapes" on={shapes} hover={hover} onClick={onShapes} />
    </div>
  );
}