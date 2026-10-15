// Haath se bani line ko perfect shape mein badalta hai.
// recognizeShape(points, scale) -> { type, points, sharp } ya null (kuch pehchana nahi)

const MIN_LEN = 80; // is se chhoti line ko nahi chhedte (screen px mein)
const MIN_DIM = 40; // shape ki chaurai aur ooncha'i kam az kam itni
const LINE_DEV = 0.06; // seedhi line: beech ka bhatkna chord ke 6% se kam
const ELLIPSE_TOL = 0.1; // gola: radius ka farq 10% se kam
const CLOSE_GAP = 0.2; // band shape: shuru aur aakhir ka faasla path ke 20% se kam
const POLY_EPS = 0.02; // kone dhoondne ki sakhti (path ka 2%)
const SNAP_ANGLE = 6; // seedhi line ko horizontal ya vertical par kheenchne ka angle (degrees)

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const avg = (list) => list.reduce((sum, v) => sum + v, 0) / list.length;

function pathLength(pts) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += dist(pts[i - 1], pts[i]);
  return total;
}

// Line ko n barabar faasle ke points mein badalta hai.
function resample(points, n) {
  const pts = points.slice();
  const step = pathLength(pts) / (n - 1);
  const out = [pts[0]];
  let acc = 0;

  for (let i = 1; i < pts.length; i++) {
    const d = dist(pts[i - 1], pts[i]);
    if (d > 0 && acc + d >= step) {
      const t = (step - acc) / d;
      const q = {
        x: pts[i - 1].x + t * (pts[i].x - pts[i - 1].x),
        y: pts[i - 1].y + t * (pts[i].y - pts[i - 1].y),
      };
      out.push(q);
      pts.splice(i, 0, q); // naya point daal do, agli iteration usi se shuru hogi
      acc = 0;
    } else {
      acc += d;
    }
  }

  while (out.length < n) out.push(pts[pts.length - 1]);
  return out.slice(0, n);
}

