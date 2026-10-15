import { useCallback, useReducer, useRef } from 'react';

let nextGroup = 1;

// Strokes ki list hi asal data hai. Undo = aakhri group hatao, Redo = wapas lao.
// slot 0 = pehli ungli, slot 1 = doosri ungli (do lines ke liye).
export function useStrokes() {
  const data = useRef({ strokes: [], undone: [], active: [] });
  const [, bump] = useReducer((n) => n + 1, 0);

  const begin = useCallback((slot, meta, point) => {
    const d = data.current;
    d.active[slot] = { ...meta, points: [point] };
    return d.active[slot];
  }, []);

  const extend = useCallback((slot, point) => {
    data.current.active[slot]?.points.push(point);
  }, []);

  const active = useCallback((slot) => data.current.active[slot] ?? null, []);

  // Abhi chal rahi saari strokes
  const actives = useCallback(() => data.current.active.filter(Boolean), []);

  // Saari chalti strokes khatam: jin mein kam az kam 2 points hon wo ek group ban kar list mein jati hain.
  const end = useCallback(() => {
    const d = data.current;
    const done = d.active.filter((s) => s && s.points.length > 1);
    d.active = [];
    if (!done.length) return;

    const group = nextGroup++;
    done.forEach((stroke) => {
      stroke.group = group;
      d.strokes.push(stroke);
    });
    d.undone = [];
    bump();
  }, []);

  // Aakhri group ki saari strokes ek saath hatti hain.
  const undo = useCallback(() => {
    const d = data.current;
    const last = d.strokes[d.strokes.length - 1];
    if (!last) return false;

    const removed = [];
    while (d.strokes.length && d.strokes[d.strokes.length - 1].group === last.group) {
      removed.unshift(d.strokes.pop());
    }
    d.undone.push(removed);
    bump();
    return true;
  }, []);

  const redo = useCallback(() => {
    const d = data.current;
    const group = d.undone.pop();
    if (!group) return false;
    d.strokes.push(...group);
    bump();
    return true;
  }, []);

  // Clear bhi ek stroke hai, is liye undo ho sakta hai.
  const clear = useCallback(() => {
    const d = data.current;
    const last = d.strokes[d.strokes.length - 1];
    if (!last || last.kind === 'clear') return false;
    d.strokes.push({ kind: 'clear', points: [], group: nextGroup++ });
    d.undone = [];
    bump();
    return true;
  }, []);

  const getStrokes = useCallback(() => data.current.strokes, []);

  return {
    begin,
    extend,
    active,
    actives,
    end,
    undo,
    redo,
    clear,
    getStrokes,
    canUndo: data.current.strokes.length > 0,
    canRedo: data.current.undone.length > 0,
  };
}