// Haath se bani line ko perfect shape mein badalta hai.
//
// recognizeShape(points, scale) -> { type, points, sharp, closed } ya null (kuch pehchana nahi)
//
// Pehchaan: seedhi line, circle, ellipse (tirchhi bhi), triangle (barabar, seedhe kone wala, aam),
// square, rectangle, diamond, pentagon, hexagon, heptagon, octagon, aam polygon aur 5 kone ka star.

const MIN_LEN = 80; // is se chhoti line ko nahi chhedte (screen px mein)
const MIN_DIM = 40; // shape ki chaurai aur ooncha'i kam az kam itni
const LINE_DEV = 0.06; // seedhi line: beech ka bhatkna chord ke 6% se kam
const ELLIPSE_TOL = 0.1; // gola: radius ka farq 10% se kam
const CLOSE_GAP = 0.2; // band shape: shuru aur aakhir ka faasla path ke 20% se kam
const SNAP_ANGLE = 6; // line ko horizontal, vertical ya 45 degree par kheenchne ka angle (degrees)
const POLY_EPS = [0.015, 0.025, 0.04]; // kone dhoondne ki sakhti ke 3 darje (path ka hissa)
const MAX_VERTS = 10; // is se zyada kone wali shape polygon nahi (sirf star 10 kone ka ho sakta hai)
const FLAT_TURN = 28; // is se kam mudne wale kone hata dete hain (wo seedhi line ka hissa hain)
const MIN_CORNER = 38; // asli kone itne degree se zyada mudte hain
const POLY_BEATS_ELLIPSE = 0.55; // polygon ki galti ellipse ki galti se itni (gunah) kam ho to polygon chunte hain

const TAU = Math.PI * 2;

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const avg = (list) => list.reduce((sum, v) => sum + v, 0) / list.length;
const std = (list) => {
  const m = avg(list);
  return Math.sqrt(avg(list.map((v) => (v - m) ** 2)));
};
const toDeg = (rad) => (rad * 180) / Math.PI;
const angleOf = (from, to) => Math.atan2(to.y - from.y, to.x - from.x);
const centroidOf = (pts) => ({ x: avg(pts.map((p) => p.x)), y: avg(pts.map((p) => p.y)) });

// Shape mein n baar dohrane wale angles ka asal "shuruaati" angle (jaise 5 kone ke tare ka).
const circularPhase = (angles, fold) =>
  Math.atan2(
    angles.reduce((s, a) => s + Math.sin(fold * a), 0),
    angles.reduce((s, a) => s + Math.cos(fold * a), 0),
  ) / fold;

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
  return toDeg(d);
}

// b par shape ke andar ka kona (degrees)
function interiorAngle(prev, cur, next) {
  const ax = prev.x - cur.x;
  const ay = prev.y - cur.y;
  const bx = next.x - cur.x;
  const by = next.y - cur.y;
  const cos = (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by) || 1);
  return toDeg(Math.acos(Math.max(-1, Math.min(1, cos))));
}

// Points shape ke kinaron se kitni door hain (average, pixels mein)
function meanFitDistance(pts, verts) {
  let total = 0;
  for (const p of pts) {
    let best = Infinity;
    for (let i = 0; i < verts.length; i++) {
      best = Math.min(best, segDist(p, verts[i], verts[(i + 1) % verts.length]));
    }
    total += best;
  }
  return total / pts.length;
}

// ---------- seedhi line ----------
function snapLine(a, b) {
  const p = { ...a };
  const q = { ...b };
  const abs = Math.abs(toDeg(angleOf(p, q)));

  if (abs < SNAP_ANGLE || abs > 180 - SNAP_ANGLE) {
    const y = (p.y + q.y) / 2; // bilkul horizontal
    p.y = y;
    q.y = y;
  } else if (Math.abs(abs - 90) < SNAP_ANGLE) {
    const x = (p.x + q.x) / 2; // bilkul vertical
    p.x = x;
    q.x = x;
  } else if (Math.abs(abs - 45) < SNAP_ANGLE || Math.abs(abs - 135) < SNAP_ANGLE) {
    // bilkul 45 degree
    const len = dist(p, q);
    const mx = (p.x + q.x) / 2;
    const my = (p.y + q.y) / 2;
    const sx = Math.sign(q.x - p.x) || 1;
    const sy = Math.sign(q.y - p.y) || 1;
    const d = len / (2 * Math.SQRT2);
    p.x = mx - sx * d;
    p.y = my - sy * d;
    q.x = mx + sx * d;
    q.y = my + sy * d;
  }
  return { type: 'line', points: [p, q], sharp: true, closed: false };
}

