// Gesture tabhi badlega jab naya gesture lagatar kuch frames tak dikhe.
// enter = kisi gesture mein jane ke liye frames
// exit  = us gesture se nikalne ke liye frames (har gesture ke liye alag)
// link  = jo gesture aapas mein jaldi badal sakte hain (jaise draw aur double): inke beech enter frames
//
// Gesture ka naam "draw|1" ya "double|0,3" bhi ho sakta hai: '|' se pehle ka hissa gesture hai,
// baad ka hissa batata hai ke kaun si ungliyan seedhi hain.
export function createGestureStabilizer({ enter = 3, exit = {}, link = [] } = {}) {
  const base = (key) => key.split('|')[0];
  const linked = (a, b) => link.includes(base(a)) && link.includes(base(b));

  let stable = 'none';
  let candidate = 'none';
  let count = 0;

  return {
    update(next) {
      if (next === stable) {
        candidate = stable;
        count = 0;
        return stable;
      }

      if (next === candidate) count += 1;
      else {
        candidate = next;
        count = 1;
      }

      const needed = linked(stable, candidate) ? enter : (exit[base(stable)] ?? enter);
      if (count >= needed) {
        stable = candidate;
        count = 0;
      }
      return stable;
    },

    reset(value = 'none') {
      stable = value;
      candidate = value;
      count = 0;
    },
  };
}