import { RAINBOW, RAINBOW_GRADIENT } from '@/lib/colors';
import { DwellBar } from './DwellBar';

// max-sm: = phone ki screen. @max-3xl: = chhota stage (overlay mode mein).
export function ColorPalette({ colors, value, hover, onChange }) {
  const all = [...colors, RAINBOW];

  return (
    <div className="flex flex-wrap gap-3 max-sm:gap-2 @max-3xl:gap-1.5" role="group" aria-label="Rang chunein">
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
            className={`relative h-11 w-11 cursor-pointer touch-manipulation rounded-full border-2 transition max-sm:h-9 max-sm:w-9 @max-3xl:h-7 @max-3xl:w-7 ${
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