function detectLine(pts, length) {
  const first = pts[0];
  const last = pts[pts.length - 1];
  const gap = dist(first, last);
  const maxDev = Math.max(...pts.map((p) => segDist(p, first, last)));
  return gap / length > 0.85 && maxDev < LINE_DEV * gap ? snapLine(first, last) : null;
}

// ---------- ellipse (tirchhi bhi) ----------
// Points ka "phailao" dekh kar ellipse ka jhukao aur dono radius nikalta hai.
function fitEllipse(pts) {
  const c = centroidOf(pts);
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of pts) {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  let min1 = Infinity;
  let max1 = -Infinity;
  let min2 = Infinity;
  let max2 = -Infinity;
  const proj = pts.map((p) => {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const u = dx * cos + dy * sin;
    const v = -dx * sin + dy * cos;
    min1 = Math.min(min1, u);
    max1 = Math.max(max1, u);
    min2 = Math.min(min2, v);
    max2 = Math.max(max2, v);
    return { u, v };
  });

  const mu = (min1 + max1) / 2;
  const mv = (min2 + max2) / 2;
  const a = (max1 - min1) / 2;
  const b = (max2 - min2) / 2;
  if (a < 1 || b < 1) return null;

  const radii = proj.map(({ u, v }) => Math.hypot((u - mu) / a, (v - mv) / b));
  const mean = avg(radii);

  return {
    cx: c.x + mu * cos - mv * sin,
    cy: c.y + mu * sin + mv * cos,
    a,
    b,
    theta,
    radius: (a + b) / 2,
    spread: std(radii) / mean, // radius mein kitna farq
    error: avg(radii.map((r) => Math.abs(r - 1))), // ellipse se kitni door (radius ke hisaab se)
  };
}

function buildEllipse(fit) {
  let { a, b, theta } = fit;
  const circle = Math.abs(a - b) / Math.max(a, b) < 0.15;

  if (circle) {
    a = fit.radius;
    b = fit.radius;
    theta = 0;
  } else {
    const deg = toDeg(theta);
    if (Math.abs(deg) < 6) theta = 0; // lagbhag seedhi ho to bilkul seedhi
    else if (Math.abs(Math.abs(deg) - 90) < 6) theta = Math.PI / 2;
  }

  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const count = Math.max(48, Math.min(240, Math.round((TAU * Math.max(a, b)) / 6)));

  const out = [];
  for (let i = 0; i <= count; i++) {
    const t = (i / count) * TAU;
    const x = a * Math.cos(t);
    const y = b * Math.sin(t);
    out.push({ x: fit.cx + x * cos - y * sin, y: fit.cy + x * sin + y * cos });
  }
  return { type: circle ? 'circle' : 'ellipse', points: out, sharp: false, closed: true };
}

// ---------- kone wali shapes ----------

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
      if (turnAngle(prev, cur, next) < FLAT_TURN) {
        v.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  return v;
}

// 3 sakhti ke darjon par kone dhoondta hai. Jo sab se kam galti aur kam kone mein shape banaye wahi chuna jata hai.
function bestPolygon(pts, length, diag) {
  // Shuru ke point se sab se door point: yahan line ko do hisson mein todte hain.
  let far = 0;
  let farthest = 0;
  pts.forEach((p, i) => {
    const d = dist(p, pts[0]);
    if (d > farthest) {
      farthest = d;
      far = i;
    }
  });

  let best = null;
  for (const k of POLY_EPS) {
    const eps = k * length;
    const first = rdp(pts.slice(0, far + 1), eps);
    const second = rdp(pts.slice(far).concat([pts[0]]), eps);
    const verts = cleanPolygon(first.slice(0, -1).concat(second.slice(0, -1)), 0.06 * length);
    if (verts.length < 3 || verts.length > MAX_VERTS) continue;

    const n = verts.length;
    const minTurn = Math.min(
      ...verts.map((cur, i) => turnAngle(verts[(i + n - 1) % n], cur, verts[(i + 1) % n])),
    );
    if (minTurn < MIN_CORNER) continue;

    const fit = meanFitDistance(pts, verts);
    const score = fit / diag + 0.004 * n; // kam galti aur kam kone behtar
    if (!best || score < best.score) best = { verts, minTurn, fit, score };
  }
  return best;
}

