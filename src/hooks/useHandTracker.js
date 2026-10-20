import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

// Computer ka camera: 16:9. Chhota frame = tez detection.
const CAMERA_LONG = 960;
const CAMERA_SHORT = 540;

// Phone ka camera: 4:3 (portrait mein 3:4). Ye sensor ka poora frame hota hai, is liye
// zoom nahi lagta aur sab se chaura angle milta hai. (9:16 maangne par kuch phones crop kar dete hain.)
const PHONE_LONG = 960;
const PHONE_SHORT = 720;

function cameraSize() {
  const phone = window.matchMedia('(pointer: coarse)').matches;
  if (!phone) return { width: CAMERA_LONG, height: CAMERA_SHORT };

  const portrait = window.matchMedia('(orientation: portrait)').matches;
  return portrait
    ? { width: PHONE_SHORT, height: PHONE_LONG }
    : { width: PHONE_LONG, height: PHONE_SHORT };
}

// Confidence 0.3: haath thoda dhundla ya tez harkat mein ho tab bhi tracking na chhute.
function createLandmarker(vision, delegate) {
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: 'VIDEO',
    numHands: 1,
    minHandDetectionConfidence: 0.3,
    minHandPresenceConfidence: 0.3,
    minTrackingConfidence: 0.3,
  });
}

// onResults(result, { ms }): ms = is frame ki detection mein kitna waqt laga
export function useHandTracker(videoRef, onResults) {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  // Latest callback yaad rakhta hai, taake har render par camera dobara shuru na ho.
  const onResultsRef = useRef(onResults);
  onResultsRef.current = onResults;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let landmarker = null;
    let stream = null;
    let stopFrames = () => {};

    async function start() {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);

        // GPU na chale to khud CPU par chala jata hai.
        try {
          landmarker = await createLandmarker(vision, 'GPU');
        } catch {
          landmarker = await createLandmarker(vision, 'CPU');
        }
        if (cancelled) {
          landmarker.close();
          return;
        }

        const { width, height } = cameraSize();
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: width },
            height: { ideal: height },
            frameRate: { ideal: 60 },
            facingMode: 'user',
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        video.srcObject = stream;
        await video.play();
        setStatus('ready');

        const detect = (now) => {
          if (cancelled || !landmarker) return;
          const t0 = performance.now();
          const result = landmarker.detectForVideo(video, now);
          onResultsRef.current(result, { ms: performance.now() - t0 });
        };

        if (typeof video.requestVideoFrameCallback === 'function') {
          // Behtar: har naye camera frame par theek usi waqt detection (koi extra intezaar nahi).
          let handle = 0;
          const onFrame = (now) => {
            if (cancelled) return;
            detect(now);
            handle = video.requestVideoFrameCallback(onFrame);
          };
          handle = video.requestVideoFrameCallback(onFrame);
          stopFrames = () => video.cancelVideoFrameCallback?.(handle);
        } else {
          // Purane browsers ke liye: requestAnimationFrame se naya frame dhoondna.
          let frameId = 0;
          let lastTime = -1;
          const loop = () => {
            if (cancelled) return;
            if (video.currentTime !== lastTime) {
              lastTime = video.currentTime;
              detect(performance.now());
            }
            frameId = requestAnimationFrame(loop);
          };
          loop();
          stopFrames = () => cancelAnimationFrame(frameId);
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Camera or model failed to load');
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      stopFrames();
      stream?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
    };
  }, [videoRef]);

  return { status, error };
}