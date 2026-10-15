// One Euro filter: dheere chalne par zyada smooth, tez chalne par kam lag.
const alpha = (dt, cutoff) => {
  const r = 2 * Math.PI * cutoff * dt;
  return r / (r + 1);
};

export class OneEuroFilter {
  // minCutoff: kam = zyada smooth (dheere hilne par)
  // beta:      zyada = tez harkat par kam lag
  constructor({ minCutoff = 1, beta = 0, dCutoff = 1 } = {}) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.reset();
  }

  reset() {
    this.prev = null; // pichli smooth value
    this.prevDelta = 0; // pichli smooth raftaar
    this.prevTime = null;
  }

  // value = naya reading, time = seconds mein
  filter(value, time) {
    if (this.prev === null) {
      this.prev = value;
      this.prevTime = time;
      return value;
    }

    const dt = Math.max(time - this.prevTime, 1e-3);
    this.prevTime = time;

    const delta = (value - this.prev) / dt;
    const dA = alpha(dt, this.dCutoff);
    const smoothDelta = dA * delta + (1 - dA) * this.prevDelta;
    this.prevDelta = smoothDelta;

    const cutoff = this.minCutoff + this.beta * Math.abs(smoothDelta);
    const a = alpha(dt, cutoff);
    this.prev = a * value + (1 - a) * this.prev;
    return this.prev;
  }
}