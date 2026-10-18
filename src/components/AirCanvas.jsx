import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useHandTracker } from '@/hooks/useHandTracker';
import { useStrokes } from '@/hooks/useStrokes';
import { useRecorder } from '@/hooks/useRecorder';
import { createHandReader, pinchRatio, pointsFor } from '@/lib/hand';
import { OneEuroFilter } from '@/lib/oneEuro';
import { createGestureStabilizer } from '@/lib/stabilizer';
import {
  drawPiece,
  drawTail,
  renderAll,
  setCanvasSize,
  sizeForAspect,
  IDENTITY_VIEW,
  WIDTH,
  HEIGHT,
} from '@/lib/strokes';
import { recognizeShape } from '@/lib/shapes';
import { drawSkeleton } from '@/lib/skeleton';
import { MAX_ZOOM, panTo, screenToWorld, zoomAbout } from '@/lib/view';
import { composeFrame } from '@/lib/export';
import { downloadBlob, stamp } from '@/lib/download';
import { FILTERS, videoFilter } from '@/lib/filters';
import { PALETTE, RAINBOW, RAINBOW_GRADIENT } from '@/lib/colors';
import { DEFAULT_SIZE, SYMMETRIES, eraserSize, sizeFromPinch } from '@/lib/brush';
import { Toolbar } from './Toolbar';
import { FilterBar } from './FilterBar';
import { ModePanel } from './ModePanel';
import { ZoomPanel } from './ZoomPanel';
import { SymmetryGuides } from './SymmetryGuides';

// ---------- Tuning: yahan se behtari kar sakte hain ----------

// Tracking ka mizaj:
//   'smooth'   = zyada saaf line, thoda dheera
//   'balanced' = beech ka (default)
//   'fast'     = bilkul tez, thodi larzish
const PRESET = 'balanced';
const PRESETS = {
  smooth: { minCutoff: 0.8, beta: 12 },
  balanced: { minCutoff: 1.2, beta: 25 },
  fast: { minCutoff: 2.0, beta: 45 },
};
const FILTER = PRESETS[PRESET];

const COMPACT_BELOW = 720; // stage is se chhota ho to panels neeche chale jate hain (touch ke liye)
const EASE_MS = 16; // cursor aur skeleton screen ke refresh rate par kitna naram chalein (0 = band)
const GLOW = true; // lines ki chamak. Computer ya phone dheera ho to false karein.

const SKELETON_FILTER = { minCutoff: 2.0, beta: 12 }; // skeleton ke 21 points ke liye
const PINCH_FILTER = { minCutoff: 1.2, beta: 6 }; // pinch ke faasle ke liye
const ENTER_FRAMES = 3; // kisi gesture mein jane ke liye itne frames
const EXIT_FRAMES = { draw: 6, double: 6, erase: 5, size: 4 }; // gesture se nikalne ke liye frames
const LINK = ['draw', 'double']; // ye dono aapas mein jaldi badalte hain
const MAX_MISSED = 8; // haath itne frames gum ho to bhi line nahi tootti
const DWELL_MS = 700; // button dabane ke liye rukne ka time
const MIN_STEP = 3; // line mein naya point tab jab ungli itne px hile
const SIZE_HOLD_FRAMES = 6; // pinch itni der ruke to size lock hoga
const SIZE_TOLERANCE = 1.5; // "ruka hua" ka matlab: size itna hi hila
const LOCK_MS = 500; // pinch chhorne ke baad itni der draw/erase band
const NO_HOVER = { id: null, progress: 0 };

const SHAPE_LABEL = {
  line: 'Seedhi line',
  circle: 'Circle',
  ellipse: 'Ellipse',
  triangle: 'Triangle',
  square: 'Square',
  rectangle: 'Rectangle',
  quad: 'Chaar kone',
};

// Har point ka apna smooth filter (x aur y alag).
const makePointer = (config = FILTER) => ({
  x: new OneEuroFilter(config),
  y: new OneEuroFilter(config),
});
const resetPointer = (p) => {
  p.x.reset();
  p.y.reset();
};

// Draw aur double mein ungliyon ka naam bhi gesture ke saath judta hai ("draw|2" = sirf ring ungli),
// taake ungli badalne par nayi line shuru ho.
const gestureKey = ({ gesture, fingers }) =>
  gesture === 'draw' || gesture === 'double' ? `${gesture}|${fingers.join(',')}` : gesture;

// Point (x, y) dabbe b ke andar hai?
const inBox = (b, x, y) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;

const clamp01 = (v) => Math.min(Math.max(v, 0), 1);