const rotateAround = (p, c, ang) => ({
  x: c.x + (p.x - c.x) * Math.cos(ang) - (p.y - c.y) * Math.sin(ang),
  y: c.y + (p.x - c.x) * Math.sin(ang) + (p.y - c.y) * Math.cos(ang),
});

// Barabar kinaron wali shape (n kone), phi = pehle kone ka angle.
function regularPolygon(center, radius, phi, n) {
  return Array.from({ length: n }, (_, j) => {
    const a = phi + (j * TAU) / n;
    return { x: center.x + radius * Math.cos(a), y: center.y + radius * Math.sin(a) };
  });
}

const closeShape = (type, verts) => ({ type, points: [...verts, verts[0]], sharp: true, closed: true });

// 5 kone ka tara: 5 bahar ke kone aur 5 andar ke.
function buildStar(center, outerRadius, phi) {
  const inner = outerRadius * 0.382;
  const verts = [];
  for (let k = 0; k < 5; k++) {
    const outer = phi + (k * TAU) / 5;
    const between = outer + TAU / 10;
    verts.push({ x: center.x + outerRadius * Math.cos(outer), y: center.y + outerRadius * Math.sin(outer) });
    verts.push({ x: center.x + inner * Math.cos(between), y: center.y + inner * Math.sin(between) });
  }
  return closeShape('star', verts);
}

function detectStar(verts, center, minTurn) {
  const n = verts.length;
  const radii = verts.map((v) => dist(center, v));

  // Ek line mein banaya tara (pentagram): 5 kone, har kona bohot tez mudta hai.
  if (n === 5 && minTurn >= 110 && std(radii) / avg(radii) < 0.15) {
    const phi = circularPhase(verts.map((v) => angleOf(center, v)), 5);
    return buildStar(center, avg(radii), phi);
  }

  // Poora outline: 10 kone, bahar aur andar ke baari baari.
  if (n === 10) {
    const even = radii.filter((_, i) => i % 2 === 0);
    const odd = radii.filter((_, i) => i % 2 === 1);
    const [outerIdx, outerR, innerR] =
      avg(even) > avg(odd) ? [0, even, odd] : [1, odd, even];
    const ratio = avg(innerR) / avg(outerR);
    if (ratio > 0.3 && ratio < 0.7 && std(outerR) / avg(outerR) < 0.2) {
      const outers = verts.filter((_, i) => i % 2 === outerIdx);
      const phi = circularPhase(outers.map((v) => angleOf(center, v)), 5);
      return buildStar(center, avg(outerR), phi);
    }
  }
  return null;
}

function finishTriangle(v) {
  const c = centroidOf(v);
  const sides = v.map((p, i) => dist(p, v[(i + 1) % 3]));

  // 1) Barabar triangle: teeno kinare lagbhag ek jaise
  if (Math.max(...sides) / Math.min(...sides) < 1.18) {
    const phi = circularPhase(v.map((p) => angleOf(c, p)), 3);
    return closeShape('equilateral', regularPolygon(c, avg(v.map((p) => dist(c, p))), phi, 3));
  }

  // 2) Seedhe kone wala: koi kona 90 degree ke qareeb
  for (let i = 0; i < 3; i++) {
    const prev = v[(i + 2) % 3];
    const cur = v[i];
    const next = v[(i + 1) % 3];
    if (Math.abs(interiorAngle(prev, cur, next) - 90) < 11) {
      const lenA = dist(cur, next);
      const lenB = dist(cur, prev);
      const ux = (next.x - cur.x) / lenA;
      const uy = (next.y - cur.y) / lenA;

      // Doosra kinara pehle ke bilkul seedha, usi taraf jidhar pehle tha.
      let px = -uy;
      let py = ux;
      if (px * (prev.x - cur.x) + py * (prev.y - cur.y) < 0) {
        px = uy;
        py = -ux;
      }
      const a = { x: cur.x + ux * lenA, y: cur.y + uy * lenA };
      const b = { x: cur.x + px * lenB, y: cur.y + py * lenB };
      return closeShape('right-triangle', [cur, a, b]);
    }
  }

  return closeShape('triangle', v);
}

