// Gesture tabhi badlega jab naya gesture kuch der (milliseconds) tak lagatar dikhe.
// Pehle ye frames mein tha: kam fps wale phone par 3 frames = bohot der. Ab waqt se naapte hain.
//
// enterMs = kisi gesture mein jane ke liye waqt
// exitMs  = us gesture se nikalne ke liye waqt (har gesture ke liye alag)
// link    = jo gesture aapas mein jaldi badal sakte hain (jaise draw aur double): inke beech enterMs
// minFrames = kam az kam itne frames, taake ek akela galat frame gesture na badle
//
// Gesture ka naam "draw|1" ya "double|0,3" bhi ho sakta hai: '|' se pehle ka hissa gesture hai,
// baad ka hissa batata hai ke kaun si ungliyan seedhi hain.
export function createGestureStabilizer({ enterMs = 90, exitMs = {}, link = [], minFrames = 2 } = {}) {
  const base = (key) => key.split('|')[0];
  const linked = (a, b) => link.includes(base(a)) && link.includes(base(b));

  let stable = 'none';
  let candidate = 'none';
  let since = 0;
  let frames = 0;

  return {
    // next = abhi ka gesture, now = abhi ka waqt (milliseconds)
    update(next, now) {
      if (next === stable) {
        candidate = stable;
        frames = 0;
        return stable;
      }

      if (next === candidate) {
        frames += 1;
      } else {
        candidate = next;
        since = now;
        frames = 1;
      }

      const needed = linked(stable, candidate) ? enterMs : (exitMs[base(stable)] ?? enterMs);
      if (frames >= minFrames && now - since >= needed) {
        stable = candidate;
        frames = 0;
      }
      return stable;
    },

    reset(value = 'none') {
      stable = value;
      candidate = value;
      frames = 0;
    },
  };
}