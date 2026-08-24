/** Prevent noisy context-lost crashes; keep canvas recoverable when possible. */
export const bindWebGLContextRecovery = (gl) => {
  const canvas = gl?.domElement;
  if (!canvas || canvas.dataset.webglRecoveryBound === '1') return;
  canvas.dataset.webglRecoveryBound = '1';
  canvas.addEventListener('webglcontextlost', (event) => event.preventDefault(), false);
};

/** Lighter defaults — fewer GPU context losses when many pages mount header 3D scenes. */
export const conservativeCanvasProps = {
  dpr: [1, 1.15],
  gl: {
    antialias: false,
    alpha: true,
    powerPreference: 'default',
  },
};
