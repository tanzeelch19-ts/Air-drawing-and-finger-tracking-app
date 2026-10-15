import { RAINBOW, RAINBOW_GRADIENT } from '@/lib/colors';
import { DwellBar } from './DwellBar';

export function ColorPalette({ colors, value, hover, onChange }) {
  const all = [...colors, RAINBOW];

  return (
    <div className="flex gap-3" role="group" aria-label="Rang chunein">
      {all.map((color) => {
        const id = `color:${color}`;
        const selected = color === value;
        const hovered = hover.id === id;

        return (
          <button
            key={color}
            type="button"
            data-gesture-id={id}
            aria-label={`Rang ${color}`}
            aria-pressed={selected}
            onClick={() => onChange(color)}
            style={{ background: color === RAINBOW ? RAINBOW_GRADIENT : color }}
            className={`relative h-11 w-11 cursor-pointer rounded-full border-2 transition ${
              selected
                ? 'border-white ring-2 ring-white ring-offset-2 ring-offset-black'
                : 'border-transparent'
            } ${hovered ? 'scale-110' : ''}`}
          >
            {hovered && <DwellBar progress={hover.progress} />}
          </button>
        );
      })}
    </div>
  );
}