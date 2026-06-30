import { CONFIG } from './config.js';

// Thin wrapper around Matter.js. Keeping all engine-specific calls in one
// module means the rest of the game never touches Matter directly — if you
// ever swap physics engines, this is the only file that changes.
export class PhysicsWorld {
  // playWidthScale narrows the interior walls for harder themes (e.g.
  // Winter Berry Blast) while the outer canvas/jar visual stays the same
  // CONFIG.BOX_WIDTH — the margin on each side is just dead space outside
  // the walls, drawn as part of the jar background.
  constructor(playWidthScale = 1) {
    const { Engine } = Matter;
    this.engine = Engine.create();
    this.engine.gravity.y = CONFIG.GRAVITY;
    this.world = this.engine.world;
    this._nextId = 1;

    this.playWidth = CONFIG.BOX_WIDTH * playWidthScale;
    this.marginLeft = (CONFIG.BOX_WIDTH - this.playWidth) / 2;
    this.marginRight = this.marginLeft;

    this._windPhase = Math.random() * Math.PI * 2; // randomized so repeated runs don't sync up
    this._buildWalls();
  }

  _buildWalls() {
    const { Bodies, World } = Matter;
    const w = CONFIG.WALL_THICKNESS;
    const boxH = CONFIG.BOX_HEIGHT;
    const left = this.marginLeft;
    const right = CONFIG.BOX_WIDTH - this.marginRight;

    const floor = Bodies.rectangle((left + right) / 2, boxH + w / 2, this.playWidth + w * 2, w, {
      isStatic: true,
      friction: CONFIG.FRICTION,
      label: 'wall',
    });
    const leftWall = Bodies.rectangle(left - w / 2, boxH / 2, w, boxH * 2, {
      isStatic: true,
      friction: CONFIG.FRICTION,
      label: 'wall',
    });
    const rightWall = Bodies.rectangle(right + w / 2, boxH / 2, w, boxH * 2, {
      isStatic: true,
      friction: CONFIG.FRICTION,
      label: 'wall',
    });

    World.add(this.world, [floor, leftWall, rightWall]);
  }

  // Inclusive playable X bounds, for clamping the dropper and drop position.
  get playLeft() {
    return this.marginLeft;
  }
  get playRight() {
    return CONFIG.BOX_WIDTH - this.marginRight;
  }

  // Spawns a dynamic circular body for the given tier index at (x, y).
  addItem(x, y, tierIndex, radius) {
    const { Bodies, World } = Matter;
    const body = Bodies.circle(x, y, radius, {
      restitution: CONFIG.RESTITUTION,
      friction: CONFIG.FRICTION,
      frictionAir: CONFIG.FRICTION_AIR,
      frictionStatic: CONFIG.FRICTION_STATIC,
      label: 'item',
    });
    body.tier = tierIndex;
    body.itemId = this._nextId++;
    body.spawnTime = performance.now();
    body.hasLanded = false; // used by game.js to fire the landing-squash effect exactly once
    World.add(this.world, body);
    return body;
  }

  removeBody(body) {
    Matter.World.remove(this.world, body);
  }

  getItemBodies() {
    return Matter.Composite.allBodies(this.world).filter((b) => b.label === 'item');
  }

  onCollisionStart(handler) {
    Matter.Events.on(this.engine, 'collisionStart', (event) => handler(event.pairs));
  }

  // Applies a gentle, continuously-oscillating horizontal force to every
  // item in play — a "breeze" that nudges fruit sideways without ever
  // overpowering player control. strength of 0 is a true no-op (classic
  // theme), so this is safe to call unconditionally every frame.
  applyWind(strength, dtMs) {
    if (!strength) return;
    this._windPhase += dtMs * 0.0014;
    const gust = Math.sin(this._windPhase) * strength;
    for (const body of this.getItemBodies()) {
      Matter.Body.applyForce(body, body.position, { x: gust * body.mass * 0.02, y: 0 });
    }
  }

  step(dtMs) {
    Matter.Engine.update(this.engine, dtMs);
  }
}
