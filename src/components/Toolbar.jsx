import { SYMMETRY_LABEL } from '@/lib/brush';
import { ColorPalette } from './ColorPalette';
import { DwellBar } from './DwellBar';

const MODE_LABEL = {
  none: 'Haath nahi mila',
  idle: 'Ruka hua',
  draw: 'Drawing…',
  double: 'Do lines',
  erase: 'Eraser',
  size: 'Brush size',
};

const MODE_STYLE = {
  none: 'bg-ink-800 text-ink-400',
  idle: 'bg-ink-800 text-ink-400',
  draw: 'bg-ok-900 text-ok-100',
  double: 'bg-emerald-900 text-emerald-100',
  erase: 'bg-rose-900 text-rose-100',
  size: 'bg-violet-900 text-violet-100',
};

const TONE = {
  default: 'border-ink-700 bg-ink-900/80',
  on: 'border-blue-400 bg-blue-900/70',
  rec: 'border-red-400 bg-red-900/80',
};

function ActionButton({ id, hover, tone = 'default', disabled, onClick, children }) {
  const hovered = hover.id === id;
  return (
    <button
      type="button"
      data-gesture-id={id}
      disabled={disabled}
      onClick={onClick}
      className={`relative cursor-pointer touch-manipulation rounded-lg border px-4 py-2.5 text-sm font-medium text-ink-100 transition disabled:cursor-not-allowed disabled:opacity-40 max-sm:px-3 max-sm:py-2 max-sm:text-xs @max-3xl:px-2.5 @max-3xl:py-1.5 @max-3xl:text-xs ${
        TONE[tone]
      } ${hovered ? 'scale-105 border-white' : ''}`}
    >
      {children}
      {hovered && <DwellBar progress={hover.progress} />}
    </button>
  );
}

// docked = true: phone ki chhoti screen mein stage ke neeche (touch se), warna stage ke upar (ungli se).
export function Toolbar({
  colors,
  color,
  symmetry,
  hover,
  mode,
  size,
  canUndo,
  canRedo,
  recording,
  canRecord,
  docked = false,
  onColorChange,
  onSymmetry,
  onUndo,
  onRedo,
  onClear,
  onSave,
  onRecord,
}) {
  return (
    <div
      className={`flex flex-col gap-3 bg-black/55 px-4 py-3 max-sm:gap-2 max-sm:px-3 max-sm:py-2 @max-3xl:gap-1.5 @max-3xl:px-2 @max-3xl:py-1.5 ${
        docked ? 'rounded-xl' : ''
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 max-sm:gap-2 @max-3xl:gap-1.5">
        <ColorPalette colors={colors} value={color} hover={hover} onChange={onColorChange} />
        <ActionButton
          id="symmetry"
          hover={hover}
          tone={symmetry === 'off' ? 'default' : 'on'}
          onClick={onSymmetry}
        >
          Symmetry: {SYMMETRY_LABEL[symmetry]}
        </ActionButton>
      </div>

      <div className="flex flex-wrap items-center gap-3 max-sm:gap-2 @max-3xl:gap-1.5">
        <ActionButton id="undo" hover={hover} disabled={!canUndo} onClick={onUndo}>
          Undo
        </ActionButton>
        <ActionButton id="redo" hover={hover} disabled={!canRedo} onClick={onRedo}>
          Redo
        </ActionButton>
        <ActionButton id="clear" hover={hover} onClick={onClear}>
          Clear
        </ActionButton>
        <ActionButton id="png" hover={hover} onClick={onSave}>
          Save PNG
        </ActionButton>
        <ActionButton
          id="record"
          hover={hover}
          tone={recording ? 'rec' : 'default'}
          disabled={!canRecord}
          onClick={onRecord}
        >
          {recording ? '● Stop' : 'Record'}
        </ActionButton>

        <div className="ml-auto flex items-center gap-2" role="status">
          <span
            className={`rounded-lg px-3 py-2 text-sm transition max-sm:px-2 max-sm:py-1.5 max-sm:text-xs @max-3xl:px-2 @max-3xl:py-1 @max-3xl:text-xs ${MODE_STYLE[mode]}`}
          >
            {MODE_LABEL[mode]}
          </span>
          <span className="rounded-lg bg-ink-800 px-3 py-2 text-sm text-ink-100 max-sm:px-2 max-sm:py-1.5 max-sm:text-xs @max-3xl:px-2 @max-3xl:py-1 @max-3xl:text-xs">
            Size {size}
          </span>
        </div>
      </div>
    </div>
  );
}