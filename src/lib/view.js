import { WIDTH, HEIGHT } from './strokes';

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

// view = { scale, x, y }: drawing ke point w ka screen par point = w * scale + (x, y)

// Zoom ke baad drawing screen se bahar na nikal jaye.
export function clampView({ scale, x, y }) {
  const s = Math.min(Math.max(scale, MIN_ZOOM), MAX_ZOOM);
  return {
    scale: s,
    x: Math.min(0, Math.max(WIDTH - WIDTH * s, x)),
    y: Math.min(0, Math.max(HEIGHT - HEIGHT * s, y)),
  };
}

// Screen ke point (fx, fy) ke neeche wala hissa wahin rakhte hue zoom karta hai.
export function zoomAbout(view, nextScale, fx = WIDTH / 2, fy = HEIGHT / 2) {
  const s = Math.min(Math.max(nextScale, MIN_ZOOM), MAX_ZOOM);
  const ratio = s / view.scale;
  return clampView({
    scale: s,
    x: fx - (fx - view.x) * ratio,
    y: fy - (fy - view.y) * ratio,
  });
}

// Drawing ke point (wx, wy) ko screen ke beech mein laata hai.
export function panTo(view, wx, wy) {
  return clampView({
    scale: view.scale,
    x: WIDTH / 2 - wx * view.scale,
    y: HEIGHT / 2 - wy * view.scale,
  });
}

// Screen ke point (sx, sy) ka drawing mein point.
export const screenToWorld = (view, sx, sy) => ({
  x: (sx - view.x) / view.scale,
  y: (sy - view.y) / view.scale,
});