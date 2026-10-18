import { useCallback, useEffect, useRef, useState } from 'react';
import { WIDTH, HEIGHT } from '@/lib/strokes';
import { downloadBlob, stamp } from '@/lib/download';

const TYPES = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
const pickType = () => TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
const FRAME_MS = 1000 / 30; // recording 30 fps par: halki aur kaafi smooth

// compose(ctx) har frame par poori tasveer alag canvas par banata hai.
export function useRecorder(compose) {
  const supported = typeof MediaRecorder !== 'undefined';
  const [recording, setRecording] = useState(false);
  const live = useRef({ recorder: null, frameId: 0 });

  const composeRef = useRef(compose);
  composeRef.current = compose;

  const stop = useCallback(() => {
    const { recorder, frameId } = live.current;
    cancelAnimationFrame(frameId);
    live.current = { recorder: null, frameId: 0 };
    if (recorder && recorder.state !== 'inactive') recorder.stop(); // onstop download karega
    setRecording(false);
  }, []);

  const start = useCallback(() => {
    if (!supported || live.current.recorder) return;

    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');

    const mimeType = pickType();
    const recorder = new MediaRecorder(
      canvas.captureStream(30),
      mimeType ? { mimeType, videoBitsPerSecond: 6_000_000 } : undefined,
    );

    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const type = recorder.mimeType || 'video/webm';
      const ext = type.includes('mp4') ? 'mp4' : 'webm';
      downloadBlob(new Blob(chunks, { type }), `air-draw-${stamp()}.${ext}`);
    };

    let lastFrame = 0;
    const loop = (now) => {
      if (now - lastFrame >= FRAME_MS - 1) {
        lastFrame = now;
        composeRef.current(ctx);
      }
      live.current.frameId = requestAnimationFrame(loop);
    };

    live.current.recorder = recorder;
    loop(performance.now()); // pehla frame recording shuru hone se pehle bana lein
    recorder.start();
    setRecording(true);
  }, [supported]);

  const toggle = useCallback(() => {
    if (live.current.recorder) stop();
    else start();
  }, [start, stop]);

  // Page band ya component hatne par recording chup chap band, download nahi.
  useEffect(
    () => () => {
      const { recorder, frameId } = live.current;
      cancelAnimationFrame(frameId);
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null;
        recorder.stop();
      }
    },
    [],
  );

  return { recording, supported, toggle };
}