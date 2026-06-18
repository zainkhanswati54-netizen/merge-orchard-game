import { CONFIG } from './config.js';

// Thin wrapper around Matter.js. Keeping all engine-specific calls in one
// module means the rest of the game never touches Matter directly — if you
// ever swap physics engines, this is the only file that changes.
export class PhysicsWorld {
  constructor() {
    const { Engine, World } = Matter;
    this.engine = Engine.create();
    this.engine.gravity.y = CONFIG.GRAVITY;
    this.world = this.engine.world;
    this._nextId = 1;
    this._buildWalls();
  }

  _buildWalls() {
    const { Bodies, World } = Matter;
    const w = CONFIG.WALL_THICKNESS;
    const boxW = CONFIG.BOX_WIDTH;
    const boxH = CONFIG.BOX_HEIGHT;

    const floor = Bodies.rectangle(boxW / 2, boxH + w / 2, boxW + w * 2, w, {
      isStatic: true,
      friction: CONFIG.FRICTION,
      label: 'wall',
    });
    const left = Bodies.rectangle(-w / 2, boxH / 2, w, boxH * 2, {
      isStatic: true,
      friction: CONFIG.FRICTION,
      label: 'wall',
    });
    const right = Bodies.rectangle(boxW + w / 2, boxH / 2, w, boxH * 2, {
      isStatic: true,
      friction: CONFIG.FRICTION,
      label: 'wall',
    });

    World.add(this.world, [floor, left, right]);
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

  step(dtMs) {
    Matter.Engine.update(this.engine, dtMs);
  }
}
