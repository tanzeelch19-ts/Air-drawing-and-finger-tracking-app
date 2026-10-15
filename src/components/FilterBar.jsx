import { DwellBar } from './DwellBar';

// Neeche ki patti: do ungliyan upar karke filter par 0.7 second rukein.
export function FilterBar({ filters, value, hover, onChange }) {
  return (
    <div
      data-ui
      role="group"
      aria-label="Camera filter"
      className="absolute inset-x-0 bottom-0 z-10 flex flex-wrap justify-center gap-2 bg-black/55 px-3 py-3 backdrop-blur-sm"
    >
      {filters.map((filter) => {
        const id = `filter:${filter.id}`;
        const selected = filter.id === value;
        const hovered = hover.id === id;

        return (
          <button
            key={filter.id}
            type="button"
            data-gesture-id={id}
            aria-pressed={selected}
            onClick={() => onChange(filter.id)}
            className={`relative cursor-pointer rounded-lg border px-4 py-2.5 text-sm font-medium text-ink-100 transition ${
              selected ? 'border-white bg-ink-700' : 'border-ink-700 bg-ink-900/80'
            } ${hovered ? 'scale-105 border-white' : ''}`}
          >
            {filter.label}
            {hovered && <DwellBar progress={hover.progress} />}
          </button>
        );
      })}
    </div>
  );
}