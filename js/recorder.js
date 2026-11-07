// Webcam capture: preview, countdown, fixed-length recording (C2-C4).

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const options = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
  return options.find((t) => MediaRecorder.isTypeSupported(t)) || "";
}

export class Recorder {
  constructor() {
    this.stream = null;
    this._cancel = null;
  }

  async open() {
    if (this.stream) return this.stream;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser can't access the camera. Use Chrome or Edge on localhost.");
    }
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      audio: false,
    });
    return this.stream;
  }

  attach(videoEl) {
    if (!videoEl || !this.stream) return;
    videoEl.srcObject = this.stream;
    videoEl.play().catch(() => {});
  }

  /** Records for `seconds`, calling onTick(secondsLeft) each second. Resolves with a video Blob. */
  record(seconds, onTick = () => {}) {
    return new Promise((resolve, reject) => {
      if (!this.stream) return reject(new Error("Camera is not open."));
      const mimeType = pickMimeType();
      let rec;
      try {
        rec = new MediaRecorder(this.stream, { ...(mimeType && { mimeType }), videoBitsPerSecond: 1_500_000 });
      } catch (e) {
        return reject(e);
      }
      const chunks = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || mimeType || "video/webm" }));
      rec.onerror = (e) => reject(e.error || new Error("Recording failed."));
      rec.start(250);

      let left = seconds;
      onTick(left);
      const timer = setInterval(() => {
        left -= 1;
        onTick(left);
        if (left <= 0) stop();
      }, 1000);
      const stop = () => {
        clearInterval(timer);
        this._cancel = null;
        if (rec.state !== "inactive") rec.stop();
      };
      this._cancel = stop;
    });
  }

  close() {
    if (this._cancel) this._cancel();
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}

/** Counts down from n to 1, calling onTick(n) each second. */
export function countdown(n, onTick) {
  return new Promise((resolve) => {
    let left = n;
    onTick(left);
    const timer = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(timer);
        resolve();
      } else {
        onTick(left);
      }
    }, 1000);
  });
}

let audioCtx = null;
export function beep(freq = 880, ms = 150) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + ms / 1000);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + ms / 1000);
  } catch {
    /* sound is optional */
  }
}
