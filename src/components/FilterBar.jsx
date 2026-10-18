import { DwellBar } from './DwellBar';

// Camera filters. docked = true: stage ke neeche (touch se), warna stage ke neeche ki patti (ungli se).
export function FilterBar({ filters, value, hover, onChange, docked = false }) {
  return (
    <div
      data-ui
      role="group"
      aria-label="Camera filter"
      className={
        docked
          ? 'flex flex-wrap gap-2 rounded-xl bg-black/55 p-2'
          : 'absolute inset-x-0 bottom-0 z-10 flex flex-wrap justify-center gap-2 bg-black/55 px-3 py-3 @max-3xl:gap-1 @max-3xl:px-2 @max-3xl:py-2'
      }
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
            className={`relative cursor-pointer touch-manipulation rounded-lg border px-4 py-2.5 text-sm font-medium text-ink-100 transition max-sm:px-3 max-sm:py-2 max-sm:text-xs @max-3xl:px-2 @max-3xl:py-1.5 @max-3xl:text-xs ${
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