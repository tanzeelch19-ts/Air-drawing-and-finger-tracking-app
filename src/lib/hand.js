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

// Chaar ungliyan: 0 = index, 1 = middle, 2 = ring, 3 = pinky
const FINGERS = [
  { tip: LANDMARK.INDEX_TIP, pip: LANDMARK.INDEX_PIP },
  { tip: LANDMARK.MIDDLE_TIP, pip: LANDMARK.MIDDLE_PIP },
  { tip: LANDMARK.RING_TIP, pip: LANDMARK.RING_PIP },
  { tip: LANDMARK.PINKY_TIP, pip: LANDMARK.PINKY_PIP },
];
const TIPS = FINGERS.map((f) => f.tip);

const ASPECT = 16 / 9; // landmarks 0 se 1 ke hain, is liye x ko aspect se barabar karte hain
export const PINCH_MAX = 0.5; // is se kam faasla = pinch (👌)

// Ungli seedhi hai ya mudi: sira kalai se pip ke muqable mein kitna door hai.
// Do hadein hain taake beech ki halat mein ungli ek se doosre haal mein jhoolti na rahe.
const UP_ON = 1.15; // is se zyada: seedhi
const UP_OFF = 1.05; // is se kam: mudi

const dist = (a, b) => Math.hypot((a.x - b.x) * ASPECT, a.y - b.y);

// Angootha aur index ke sire ka faasla, haath ki hatheli ki lambai se naapa hua.
export function pinchRatio(hand) {
  const palm = dist(hand[LANDMARK.WRIST], hand[LANDMARK.MIDDLE_MCP]) || 1;
  return dist(hand[LANDMARK.THUMB_TIP], hand[LANDMARK.INDEX_TIP]) / palm;
}

// Haath ko padhta hai aur batata hai:
//   gesture: 'draw' | 'double' | 'erase' | 'size' | 'idle'
//   fingers: kaun si ungliyan seedhi hain (jaise [1] ya [0, 3])
// Ye har ungli ka pichla haal yaad rakhta hai, is liye isay ek baar bana kar baar baar istemal karein.
export function createHandReader() {
  let up = [false, false, false, false];

  return {
    reset() {
      up = [false, false, false, false];
    },

    read(hand) {
      const wrist = hand[LANDMARK.WRIST];

      up = FINGERS.map(({ tip, pip }, i) => {
        const ratio = dist(wrist, hand[tip]) / (dist(wrist, hand[pip]) || 1);
        if (ratio > UP_ON) return true;
        if (ratio < UP_OFF) return false;
        return up[i]; // beech mein: pichla haal
      });

      const fingers = up.flatMap((isUp, i) => (isUp ? [i] : []));

      let gesture = 'idle'; // koi nahi ya teen ungliyan
      if (up[1] && up[2] && up[3] && pinchRatio(hand) < PINCH_MAX) gesture = 'size';
      else if (fingers.length === 4) gesture = 'erase'; // khuli hatheli
      else if (fingers.length === 2) gesture = 'double'; // koi bhi do ungliyan: do lines
      else if (fingers.length === 1) gesture = 'draw'; // koi bhi ek ungli: ek line

      return { gesture, fingers };
    },
  };
}

// Har gesture mein kitne cursors hote hain aur kahan.
// 'draw' mein seedhi ungli ka sira, 'double' mein dono seedhi ungliyon ke sire.
export function pointsFor(hand, mode, fingers = [0]) {
  switch (mode) {
    case 'double':
      return fingers.map((f) => hand[TIPS[f]]);
    case 'draw':
      return [hand[TIPS[fingers[0] ?? 0]]];
    case 'erase':
      return [hand[LANDMARK.MIDDLE_TIP]];
    case 'size': {
      const a = hand[LANDMARK.THUMB_TIP];
      const b = hand[LANDMARK.INDEX_TIP];
      return [{ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }];
    }
    default:
      return [hand[LANDMARK.INDEX_TIP]];
  }
}