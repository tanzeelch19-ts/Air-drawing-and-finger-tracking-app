// MediaPipe hand landmark indexes
export const LANDMARK = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_PIP: 6,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_TIP: 12,
  RING_PIP: 14,
  RING_TIP: 16,
  PINKY_PIP: 18,
  PINKY_TIP: 20,
};

const ASPECT = 16 / 9; // landmarks 0 se 1 ke hain, is liye x ko aspect se barabar karte hain
export const PINCH_MAX = 0.5; // is se kam faasla = pinch (👌)

const dist = (a, b) => Math.hypot((a.x - b.x) * ASPECT, a.y - b.y);

// Image y neeche ki taraf barhta hai, is liye chhota y matlab ungli upar hai.
// Ye tabhi sahi chalta hai jab haath seedha (ungliyan upar ki taraf) ho.
const isUp = (hand, tip, pip) => hand[tip].y < hand[pip].y;

// Angootha aur index ke sire ka faasla, haath ki hatheli ki lambai se naapa hua.
// Is se haath camera ke qareeb ya door ho, naap barabar rehta hai.
export function pinchRatio(hand) {
  const palm = dist(hand[LANDMARK.WRIST], hand[LANDMARK.MIDDLE_MCP]) || 1;
  return dist(hand[LANDMARK.THUMB_TIP], hand[LANDMARK.INDEX_TIP]) / palm;
}

// 'draw' | 'select' | 'erase' | 'size' | 'idle'
export function getGesture(hand) {
  const index = isUp(hand, LANDMARK.INDEX_TIP, LANDMARK.INDEX_PIP);
  const middle = isUp(hand, LANDMARK.MIDDLE_TIP, LANDMARK.MIDDLE_PIP);
  const ring = isUp(hand, LANDMARK.RING_TIP, LANDMARK.RING_PIP);
  const pinky = isUp(hand, LANDMARK.PINKY_TIP, LANDMARK.PINKY_PIP);

  // Order zaroori hai: size pehle check hota hai.
  if (middle && ring && pinky && pinchRatio(hand) < PINCH_MAX) return 'size';
  if (index && middle && ring) return 'erase';
  if (index && middle && !ring && !pinky) return 'select';
  if (index && !middle && !ring && !pinky) return 'draw';
  return 'idle';
}

// Har gesture mein cursor ungli ke alag hisse par hota hai.
export function pointFor(hand, mode) {
  if (mode === 'erase') return hand[LANDMARK.MIDDLE_TIP];
  if (mode === 'size') {
    const a = hand[LANDMARK.THUMB_TIP];
    const b = hand[LANDMARK.INDEX_TIP];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
  return hand[LANDMARK.INDEX_TIP];
}