import { WIDTH, HEIGHT } from './strokes';

// MediaPipe ke 21 points kaise jurte hain (hatheli, angootha aur chaaron ungliyan)
export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

const TIPS = [4, 8, 12, 16, 20];
const PALM = [0, 1, 5, 9, 13, 17];
const GLOW = '#22d3ee';

// points = 21 points (0 se 1 ke darmiyan), ya null (kuch nahi dikhana).
export function drawSkeleton(ctx, points) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  if (!points) return;

  const px = points.map((p) => ({ x: p.x * WIDTH, y: p.y * HEIGHT }));

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = GLOW;
  ctx.shadowBlur = 14;

  // Hatheli ka halka hologram rang
  ctx.fillStyle = 'rgba(34, 211, 238, 0.10)';
  ctx.beginPath();
  PALM.forEach((i, k) => (k ? ctx.lineTo(px[i].x, px[i].y) : ctx.moveTo(px[i].x, px[i].y)));
  ctx.closePath();
  ctx.fill();

  // Haddiyan
  ctx.strokeStyle = GLOW;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (const [a, b] of HAND_CONNECTIONS) {
    ctx.moveTo(px[a].x, px[a].y);
    ctx.lineTo(px[b].x, px[b].y);
  }
  ctx.stroke();

  // Jodh aur ungliyon ke sire
  px.forEach((p, i) => {
    const tip = TIPS.includes(i);
    ctx.fillStyle = tip ? '#ffffff' : '#a5f3fc';
    ctx.beginPath();
    ctx.arc(p.x, p.y, tip ? 7 : 4.5, 0, Math.PI * 2);
    ctx.fill();

    if (tip) {
      ctx.strokeStyle = GLOW;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  ctx.restore();
}