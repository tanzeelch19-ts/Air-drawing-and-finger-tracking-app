// Button ke neeche wo line jo ungli rukne par dheere dheere bharti hai.
export function DwellBar({ progress }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-2 left-0 h-1 rounded-full bg-white transition-[width] duration-100"
      style={{ width: `${progress * 100}%` }}
    />
  );
}