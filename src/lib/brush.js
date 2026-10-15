import { PINCH_MAX } from './hand';

export const MIN_SIZE = 3;
export const MAX_SIZE = 48;
export const DEFAULT_SIZE = 8;

export const SYMMETRIES = ['off', 'mirror', 'mandala'];
export const SYMMETRY_LABEL = { off: 'Off', mirror: 'Mirror', mandala: 'Mandala' };

const PINCH_MIN = 0.08; // ungliyan bilkul mili hui

// Pinch ka faasla (PINCH_MIN se PINCH_MAX) ko brush size mein badalta hai.
export function sizeFromPinch(ratio) {
  const t = Math.min(Math.max((ratio - PINCH_MIN) / (PINCH_MAX - PINCH_MIN), 0), 1);
  return MIN_SIZE + t * (MAX_SIZE - MIN_SIZE);
}

// Eraser hamesha brush se bada hota hai.
export const eraserSize = (brushSize) => Math.max(40, brushSize * 3);