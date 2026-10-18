import { WIDTH, HEIGHT } from '@/lib/strokes';

// Symmetry on ho to screen par halki dotted lines dikhti hain.
export function SymmetryGuides({ mode, view }) {
  if (mode === 'off') return null;

  // Drawing ka beech screen par kahan hai (video mirror hai, is liye x ulta).
  const cx = WIDTH - (view.scale * (WIDTH / 2) + view.x);
  const cy = view.scale * (HEIGHT / 2) + view.y;
  const angles = mode === 'mirror' ? [90] : [0, 30, 60, 90, 120, 150];
  const reach = Math.max(WIDTH, HEIGHT) * 2;

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {angles.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const dx = Math.cos(rad) * reach;
        const dy = Math.sin(rad) * reach;
        return (
          <line
            key={deg}
            x1={cx - dx}
            y1={cy - dy}
            x2={cx + dx}
            y2={cy + dy}
            stroke="white"
            strokeOpacity="0.18"
            strokeWidth="2"
            strokeDasharray="10 12"
          />
        );
      })}
    </svg>
  );
}