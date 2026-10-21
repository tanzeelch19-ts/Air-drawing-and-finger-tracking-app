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
  default: 'border-ink-700 bg-ink-900/90',
  on: 'border-blue-400 bg-blue-900/80',
  rec: 'border-red-400 bg-red-900/80',
};

function TrayButton({ id, hover, tone = 'default', disabled, onClick, children }) {
  const hovered = hover.id === id;
  return (
    <button
      type="button"
      data-gesture-id={id}
      disabled={disabled}
      onClick={onClick}
      className={`relative min-h-10 cursor-pointer touch-manipulation rounded-xl border px-3.5 text-sm font-medium text-ink-100 transition disabled:cursor-not-allowed disabled:opacity-40 max-sm:px-2.5 max-sm:text-xs ${
        TONE[tone]
      } ${hovered ? 'scale-105 border-white' : ''}`}
    >
      {children}
      {hovered && <DwellBar progress={hover.progress} />}
    </button>
  );
}

// Chhoti screen (phone) ke liye: neeche ek patti (hamesha dikhti hai) aur uske upar ek sheet (Tools dabane par).
// children = sheet ke andar ka sab kuch (rang, toggles, zoom, filters...)
// maxHeight = sheet kitni ooncha ho sakti hai (pixels). Phone par ye camera ke neeche ki bachi jagah hai.
export function MobileTray({
  open,
  maxHeight,
  mode,
  hover,
  canUndo,
  canRedo,
  recording,
  canRecord,
  onToggle,
  onUndo,
  onRedo,
  onRecord,
  onLayout,
  children,
}) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-10 flex flex-col"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {open && (
        // data-clip: ye sheet scroll ho sakti hai, is liye jo buttons nazar na aayein unhein ungli se nahi dabate.
        <div
          data-ui
          data-clip
          onScroll={onLayout}
          style={{ maxHeight: maxHeight ?? '62svh' }}
          className="mx-2 mb-2 flex flex-col gap-3 overflow-y-auto overscroll-contain rounded-2xl bg-black/80 p-2"
        >
          {children}
        </div>
      )}

      <div data-ui className="flex items-center gap-2 bg-black/70 px-3 py-2.5 max-sm:px-2">
        <span role="status" className={`rounded-lg px-2.5 py-1.5 text-xs ${MODE_STYLE[mode]}`}>
          {MODE_LABEL[mode]}
        </span>

        <div className="ml-auto flex gap-2 max-sm:gap-1.5">
          <TrayButton id="tray:undo" hover={hover} disabled={!canUndo} onClick={onUndo}>
            Undo
          </TrayButton>
          <TrayButton id="tray:redo" hover={hover} disabled={!canRedo} onClick={onRedo}>
            Redo
          </TrayButton>
          <TrayButton
            id="tray:rec"
            hover={hover}
            tone={recording ? 'rec' : 'default'}
            disabled={!canRecord}
            onClick={onRecord}
          >
            {recording ? '● Stop' : 'Rec'}
          </TrayButton>
          <TrayButton id="tray:tools" hover={hover} tone={open ? 'on' : 'default'} onClick={onToggle}>
            {open ? 'Band ▾' : 'Tools ▴'}
          </TrayButton>
        </div>
      </div>
    </div>
  );
}