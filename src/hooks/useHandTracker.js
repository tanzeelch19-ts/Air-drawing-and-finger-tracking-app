import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

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
    let frameId = 0;
    let landmarker = null;
    let stream = null;

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

        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, frameRate: { ideal: 60 }, facingMode: 'user' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        video.srcObject = stream;
        await video.play();
        setStatus('ready');

        let lastTime = -1;
        const loop = () => {
          if (cancelled || !landmarker) return;
          // Detection sirf tab chalti hai jab video ka naya frame aaye.
          if (video.currentTime !== lastTime) {
            lastTime = video.currentTime;
            onResultsRef.current(landmarker.detectForVideo(video, performance.now()));
          }
          frameId = requestAnimationFrame(loop);
        };
        loop();
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
      cancelAnimationFrame(frameId);
      stream?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
    };
  }, [videoRef]);

  return { status, error };
}