// Point p ka segment a-b se faasla
function segDist(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

function bounds(pts) {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  return { w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

// Douglas-Peucker: line mein se sirf zaroori kone rakhta hai.
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const a = pts[0];
  const b = pts[pts.length - 1];

  let maxD = 0;
  let idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = segDist(pts[i], a, b);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD <= eps) return [a, b];

  return rdp(pts.slice(0, idx + 1), eps)
    .slice(0, -1)
    .concat(rdp(pts.slice(idx), eps));
}

// b par line kitni mudti hai (degrees): 0 = bilkul seedha
function turnAngle(a, b, c) {
  const a1 = Math.atan2(b.y - a.y, b.x - a.x);
  const a2 = Math.atan2(c.y - b.y, c.x - b.x);
  let d = Math.abs(a2 - a1);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return (d * 180) / Math.PI;
}

// ---------- seedhi line ----------
function snapLine(a, b) {
  const p = { ...a };
  const q = { ...b };
  const abs = Math.abs((Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI);

  if (abs < SNAP_ANGLE || abs > 180 - SNAP_ANGLE) {
    const y = (p.y + q.y) / 2; // bilkul horizontal
    p.y = y;
    q.y = y;
  } else if (Math.abs(abs - 90) < SNAP_ANGLE) {
    const x = (p.x + q.x) / 2; // bilkul vertical
    p.x = x;
    q.x = x;
  }
  return { type: 'line', points: [p, q], sharp: true };
}

// ---------- gola ya ellipse ----------
function detectEllipse(pts, box) {
  const rx = box.w / 2;
  const ry = box.h / 2;
  const radii = pts.map((p) => Math.hypot((p.x - box.cx) / rx, (p.y - box.cy) / ry));
  const mean = avg(radii);
  const spread = Math.sqrt(avg(radii.map((r) => (r - mean) ** 2)));
  if (spread / mean > ELLIPSE_TOL) return null;

  const circle = Math.abs(rx - ry) / Math.max(rx, ry) < 0.18;
  const r = (rx + ry) / 2;
  const radiusX = circle ? r : rx;
  const radiusY = circle ? r : ry;

  const count = Math.max(48, Math.min(240, Math.round((TWO_PI * Math.max(radiusX, radiusY)) / 6)));
  const out = [];
  for (let i = 0; i <= count; i++) {
    const angle = (i / count) * TWO_PI;
    out.push({ x: box.cx + radiusX * Math.cos(angle), y: box.cy + radiusY * Math.sin(angle) });
  }
  return { type: circle ? 'circle' : 'ellipse', points: out, sharp: false };
}
const TWO_PI = Math.PI * 2;

// ---------- kone (triangle, square, rectangle) ----------
// Bahut kareeb ya lagbhag seedhe kone hata deta hai.
function cleanPolygon(verts, minEdge) {
  const v = verts.slice();
  let changed = true;

  while (changed && v.length > 2) {
    changed = false;
    for (let i = 0; i < v.length; i++) {
      const prev = v[(i + v.length - 1) % v.length];
      const cur = v[i];
      const next = v[(i + 1) % v.length];

      if (dist(cur, next) < minEdge) {
        const merged = { x: (cur.x + next.x) / 2, y: (cur.y + next.y) / 2 };
        if (i === v.length - 1) {
          v[0] = merged;
          v.pop();
        } else {
          v.splice(i, 2, merged);
        }
        changed = true;
        break;
      }
      if (turnAngle(prev, cur, next) < 25) {
        v.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  return v;
}

function finishQuad(v) {
  const rightAngles = v.every(
    (cur, i) => Math.abs(turnAngle(v[(i + 3) % 4], cur, v[(i + 1) % 4]) - 90) < 25,
  );
  if (!rightAngles) return { type: 'quad', points: [...v, v[0]], sharp: true };

  // Rectangle ka jhukao (theta): har side ka angle, 90 degree ke hisaab se.
  const quarter = Math.PI / 2;
  const tilts = v.map((p, i) => {
    const q = v[(i + 1) % 4];
    const a = Math.atan2(q.y - p.y, q.x - p.x);
    return ((((a + quarter / 2) % quarter) + quarter) % quarter) - quarter / 2;
  });
  let theta = avg(tilts);
  if (Math.abs(theta) < (8 * Math.PI) / 180) theta = 0; // lagbhag seedha ho to bilkul seedha

  const cx = avg(v.map((p) => p.x));
  const cy = avg(v.map((p) => p.y));
  const rotate = (p, ang) => ({
    x: cx + (p.x - cx) * Math.cos(ang) - (p.y - cy) * Math.sin(ang),
    y: cy + (p.x - cx) * Math.sin(ang) + (p.y - cy) * Math.cos(ang),
  });

  const box = bounds(v.map((p) => rotate(p, -theta)));
  let w = box.w;
  let h = box.h;
  const square = Math.abs(w - h) / Math.max(w, h) < 0.12;
  if (square) w = h = (w + h) / 2;

  const corners = [
    { x: box.cx - w / 2, y: box.cy - h / 2 },
    { x: box.cx + w / 2, y: box.cy - h / 2 },
    { x: box.cx + w / 2, y: box.cy + h / 2 },
    { x: box.cx - w / 2, y: box.cy + h / 2 },
  ].map((p) => rotate(p, theta));

  return { type: square ? 'square' : 'rectangle', points: [...corners, corners[0]], sharp: true };
}

function detectPolygon(pts, length, box) {
  // Shuru ke point se sab se door point: yahan line ko do hisson mein todte hain.
  let far = 0;
  let best = 0;
  pts.forEach((p, i) => {
    const d = dist(p, pts[0]);
    if (d > best) {
      best = d;
      far = i;
    }
  });

  const eps = POLY_EPS * length;
  const first = rdp(pts.slice(0, far + 1), eps);
  const second = rdp(pts.slice(far).concat([pts[0]]), eps);
  const verts = cleanPolygon(first.slice(0, -1).concat(second.slice(0, -1)), 0.06 * length);

  if (verts.length === 4) return finishQuad(verts);

  if (verts.length === 3) {
    const area =
      Math.abs(
        verts[0].x * (verts[1].y - verts[2].y) +
          verts[1].x * (verts[2].y - verts[0].y) +
          verts[2].x * (verts[0].y - verts[1].y),
      ) / 2;
    if (area < 0.15 * box.w * box.h) return null;
    return { type: 'triangle', points: [...verts, verts[0]], sharp: true };
  }
  return null;
}

export function recognizeShape(points, scale = 1) {
  if (points.length < 8) return null;

  const k = 1 / scale; // zoom ho to minimum size bhi usi hisaab se
  const pts = resample(points, 64);
  const length = pathLength(pts);
  if (length < MIN_LEN * k) return null;

  const first = pts[0];
  const last = pts[pts.length - 1];
  const gap = dist(first, last);

  // 1) Seedhi line
  const maxDev = Math.max(...pts.map((p) => segDist(p, first, last)));
  if (gap / length > 0.85 && maxDev < LINE_DEV * gap) return snapLine(first, last);

  // 2) Band shapes: shuru aur aakhir kareeb hon
  if (gap / length > CLOSE_GAP) return null;
  const box = bounds(pts);
  if (box.w < MIN_DIM * k || box.h < MIN_DIM * k) return null;

  return detectEllipse(pts, box) ?? detectPolygon(pts, length, box);
}