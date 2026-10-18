import { RAINBOW } from './colors';

// Drawing ka naap. Ye camera ke aspect ke hisaab se badalta hai:
// landscape = 1280x720, portrait (phone) = 720x1280.
// "export let" ki wajah se dusri files mein bhi naya naap apne aap dikhta hai.
export let WIDTH = 1280;
export let HEIGHT = 720;

const LONG_SIDE = 1280;

export function setCanvasSize(width, height) {
  WIDTH = width;
  HEIGHT = height;
}

// Camera ke aspect (chaurai / ooncha'i) se drawing ka naap nikalta hai. Lambi side hamesha 1280.
export function sizeForAspect(aspect) {
  const a = Math.min(Math.max(aspect, 0.4), 2.5);
  return a >= 1
    ? { width: LONG_SIDE, height: Math.round(LONG_SIDE / a) }
    : { width: Math.round(LONG_SIDE * a), height: LONG_SIDE };
}

// Zoom nahi: scale 1, koi khiskaav nahi.
export const IDENTITY_VIEW = { scale: 1, x: 0, y: 0 };

const TAU = Math.PI * 2;

// Har stroke ki kitni copies banengi (rotate ya flip ke saath).
const SYMMETRY_TRANSFORMS = {
  off: [{ angle: 0, flip: false }],
  mirror: [
    { angle: 0, flip: false },
    { angle: 0, flip: true },
  ],
  // 6 rotations x (seedha + ulta) = 12 hisse
  mandala: Array.from({ length: 12 }, (_, i) => ({
    angle: (Math.floor(i / 2) * TAU) / 6,
    flip: i % 2 === 1,
  })),
};

const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

// Line ko tukdon (pieces) mein baantte hain.
// Aam line: har tukda gol (curve) hota hai.
// sharp line (shapes): seedhe tukde, taake kone tez rahein.
function buildPieces(points, fromK, withTail, sharp = false) {
  const n = points.length - 1;
  const pieces = [];

  if (sharp) {
    for (let k = Math.max(fromK, 1); k <= n; k++) {
      pieces.push({ index: k, from: points[k - 1], ctrl: null, to: points[k] });
    }
    return pieces;
  }

  for (let k = Math.max(fromK, 1); k <= n; k++) {
    pieces.push(
      k === 1
        ? { index: 1, from: points[0], ctrl: null, to: mid(points[0], points[1]) }
        : {
            index: k,
            from: mid(points[k - 2], points[k - 1]),
            ctrl: points[k - 1],
            to: mid(points[k - 1], points[k]),
          },
    );
  }

  // Aakhri adha tukda: aakhri midpoint se aakhri point tak.
  if (withTail && n >= 1) {
    pieces.push({ index: n + 1, from: mid(points[n - 1], points[n]), ctrl: null, to: points[n] });
  }
  return pieces;
}

function trace(ctx, piece, moveFirst) {
  if (moveFirst) ctx.moveTo(piece.from.x, piece.from.y);
  if (piece.ctrl) ctx.quadraticCurveTo(piece.ctrl.x, piece.ctrl.y, piece.to.x, piece.to.y);
  else ctx.lineTo(piece.to.x, piece.to.y);
}

function paintPieces(ctx, stroke, pieces) {
  if (!pieces.length) return;
  const rainbow = stroke.color === RAINBOW;

  // Symmetry ka markaz drawing ke beech mein hai (naap badalne par ye bhi badalta hai).
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = stroke.size;
  ctx.globalCompositeOperation = stroke.kind === 'eraser' ? 'destination-out' : 'source-over';

  for (const { angle, flip } of SYMMETRY_TRANSFORMS[stroke.sym] ?? SYMMETRY_TRANSFORMS.off) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    if (flip) ctx.scale(-1, 1);
    ctx.translate(-cx, -cy);

    if (rainbow) {
      // Har tukde ka apna rang: tukde ke number se hue nikalta hai.
      for (const piece of pieces) {
        ctx.strokeStyle = `hsl(${(stroke.hue + piece.index * 3) % 360}, 100%, 60%)`;
        ctx.beginPath();
        trace(ctx, piece, true);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = stroke.color;
      ctx.beginPath();
      pieces.forEach((piece, i) => trace(ctx, piece, i === 0));
      ctx.stroke();
    }

    ctx.restore();
  }

  ctx.restore();
}

// stroke = { kind: 'pen' | 'eraser' | 'clear', color, size, sym, hue, sharp, points: [{x, y}] }
// Ye saare functions maan kar chalte hain ke ctx par zoom (view) pehle se laga hua hai.

// Poori stroke (replay ke liye: undo, redo, clear, zoom ke baad)
export function drawStroke(ctx, stroke) {
  if (stroke.kind === 'clear' || stroke.points.length < 2) return;
  paintPieces(ctx, stroke, buildPieces(stroke.points, 1, true, stroke.sharp));
}

// Live drawing: sirf sab se naya tukda
export function drawPiece(ctx, stroke) {
  const n = stroke.points.length - 1;
  if (n < 1) return;
  paintPieces(ctx, stroke, buildPieces(stroke.points, n, false));
}

// Live drawing: stroke khatam hone par aakhri adha tukda
export function drawTail(ctx, stroke) {
  const n = stroke.points.length - 1;
  if (n < 1) return;
  paintPieces(ctx, stroke, buildPieces(stroke.points, n + 1, true));
}

// Poori list se canvas dobara banata hai, di gayi zoom (view) ke saath.
export function renderAll(ctx, strokes, view = IDENTITY_VIEW) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);

  // Aakhri "clear" se pehle ki strokes dikhni nahi chahiye.
  let start = 0;
  for (let i = strokes.length - 1; i >= 0; i--) {
    if (strokes[i].kind === 'clear') {
      start = i + 1;
      break;
    }
  }
  for (let i = start; i < strokes.length; i++) drawStroke(ctx, strokes[i]);

  ctx.restore();
}