// Shuru ka andaza: phone seedha ho to tall (portrait), warna wide. Camera aane par asal naap lag jata hai.
function guessSize() {
  const phonePortrait =
    window.matchMedia('(pointer: coarse)').matches &&
    window.matchMedia('(orientation: portrait)').matches;
  const next = sizeForAspect(phonePortrait ? 9 / 16 : 16 / 9);
  setCanvasSize(next.width, next.height);
  return next;
}

export function AirCanvas() {
  // Drawing ka naap (camera ke aspect ke mutabiq). Badalne par canvases dobara banti hain.
  const [canvasDims, setCanvasDims] = useState(guessSize);

  const fullRef = useRef(null); // fullscreen wala dabba
  const stageRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null); // drawing
  const skelRef = useRef(null); // hand skeleton
  const cursorEls = useRef([null, null]); // do cursors: har ungli ke liye ek

  const store = useStrokes();
  const [tools] = useState(() => ({
    reader: createHandReader(),
    pointers: [makePointer(), makePointer()],
    skeleton: Array.from({ length: 21 }, () => makePointer(SKELETON_FILTER)),
    pinch: new OneEuroFilter(PINCH_FILTER),
    stabilizer: createGestureStabilizer({ enter: ENTER_FRAMES, exit: EXIT_FRAMES, link: LINK }),
  }));

  // Ye values har frame ke handler ko turant chahiye, is liye ref mein bhi rakhte hain.
  const colorRef = useRef(PALETTE[0]);
  const sizeRef = useRef(DEFAULT_SIZE);
  const symRef = useRef(SYMMETRIES[0]);
  const keyRef = useRef('none'); // poora gesture key (ungliyon ke saath)
  const modeRef = useRef('none'); // sirf gesture ka naam
  const hueRef = useRef(0);
  const liveSize = useRef(DEFAULT_SIZE);
  const sizeHold = useRef({ value: -1, count: 0 });
  const lockUntil = useRef(0);
  const dwell = useRef({ id: null, start: 0, fired: false });
  const lastHand = useRef(null); // pichla haath (gum hone par kaam aata hai)
  const missed = useRef(0); // kitne frames se haath nahi mila
  const viewRef = useRef(IDENTITY_VIEW); // zoom
  const replayFrame = useRef(0);
  const toastTimer = useRef(0);
  const skeletonRef = useRef(true);
  const inkRef = useRef(true); // Rang On: drawing dikhe aur chale
  const shapesRef = useRef(false);

  // UI ki jagah ek baar naap kar yaad rakhte hain (har frame par naapna dheera hota hai).
  // Sab kuch stage ke kone se naapa jata hai, is liye scroll karne se farq nahi padta.
  const layout = useRef({ width: 1, height: 1, ui: [], controls: [], sliders: [] });

  // Screen par jo dikhana hai: detection ke baad naya target, aur screen ke refresh par naram chalna.
  const display = useRef({ cursors: [], shown: [null, null], skeleton: null, skeletonShown: null });

  // Tracking ki speed naapne ke liye
  const statsRef = useRef({ start: performance.now(), frames: 0, ms: 0 });

  const [color, setColor] = useState(PALETTE[0]);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [symmetry, setSymmetry] = useState(SYMMETRIES[0]);
  const [filter, setFilter] = useState('normal');
  const [mode, setMode] = useState('none');
  const [hover, setHover] = useState(NO_HOVER);
  const [view, setView] = useState(IDENTITY_VIEW);
  const [skeleton, setSkeleton] = useState(true);
  const [ink, setInk] = useState(true);
  const [shapes, setShapes] = useState(false);
  const [toast, setToast] = useState(null);
  const [stats, setStats] = useState({ fps: 0, ms: 0 });
  const [compact, setCompact] = useState(false); // chhoti screen: panels stage ke neeche
  const [fullscreen, setFullscreen] = useState(false);

  const recorder = useRecorder((ctx) =>
    composeFrame(ctx, {
      video: videoRef.current,
      strokes: canvasRef.current,
      overlay: skelRef.current,
      withVideo: true,
      showStrokes: ink,
      filter: videoFilter(filter),
    }),
  );

  const getCtx = () => canvasRef.current?.getContext('2d') ?? null;

  // ---------- layout ----------
  function measure() {
    const stage = stageRef.current;
    if (!stage) return;
    const s = stage.getBoundingClientRect();
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return { el, x0: r.left - s.left, y0: r.top - s.top, x1: r.right - s.left, y1: r.bottom - s.top };
    };
    layout.current = {
      width: s.width,
      height: s.height,
      ui: [...stage.querySelectorAll('[data-ui]')].map(box),
      controls: [...stage.querySelectorAll('[data-gesture-id]')].map(box),
      sliders: [...stage.querySelectorAll('[data-slider]')].map(box),
    };

    // Chhoti screen (jaise phone portrait): panels stage ke neeche chale jate hain.
    // Fullscreen mein hamesha stage ke andar, taake ungli se control ho.
    const small = s.width < COMPACT_BELOW && !document.fullscreenElement;
    setCompact((prev) => (prev === small ? prev : small));
  }

  // ctx par zoom laga kar draw karta hai.
  function inView(ctx, draw) {
    const v = viewRef.current;
    ctx.save();
    ctx.setTransform(v.scale, 0, 0, v.scale, v.x, v.y);
    draw();
    ctx.restore();
  }

  function replay() {
    const ctx = getCtx();
    if (ctx) renderAll(ctx, store.getStrokes(), viewRef.current);
  }

  // Zoom badalte waqt drawing har frame mein sirf ek baar dobara banti hai.
  function scheduleReplay() {
    if (replayFrame.current) return;
    replayFrame.current = requestAnimationFrame(() => {
      replayFrame.current = 0;
      replay();
    });
  }

  function applyView(next) {
    const cur = viewRef.current;
    if (next.scale === cur.scale && next.x === cur.x && next.y === cur.y) return;
    viewRef.current = next;
    setView(next);
    scheduleReplay();
  }

  function showToast(text) {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1400);
  }

  // ---------- camera ka asli naap ----------
  // Camera ka frame portrait ho ya landscape, stage aur drawing usi naap ki ban jati hai,
  // is liye koi hissa katta nahi aur haath ki jagah bilkul sahi rehti hai.
  function applyAspect(aspect) {
    const next = sizeForAspect(aspect);
    if (next.width === WIDTH && next.height === HEIGHT) return;

    endStroke(); // chalti line pehle khatam

    // Pehle se bani drawing ko naye naap ke beech mein laate hain (shakal nahi bigadti).
    const k = Math.min(next.width / WIDTH, next.height / HEIGHT);
    const ox = (next.width - WIDTH * k) / 2;
    const oy = (next.height - HEIGHT * k) / 2;
    store.remap((p) => ({ x: p.x * k + ox, y: p.y * k + oy }), k);

    setCanvasSize(next.width, next.height);
    viewRef.current = IDENTITY_VIEW;
    setView(IDENTITY_VIEW);
    display.current.skeletonShown = null; // canvas saaf hogi, skeleton dobara banega
    setCanvasDims(next);
  }

  // ---------- mode badalna ----------
  function resetTracking() {
    tools.pointers.forEach(resetPointer);
    tools.pinch.reset();
    sizeHold.current = { value: -1, count: 0 };
    liveSize.current = sizeRef.current;
  }

  // Chalti hui saari strokes khatam karta hai. Shapes On ho to unhein perfect shape bana deta hai.
  function endStroke() {
    const live = store.actives();
    if (!live.length) return;

    let snapped = null;
    if (shapesRef.current) {
      for (const stroke of live) {
        if (stroke.kind !== 'pen') continue;
        const shape = recognizeShape(stroke.points, viewRef.current.scale);
        if (shape) {
          stroke.points = shape.points;
          stroke.sharp = shape.sharp;
          snapped = shape.type;
        }
      }
    }

    const ctx = getCtx();
    if (!snapped && ctx) inView(ctx, () => live.forEach((stroke) => drawTail(ctx, stroke)));

    store.end();

    if (snapped) {
      replay(); // kachchi line ki jagah perfect shape
      showToast(SHAPE_LABEL[snapped]);
    }
  }

  // nextKey: "draw|1", "double|0,2", "erase", "size", "idle" ya "none"
  function changeMode(nextKey, now) {
    const prev = modeRef.current;
    keyRef.current = nextKey;
    modeRef.current = nextKey.split('|')[0];
    setMode(modeRef.current);
    endStroke(); // ungli ya gesture badla: purani line khatam
    resetDwell();
    resetTracking();
    if (prev === 'size') lockUntil.current = now + LOCK_MS;
  }

  // ---------- drawing ----------
  // points = har seedhi ungli ka ek point. 'double' mein do points = do lines.
  function paint(ctx, kind, points) {
    const v = viewRef.current;
    const erasing = kind === 'erase';

    points.forEach((point, slot) => {
      // Screen ka point -> drawing ka point (zoom ke hisaab se)
      const target = screenToWorld(v, point.x * WIDTH, point.y * HEIGHT);
      const stroke = store.active(slot);

      if (!stroke) {
        if (slot === 0) hueRef.current = Math.floor(Math.random() * 360);
        store.begin(
          slot,
          {
            kind: erasing ? 'eraser' : 'pen',
            color: erasing ? '#000000' : colorRef.current,
            // Zoom ho to brush screen par utna hi rehta hai, is liye drawing mein chhota
            size: (erasing ? eraserSize(sizeRef.current) : sizeRef.current) / v.scale,
            sym: symRef.current,
            hue: (hueRef.current + slot * 120) % 360, // rainbow mein dono lines ke rang alag
          },
          target,
        );
        return;
      }

      const last = stroke.points[stroke.points.length - 1];
      if (Math.hypot(target.x - last.x, target.y - last.y) < MIN_STEP / v.scale) return;

      store.extend(slot, target);
      inView(ctx, () => drawPiece(ctx, stroke)); // sirf naya tukda
    });
  }

  // ---------- pinch se brush size ----------
  function updateSize(hand, t) {
    const live = sizeFromPinch(tools.pinch.filter(pinchRatio(hand), t));
    liveSize.current = live; // cursor ka circle turant badalta hai

    const hold = sizeHold.current;
    if (hold.value < 0 || Math.abs(live - hold.value) > SIZE_TOLERANCE) {
      sizeHold.current = { value: live, count: 0 };
      return;
    }

    hold.count += 1;
    if (hold.count >= SIZE_HOLD_FRAMES) {
      const next = Math.round(hold.value);
      if (next !== sizeRef.current) {
        sizeRef.current = next; // asal size tabhi badalta hai jab pinch ruk jaye
        setSize(next);
      }
    }
  }

  // ---------- zoom slider aur minimap ----------
  // u, v = slider ke andar jagah (0 se 1). Ungli, touch aur mouse teeno yahi istemal karte hain.
  function handleSlide(kind, u, v) {
    const cu = clamp01(u);
    const cv = clamp01(v);

    if (kind === 'zoom') {
      applyView(zoomAbout(viewRef.current, Math.pow(MAX_ZOOM, 1 - cv))); // upar = zyada zoom
    } else {
      // Minimap screen jaisa dikhta hai (mirror), is liye x ulta
      applyView(panTo(viewRef.current, (1 - cu) * WIDTH, cv * HEIGHT));
    }
  }

  // Ungli ke liye: seedha, rukne ki zaroorat nahi.
  function adjustSliders(cx, cy) {
    const hit = layout.current.sliders.find((b) => inBox(b, cx, cy));
    if (!hit) return;
    handleSlide(
      hit.el.dataset.slider,
      (cx - hit.x0) / (hit.x1 - hit.x0),
      (cy - hit.y0) / (hit.y1 - hit.y0),
    );
  }

  // ---------- dwell (rukkar button dabana) ----------
  function resetDwell() {
    dwell.current = { id: null, start: 0, fired: false };
    setHover((prev) => (prev.id === null ? prev : NO_HOVER));
  }

  function updateDwell(cx, cy) {
    const hit = layout.current.controls.find((b) => !b.el.disabled && inBox(b, cx, cy));
    const target = hit?.el ?? null;
    const id = target?.dataset.gestureId ?? null;
    const d = dwell.current;

    if (id !== d.id) {
      dwell.current = { id, start: performance.now(), fired: false };
      setHover(id ? { id, progress: 0 } : NO_HOVER);
      return;
    }
    if (!id || d.fired) return;

    const progress = Math.min((performance.now() - d.start) / DWELL_MS, 1);

    if (progress >= 1) {
      d.fired = true; // jab tak ungli hat na jaye, dobara nahi chalega
      target.click();
      setHover({ id, progress: 1 });
      return;
    }

    const step = Math.round(progress * 10) / 10;
    setHover((prev) => (prev.id === id && prev.progress === step ? prev : { id, progress: step }));
  }

  // Skeleton ke 21 points ko smooth karta hai, taake hologram kaanpe nahi.
  function smoothHand(hand, t) {
    return hand.map((p, i) => ({
      x: tools.skeleton[i].x.filter(p.x, t),
      y: tools.skeleton[i].y.filter(p.y, t),
    }));
  }

  // ---------- har camera frame par haath ka result ----------
  function handleResults(result, info) {
    const ctx = getCtx();
    if (!ctx) return;

    const now = performance.now();
    const d = display.current;
    const { width, height, ui } = layout.current;

    // Tracking ki speed (fps aur detection ka waqt), har aadhe second mein ek baar dikhate hain.
    const s = statsRef.current;
    s.frames += 1;
    s.ms += info?.ms ?? 0;
    if (now - s.start >= 500) {
      setStats({
        fps: Math.round((s.frames * 1000) / (now - s.start)),
        ms: Math.round(s.ms / s.frames),
      });
      statsRef.current = { start: now, frames: 0, ms: 0 };
    }

    // Haath kabhi kabhi 1 se 2 frames ke liye gum ho jata hai. Pichla haath kuch frames tak
    // istemal karte hain, taake line na tootay.
    let hand = result.landmarks[0];
    if (hand) {
      lastHand.current = hand;
      missed.current = 0;
    } else if (lastHand.current && missed.current < MAX_MISSED) {
      missed.current += 1;
      hand = lastHand.current;
    }

    if (!hand) {
      lastHand.current = null;
      tools.reader.reset();
      tools.stabilizer.reset('none');
      tools.skeleton.forEach(resetPointer);
      if (keyRef.current !== 'none') changeMode('none', now);
      resetTracking();
      d.cursors = [];
      d.skeleton = null;
      return;
    }

    const t = now / 1000;

    // 0) Hologram skeleton (screen par naram chalna display loop ka kaam hai)
    d.skeleton = skeletonRef.current ? smoothHand(hand, t) : null;

    // 1) Haath padhna: kitni aur kaun si ungliyan seedhi hain. Phir debounce:
    //    gesture (ya ungli) tabhi badle jab kai frames tak same rahe.
    const rawKey = gestureKey(tools.reader.read(hand));
    const stableKey = tools.stabilizer.update(rawKey);
    if (stableKey !== keyRef.current) changeMode(stableKey, now);

    const [stable, fingerList] = stableKey.split('|');
    const fingers = fingerList ? fingerList.split(',').map(Number) : [0];

    // 2) One Euro filter: har seedhi ungli ka apna smooth point.
    const points = pointsFor(hand, stable, fingers).map((raw, i) => ({
      x: tools.pointers[i].x.filter(raw.x, t),
      y: tools.pointers[i].y.filter(raw.y, t),
    }));
    const primary = points[0];

    // Stage ke andar ungli ki jagah (pixels mein). Video mirror hai, is liye x ulta.
    const cx = (1 - primary.x) * width;
    const cy = primary.y * height;
    const overUi = ui.some((b) => inBox(b, cx, cy));

    if (stable === 'size') updateSize(hand, t);

    const diameter =
      stable === 'size'
        ? liveSize.current
        : stable === 'erase'
          ? eraserSize(sizeRef.current)
          : stable === 'draw' || stable === 'double'
            ? sizeRef.current
            : 24;
    d.cursors = points.map((p) => ({ x: p.x, y: p.y, d: diameter }));

    // 3) Draw ya erase (UI ke andar nahi, Rang Off mein nahi, aur pinch ke turant baad nahi).
    //    Gesture ek do frame flicker kare to line sirf ruk jati hai, tootti nahi.
    const drawing = stable === 'draw' || stable === 'double' || stable === 'erase';
    if (drawing && inkRef.current && !overUi && now >= lockUntil.current) {
      if (rawKey === stableKey) paint(ctx, stable, points);
    } else {
      endStroke();
    }

    // 4) Ungli UI par ho: slider/minimap seedha chalte hain, buttons rukne se dabte hain.
    if (overUi && (stable === 'draw' || stable === 'double')) {
      adjustSliders(cx, cy);
      updateDwell(cx, cy);
    } else {
      resetDwell();
    }
  }

  const { status, error } = useHandTracker(videoRef, handleResults);

  // Camera ka asli naap dekhna: shuru mein aur jab phone ghumane se frame badle.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const update = () => {
      if (video.videoWidth && video.videoHeight) applyAspect(video.videoWidth / video.videoHeight);
    };

    update();
    video.addEventListener('loadedmetadata', update);
    video.addEventListener('resize', update);
    return () => {
      video.removeEventListener('loadedmetadata', update);
      video.removeEventListener('resize', update);
    };
  }, [status]);

  // Naap badalne par canvases khali ho jati hain: drawing dobara banao aur UI dobara naapo.
  useLayoutEffect(() => {
    replay();
    measure();
  }, [canvasDims]);

  // UI naapna: shuru mein, jab size badle, aur jab panels jagah badlein (compact badalne par).
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    stage.querySelectorAll('[data-ui]').forEach((el) => observer.observe(el));
    window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [compact]);

  // Fullscreen ki halat par nazar
  useEffect(() => {
    const onChange = () => {
      setFullscreen(Boolean(document.fullscreenElement));
      measure();
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Display loop: cursor aur skeleton ko screen ke refresh rate par naram chalata hai.
  // Detection 30 fps par aati hai, ye beech ke jhatkon ko bhar deta hai.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();

    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const k = EASE_MS > 0 ? 1 - Math.exp(-dt / (EASE_MS / 1000)) : 1;
      const d = display.current;
      const { width, height } = layout.current;

      // Cursors
      for (let i = 0; i < cursorEls.current.length; i++) {
        const el = cursorEls.current[i];
        if (!el) continue;

        const target = d.cursors[i];
        if (!target) {
          el.style.opacity = '0';
          d.shown[i] = null;
          continue;
        }

        const cur = d.shown[i] ?? { x: target.x, y: target.y, d: target.d };
        cur.x += (target.x - cur.x) * k;
        cur.y += (target.y - cur.y) * k;
        cur.d = target.d;
        d.shown[i] = cur;

        const px = Math.max(cur.d * (width / WIDTH), 14);
        el.style.opacity = '1';
        el.style.width = `${px}px`;
        el.style.height = `${px}px`;
        // Video mirror hai, is liye x ko ulta (1 - x) karte hain.
        el.style.transform = `translate(${(1 - cur.x) * width}px, ${cur.y * height}px) translate(-50%, -50%)`;
      }

      // Skeleton: sirf tab dobara banta hai jab kuch hila ho.
      const sctx = skelRef.current?.getContext('2d');
      if (sctx) {
        const target = d.skeleton;
        if (!target) {
          if (d.skeletonShown) {
            d.skeletonShown = null;
            drawSkeleton(sctx, null);
          }
        } else {
          let shown = d.skeletonShown;
          let redraw = false;

          if (!shown) {
            shown = target.map((p) => ({ x: p.x, y: p.y }));
            redraw = true;
          } else {
            target.forEach((p, i) => {
              const dx = p.x - shown[i].x;
              const dy = p.y - shown[i].y;
              if (Math.abs(dx) > 1e-4 || Math.abs(dy) > 1e-4) {
                shown[i].x += dx * k;
                shown[i].y += dy * k;
                redraw = true;
              }
            });
          }

          d.skeletonShown = shown;
          if (redraw) drawSkeleton(sctx, shown);
        }
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // ---------- actions ----------
  function pickColor(next) {
    colorRef.current = next;
    setColor(next);
  }

  function handleSymmetry() {
    const next = SYMMETRIES[(SYMMETRIES.indexOf(symRef.current) + 1) % SYMMETRIES.length];
    symRef.current = next;
    setSymmetry(next);
  }

  function toggleSkeleton() {
    skeletonRef.current = !skeletonRef.current;
    setSkeleton(skeletonRef.current);
  }

  function toggleInk() {
    inkRef.current = !inkRef.current;
    setInk(inkRef.current);
    if (!inkRef.current) endStroke();
  }

  function toggleShapes() {
    shapesRef.current = !shapesRef.current;
    setShapes(shapesRef.current);
  }

  function handleUndo() {
    if (store.undo()) replay();
  }

  function handleRedo() {
    if (store.redo()) replay();
  }

  function handleClear() {
    if (store.clear()) replay();
  }

  // factor 0 = zoom wapas 1x, warna maujooda zoom ko is se guna karo.
  function handleZoom(factor) {
    const v = viewRef.current;
    applyView(factor === 0 ? IDENTITY_VIEW : zoomAbout(v, v.scale * factor));
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await fullRef.current?.requestFullscreen();
      try {
        await screen.orientation.lock('landscape'); // sab browsers mein nahi chalta
      } catch {
        /* koi baat nahi */
      }
    } catch {
      /* browser ne fullscreen se mana kar diya */
    }
  }

  function handleSave() {
    // Poori drawing (zoom ke bina) alag canvas par bana kar save karte hain.
    const full = document.createElement('canvas');
    full.width = WIDTH;
    full.height = HEIGHT;
    renderAll(full.getContext('2d'), store.getStrokes());

    const out = document.createElement('canvas');
    out.width = WIDTH;
    out.height = HEIGHT;
    composeFrame(out.getContext('2d'), { strokes: full, withVideo: false });
    out.toBlob((blob) => blob && downloadBlob(blob, `air-draw-${stamp()}.png`), 'image/png');
  }

  // Keyboard shortcuts (backup): Ctrl+Z, Ctrl+Y, C, S, R, + - 0
  const actions = useRef({});
  actions.current = {
    undo: handleUndo,
    redo: handleRedo,
    clear: handleClear,
    save: handleSave,
    record: recorder.toggle,
    zoom: handleZoom,
  };

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'z') {
        e.preventDefault();
        actions.current.undo();
      } else if (mod && key === 'y') {
        e.preventDefault();
        actions.current.redo();
      } else if (!mod && key === 'c') actions.current.clear();
      else if (!mod && key === 's') actions.current.save();
      else if (!mod && key === 'r') actions.current.record();
      else if (!mod && (key === '+' || key === '=')) actions.current.zoom(1.25);
      else if (!mod && key === '-') actions.current.zoom(0.8);
      else if (!mod && key === '0') actions.current.zoom(0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(
    () => () => {
      cancelAnimationFrame(replayFrame.current);
      clearTimeout(toastTimer.current);
    },
    [],
  );

  // ---------- cursor ka look ----------
  const fill = color === RAINBOW ? RAINBOW_GRADIENT : color;
  const glow = color === RAINBOW ? '#ffffff' : color;
  const CURSOR_STYLE = {
    draw: { background: fill, boxShadow: `0 0 18px ${glow}` },
    double: { background: fill, boxShadow: `0 0 18px ${glow}` },
    size: { background: fill, boxShadow: '0 0 0 3px #ffffff' },
    erase: { background: 'rgba(255,255,255,0.15)', boxShadow: '0 0 0 3px #ffffff' },
    select: { background: 'transparent', boxShadow: '0 0 0 3px #ffffff' },
    idle: { background: 'rgba(255,255,255,0.35)', boxShadow: 'none' },
    none: { background: 'rgba(255,255,255,0.35)', boxShadow: 'none' },
  };
  // Ungli button par ho to cursor safed ring ban jata hai.
  const cursorStyle = hover.id ? CURSOR_STYLE.select : CURSOR_STYLE[mode];

  // ---------- panels ----------
  // Ek hi panels do jagah dikh sakte hain: stage ke andar (ungli se) ya neeche (touch se).
  const toolbar = (
    <Toolbar
      colors={PALETTE}
      color={color}
      symmetry={symmetry}
      hover={hover}
      mode={mode}
      size={size}
      canUndo={store.canUndo}
      canRedo={store.canRedo}
      recording={recorder.recording}
      canRecord={recorder.supported}
      docked={compact}
      onColorChange={pickColor}
      onSymmetry={handleSymmetry}
      onUndo={handleUndo}
      onRedo={handleRedo}
      onClear={handleClear}
      onSave={handleSave}
      onRecord={recorder.toggle}
    />
  );
  const modes = (
    <ModePanel
      skeleton={skeleton}
      ink={ink}
      shapes={shapes}
      hover={hover}
      docked={compact}
      onSkeleton={toggleSkeleton}
      onInk={toggleInk}
      onShapes={toggleShapes}
    />
  );
  const zoom = (
    <ZoomPanel
      view={view}
      hover={hover}
      docked={compact}
      onReset={() => handleZoom(0)}
      onSlide={handleSlide}
    />
  );
  const filters = (
    <FilterBar filters={FILTERS} value={filter} hover={hover} docked={compact} onChange={setFilter} />
  );

  const canFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled;

  // Stage ka aspect camera ke aspect jaisa (portrait mein tall, landscape mein wide).
  const aspect = canvasDims.width / canvasDims.height;

  return (
    <div
      className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-6"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      {/* Fullscreen mein sirf ye dabba aata hai; stage beech mein apne aspect mein hi rehta hai */}
      <div ref={fullRef} className="flex items-center justify-center [&:fullscreen]:bg-black">
        <div
          ref={stageRef}
          style={{
            width: `min(100%, calc((100dvh - 1rem) * ${aspect}))`,
            aspectRatio: `${canvasDims.width} / ${canvasDims.height}`,
          }}
          className="@container relative select-none overflow-hidden rounded-2xl bg-black"
        >
          {/* Filter sirf video par lagta hai. Canvas (lines) alag hai, is liye uske rang nahi badalte. */}
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ filter: videoFilter(filter) }}
            className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
          />

          {/* Drawing: Rang Off ho to chhup jati hai (mitti nahi) */}
          <canvas
            ref={canvasRef}
            width={canvasDims.width}
            height={canvasDims.height}
            style={{ opacity: ink ? 1 : 0 }}
            className={`pointer-events-none absolute inset-0 h-full w-full -scale-x-100 transition-opacity duration-200 ${
              GLOW ? '[filter:drop-shadow(0_0_6px_rgba(255,255,255,0.45))]' : ''
            }`}
          />

          {/* Hologram skeleton */}
          <canvas
            ref={skelRef}
            width={canvasDims.width}
            height={canvasDims.height}
            className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100"
          />

          <SymmetryGuides mode={symmetry} view={view} />

          {/* Bari screen ya fullscreen: panels stage ke andar, ungli se control */}
          {!compact && (
            <>
              <div data-ui className="absolute inset-x-0 top-0 z-10">
                {toolbar}
              </div>
              {modes}
              {zoom}
              {filters}
            </>
          )}

          {toast && (
            <div className="pointer-events-none absolute bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm text-ink-100 @max-3xl:bottom-16 @max-3xl:text-xs">
              {toast}
            </div>
          )}

          {/* Do cursors: har ungli ke liye ek (size, position aur opacity display loop se set hote hain) */}
          {[0, 1].map((slot) => (
            <div
              key={slot}
              ref={(el) => {
                cursorEls.current[slot] = el;
              }}
              className="pointer-events-none absolute left-0 top-0 z-20 rounded-full opacity-0"
              style={cursorStyle}
            />
          ))}

          {status !== 'ready' && (
            <div className="absolute inset-0 z-30 grid place-items-center bg-black/70 px-4 text-center text-base text-ink-100 sm:text-lg">
              {status === 'loading' ? 'Camera aur model load ho rahe hain…' : `Error: ${error}`}
            </div>
          )}
        </div>
      </div>

      {/* Chhoti screen: panels stage ke neeche, touch se */}
      {compact && (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-xs text-ink-400">
            Phone ko landscape mein ghumayein ya Fullscreen dabayein, to ye sab ungli se hi control honge.
          </p>
          {toolbar}
          <div className="flex flex-wrap items-start gap-3">
            {modes}
            {zoom}
          </div>
          {filters}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-400">
          Tracking: {stats.fps} fps · detection {stats.ms} ms · frame {canvasDims.width}×{canvasDims.height}
        </p>
        {canFullscreen && (
          <button
            type="button"
            onClick={toggleFullscreen}
            className="cursor-pointer touch-manipulation rounded-lg border border-ink-700 bg-ink-900 px-3 py-1.5 text-xs font-medium text-ink-100"
          >
            {fullscreen ? 'Fullscreen band karein' : 'Fullscreen'}
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-3 text-xs text-ink-400 sm:grid-cols-2 sm:text-sm lg:grid-cols-3">
        <p className="rounded-xl bg-ink-900 p-3">
          ☝️ <b className="text-ink-100">Koi bhi ek ungli</b> (index, middle, ring ya pinky): ek line
        </p>
        <p className="rounded-xl bg-ink-900 p-3">
          ✌️ <b className="text-ink-100">Koi bhi do ungliyan</b>: do lines, har ungli ki apni
        </p>
        <p className="rounded-xl bg-ink-900 p-3">
          👆 <b className="text-ink-100">Button par</b> ungli 0.7 second rakhein: wo dab jayega
        </p>
        <p className="rounded-xl bg-ink-900 p-3">
          🖐️ <b className="text-ink-100">Khuli hatheli</b> (chaaron ungliyan): eraser
        </p>
        <p className="rounded-xl bg-ink-900 p-3">
          👌 <b className="text-ink-100">Pinch</b> (baaqi teen ungliyan upar): faasla = brush size
        </p>
        <p className="rounded-xl bg-ink-900 p-3">
          ✊ <b className="text-ink-100">Muthi ya teen ungliyan</b>: ruk jao
        </p>
        <p className="rounded-xl bg-ink-900 p-3">
          🔷 <b className="text-ink-100">Shapes On</b>: gola, square, triangle, seedhi line perfect ho jati hai
        </p>
        <p className="rounded-xl bg-ink-900 p-3">
          🦴 <b className="text-ink-100">Skeleton</b> aur <b className="text-ink-100">Rang</b>: Rang Off karein
          to sirf haath dikhta hai
        </p>
        <p className="rounded-xl bg-ink-900 p-3">
          🔍 <b className="text-ink-100">Zoom panel</b>: slider par ungli phirayein to zoom, minimap par
          phirayein to drawing ka hissa badalta hai
        </p>
      </div>
    </div>
  );
}