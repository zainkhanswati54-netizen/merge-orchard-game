// Unifies keyboard, mouse, touch-drag, and on-screen button input into a
// single small interface: a held left/right intent, and a "drop" event.
// On-screen buttons removed — canvas tap/swipe handles everything on mobile.
export class InputController {
  constructor(canvas, { onAimToX, onDrop, onFirstInteraction }) {
    this.canvas = canvas;
    this.onAimToX = onAimToX;
    this.onDrop = onDrop;
    this.holdLeft = false;
    this.holdRight = false;

    this._bindFirstInteraction(onFirstInteraction);
    this._bindKeyboard();
    this._bindCanvasPointer();
    this._bindOnScreenButtons();
  }

  // Fires once, on whichever comes first: a touch, a click, or a keypress.
  _bindFirstInteraction(callback) {
    if (!callback) return;
    const fire = () => {
      callback();
      window.removeEventListener('pointerdown', fire, true);
      window.removeEventListener('keydown', fire, true);
    };
    window.addEventListener('pointerdown', fire, true);
    window.addEventListener('keydown', fire, true);
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

  // Mobile: drag finger left/right to aim, tap to drop, swipe down to drop.
  // Desktop: move mouse to aim, click to drop.
  _bindCanvasPointer() {
    let isDown = false;
    let startX = 0;
    let startY = 0;
    let hasMoved = false;
    const SWIPE_DOWN_THRESHOLD = 30; // px swipe down triggers drop
    const MOVE_THRESHOLD = 6;        // px before counted as intentional drag

    const aimFromEvent = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const scaleX = this.canvas.width / rect.width / dpr;
      const localX = (e.clientX - rect.left) * scaleX;
      this.onAimToX(localX);
    };

    // pointermove on document so dragging outside canvas still aims correctly
    document.addEventListener('pointermove', (e) => {
      if (!isDown) return;
      const dy = e.clientY - startY;
      const dx = Math.abs(e.clientX - startX);
      if (Math.abs(dy) > MOVE_THRESHOLD || dx > MOVE_THRESHOLD) hasMoved = true;
      aimFromEvent(e);
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      isDown = true;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;
      aimFromEvent(e);
      this.canvas.setPointerCapture(e.pointerId);
    });

    this.canvas.addEventListener('pointerup', (e) => {
      if (!isDown) return;
      const dy = e.clientY - startY;
      const swipedDown = dy > SWIPE_DOWN_THRESHOLD;

      // Tap (no significant movement) OR swipe down → drop
      if (!hasMoved || swipedDown) {
        aimFromEvent(e);
        this.onDrop();
      }
      isDown = false;
      hasMoved = false;
    });

    this.canvas.addEventListener('pointercancel', () => {
      isDown = false;
      hasMoved = false;
    });

    this.canvas.style.touchAction = 'none';
  }

  _bindOnScreenButtons() {
    // Buttons removed — canvas tap/swipe handles everything on mobile.
    // This method kept so nothing breaks if called.
  }
}