function finishQuad(v) {
  const rightAngles = v.every(
    (cur, i) => Math.abs(turnAngle(v[(i + 3) % 4], cur, v[(i + 1) % 4]) - 90) < 25,
  );
  if (!rightAngles) return closeShape('quad', v);

  // Rectangle ka jhukao: har kinare ka angle, 90 degree ke hisaab se (4 baar dohrane wala).
  let tilt = circularPhase(v.map((p, i) => angleOf(p, v[(i + 1) % 4])), 4);
  if (Math.abs(toDeg(tilt)) < 8) tilt = 0; // lagbhag seedha ho to bilkul seedha

  const center = centroidOf(v);
  const box = bounds(v.map((p) => rotateAround(p, center, -tilt)));
  let w = box.w;
  let h = box.h;
  const square = Math.abs(w - h) / Math.max(w, h) < 0.12;
  if (square) w = h = (w + h) / 2;

  const corners = [
    { x: box.cx - w / 2, y: box.cy - h / 2 },
    { x: box.cx + w / 2, y: box.cy - h / 2 },
    { x: box.cx + w / 2, y: box.cy + h / 2 },
    { x: box.cx - w / 2, y: box.cy + h / 2 },
  ].map((p) => rotateAround(p, center, tilt));

  const diamond = square && Math.abs(toDeg(tilt)) > 37;
  return closeShape(diamond ? 'diamond' : square ? 'square' : 'rectangle', corners);
}

const POLYGON_NAME = { 5: 'pentagon', 6: 'hexagon', 7: 'heptagon', 8: 'octagon' };

function finishPolygon(poly, box) {
  const { verts, minTurn } = poly;
  const n = verts.length;
  const center = centroidOf(verts);

  const star = detectStar(verts, center, minTurn);
  if (star) return star;

  if (n === 3) {
    const area =
      Math.abs(
        verts[0].x * (verts[1].y - verts[2].y) +
          verts[1].x * (verts[2].y - verts[0].y) +
          verts[2].x * (verts[0].y - verts[1].y),
      ) / 2;
    return area < 0.12 * box.w * box.h ? null : finishTriangle(verts);
  }
  if (n === 4) return finishQuad(verts);
  if (n > 8) return null;

  // 5 se 8 kone: kinare aur radius barabar hon to bilkul barabar polygon
  const radii = verts.map((v) => dist(center, v));
  const sides = verts.map((v, i) => dist(v, verts[(i + 1) % n]));
  const regular = std(sides) / avg(sides) < 0.2 && std(radii) / avg(radii) < 0.14;

  if (regular) {
    const phi = circularPhase(verts.map((v) => angleOf(center, v)), n);
    return closeShape(POLYGON_NAME[n], regularPolygon(center, avg(radii), phi, n));
  }
  return closeShape('polygon', verts);
}

export function recognizeShape(points, scale = 1) {
  if (points.length < 8) return null;

  const k = 1 / scale; // zoom ho to minimum size bhi usi hisaab se
  const pts = resample(points, 64);
  const length = pathLength(pts);
  if (length < MIN_LEN * k) return null;

  // 1) Seedhi line
  const line = detectLine(pts, length);
  if (line) return line;

  // 2) Band shapes: shuru aur aakhir kareeb hon
  if (dist(pts[0], pts[pts.length - 1]) / length > CLOSE_GAP) return null;

  const box = bounds(pts);
  if (box.w < MIN_DIM * k || box.h < MIN_DIM * k) return null;
  const diag = Math.hypot(box.w, box.h);

  const ellipse = fitEllipse(pts);
  const ellipseOK = !!ellipse && ellipse.spread <= ELLIPSE_TOL;

  // 3) Polygon ko ellipse se muqabla: jis ki galti bohot kam ho wahi jeetta hai.
  //    (Hexagon gola nahi ban jata, aur gola hexagon nahi.)
  const poly = bestPolygon(pts, length, diag);
  if (poly) {
    const polyError = poly.fit / (ellipse ? ellipse.radius : diag / 2.8); // radius ke hisaab se
    const polyWins = ellipseOK ? polyError < POLY_BEATS_ELLIPSE * ellipse.error : polyError < 0.1;
    if (polyWins) {
      const shape = finishPolygon(poly, box);
      if (shape) return shape;
    }
  }

  return ellipseOK ? buildEllipse(ellipse) : null;
}