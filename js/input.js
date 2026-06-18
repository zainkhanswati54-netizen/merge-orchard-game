// Unifies keyboard, mouse, touch-drag, and on-screen button input into a
// single small interface: a held left/right intent, and a "drop" event.
// Using Pointer Events for the on-screen buttons means the same code path
// handles mouse, touch, and stylus — important for Android support.
export class InputController {
  constructor(canvas, { onAimToX, onDrop }) {
    this.canvas = canvas;
    this.onAimToX = onAimToX;
    this.onDrop = onDrop;
    this.holdLeft = false;
    this.holdRight = false;

    this._bindKeyboard();
    this._bindCanvasPointer();
    this._bindOnScreenButtons();
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.holdLeft = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.holdRight = true;
      if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'Enter') {
        e.preventDefault();
        this.onDrop();
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.holdLeft = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.holdRight = false;
    });
  }

  // Lets a player on desktop just move the mouse to aim, and click to drop —
  // and on mobile, drag a finger across the jar to aim, tap to drop.
  _bindCanvasPointer() {
    let isDown = false;

    const aimFromEvent = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width / (window.devicePixelRatio || 1);
      const localX = (e.clientX - rect.left) * scaleX;
      this.onAimToX(localX);
    };

    this.canvas.addEventListener('pointermove', (e) => {
      aimFromEvent(e);
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      isDown = true;
      aimFromEvent(e);
    });

    this.canvas.addEventListener('pointerup', (e) => {
      if (isDown) {
        aimFromEvent(e);
        this.onDrop();
      }
      isDown = false;
    });

    // Prevent the page from scrolling/zooming while playing on a touch device.
    this.canvas.style.touchAction = 'none';
  }

  _bindOnScreenButtons() {
    const left = document.getElementById('btn-left');
    const right = document.getElementById('btn-right');
    const drop = document.getElementById('btn-drop');

    const press = (el, setter) => {
      const start = (e) => { e.preventDefault(); setter(true); };
      const end = (e) => { e.preventDefault(); setter(false); };
      el.addEventListener('pointerdown', start);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointerleave', end);
      el.addEventListener('pointercancel', end);
    };

    press(left, (v) => (this.holdLeft = v));
    press(right, (v) => (this.holdRight = v));

    drop.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.onDrop();
    });
  }
}
