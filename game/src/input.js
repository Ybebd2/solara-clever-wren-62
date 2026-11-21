// SOLARA — input: keyboard state, mouse-drag orbit, and one-shot key presses.
// Written fresh from the R5-mirror spec.

export const keys = {};
export const pressed = {}; // one-shot: true only on the frame the key went down
export const orbit = { dx: 0, dy: 0, dragging: false };

let lastX = 0;
let lastY = 0;

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys[e.code] = true;
    pressed[e.code] = true;
    if (e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });
  window.addEventListener('blur', () => {
    for (const k of Object.keys(keys)) keys[k] = false;
  });
  canvas.addEventListener('pointerdown', (e) => {
    orbit.dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!orbit.dragging) return;
    orbit.dx += e.clientX - lastX;
    orbit.dy += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  const endDrag = () => { orbit.dragging = false; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
}

// Call at the end of every frame: clears one-shot presses.
export function endFrameInput() {
  for (const k of Object.keys(pressed)) pressed[k] = false;
  orbit.dx = 0;
  orbit.dy = 0;
}

export function consume(code) {
  if (pressed[code]) {
    pressed[code] = false;
    return true;
  }
  return false;
}
