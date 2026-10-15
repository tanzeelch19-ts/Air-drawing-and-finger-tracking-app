// Camera video ke filters. Ye sirf video par lagte hain, lines ke rang par nahi.
export const DIM = 'brightness(0.55)'; // dark look, taake lines chamkein

export const FILTERS = [
  { id: 'normal', label: 'Normal', css: 'none' },
  { id: 'vintage', label: 'Old Film', css: 'sepia(0.85) contrast(1.1) saturate(0.8)' },
  { id: 'bw', label: 'B&W', css: 'grayscale(1) contrast(1.2)' },
  { id: 'warm', label: 'Warm', css: 'sepia(0.35) saturate(1.5) hue-rotate(-10deg)' },
  { id: 'cool', label: 'Cool', css: 'saturate(1.3) hue-rotate(170deg)' },
  { id: 'neon', label: 'Neon', css: 'contrast(1.35) saturate(2.2) hue-rotate(280deg)' },
  { id: 'xray', label: 'X-Ray', css: 'grayscale(1) invert(1) contrast(1.3)' },
];

// Video element aur recording dono yahi string use karte hain, is liye dono barabar dikhte hain.
export function videoFilter(id) {
  const css = FILTERS.find((f) => f.id === id)?.css ?? 'none';
  return css === 'none' ? DIM : `${css} ${DIM}`;
}