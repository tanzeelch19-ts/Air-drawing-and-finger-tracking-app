import { WIDTH, HEIGHT } from './strokes';
import { DIM } from './filters';

// Video ko stage ki tarah "cover" mein banata hai: frame ka beech wala hissa, jo screen par dikhta hai.
function drawCover(ctx, video, width, height) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  const scale = Math.max(width / vw, height / vh);
  const sw = width / scale;
  const sh = height / scale;
  ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, width, height);
}

// Screen par jo dikhta hai wahi file mein jata hai (mirror, filter, glow aur skeleton ke saath).
// withVideo = true: camera ki video bhi (recording ke liye)
// withVideo = false: sirf drawing, dark background par (PNG ke liye)
// showStrokes = false: drawing nahi, sirf haath (Rang Off)
export function composeFrame(
  ctx,
  { video, strokes, overlay, withVideo, showStrokes = true, filter = DIM },
) {
  ctx.save();
  ctx.fillStyle = '#0b0f17';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Screen par canvas mirror hota hai, is liye yahan bhi.
  ctx.translate(WIDTH, 0);
  ctx.scale(-1, 1);

  if (withVideo && video && video.readyState >= 2) {
    ctx.filter = filter;
    drawCover(ctx, video, WIDTH, HEIGHT);
    ctx.filter = 'none';
  }

  if (showStrokes && strokes) {
    ctx.filter = 'blur(8px)'; // glow
    ctx.drawImage(strokes, 0, 0);
    ctx.filter = 'none';
    ctx.drawImage(strokes, 0, 0);
  }

  if (overlay) ctx.drawImage(overlay, 0, 0); // hand skeleton

  ctx.restore();
}