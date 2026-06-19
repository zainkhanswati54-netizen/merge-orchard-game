// ---------------------------------------------------------------------------
// FRUIT RENDERER
// ---------------------------------------------------------------------------
// Each tier gets its own little illustration (seeds, leafy crowns, rind
// stripes, stems) instead of a flat gradient circle. Everything is drawn in
// local space centered at the origin with the given radius — drawFruit()
// handles positioning, and the squish/pop scale used during a merge, so the
// individual draw functions stay simple and only worry about how the fruit
// itself looks.
// ---------------------------------------------------------------------------

const ACCENT = {
  leaf: '#4CAF50',
  leafDark: '#2E7D32',
  stem: '#6B4226',
  seed: '#FFE08A',
};

// Public entry point. tier is the TIERS[] entry ({ color, shade, ... }).
// scaleX/scaleY let the caller apply the merge squish-and-pop without every
// fruit-drawing function needing its own copy of that logic.
export function drawFruit(ctx, tier, tierIndex, x, y, radius, scaleX = 1, scaleY = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scaleX, scaleY);

  const drawer = DRAWERS[tierIndex] || drawGenericFruit;
  drawer(ctx, radius, tier);

  ctx.restore();
}

function glossyBody(ctx, r, color, shade, highlightStrength = 0.85) {
  const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.08, 0, 0, r);
  grad.addColorStop(0, `rgba(255,255,255,${highlightStrength})`);
  grad.addColorStop(0.45, color);
  grad.addColorStop(1, shade);

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.045);
  ctx.strokeStyle = 'rgba(0,0,0,0.16)';
  ctx.stroke();
}

// A second, smaller, very bright highlight blob laid on top of the main
// gradient — this is what reads as "glossy" rather than just "shaded."
function shineHighlight(ctx, r) {
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.38, r * 0.28, r * 0.16, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();
}

function stemAndLeaf(ctx, r, { tilt = 0.15 } = {}) {
  // stem
  ctx.save();
  ctx.translate(0, -r * 0.92);
  ctx.rotate(tilt);
  ctx.strokeStyle = ACCENT.stem;
  ctx.lineWidth = Math.max(1.5, r * 0.09);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(r * 0.08, -r * 0.22, r * 0.02, -r * 0.34);
  ctx.stroke();
  ctx.restore();

  // leaf
  ctx.save();
  ctx.translate(r * 0.12, -r * 1.0);
  ctx.rotate(-0.5);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.26, r * 0.13, 0, 0, Math.PI * 2);
  const leafGrad = ctx.createLinearGradient(-r * 0.2, 0, r * 0.2, 0);
  leafGrad.addColorStop(0, ACCENT.leaf);
  leafGrad.addColorStop(1, ACCENT.leafDark);
  ctx.fillStyle = leafGrad;
  ctx.fill();
  ctx.restore();
}

// --- Tier 0: Cherry --------------------------------------------------------
function drawCherry(ctx, r, tier) {
  glossyBody(ctx, r, tier.color, tier.shade);
  shineHighlight(ctx, r);
  stemAndLeaf(ctx, r, { tilt: 0.35 });
}

// --- Tier 1: Strawberry -----------------------------------------------------
const STRAWBERRY_SEEDS = [
  [-0.32, -0.05], [0.1, -0.18], [0.35, 0.05], [-0.1, 0.22], [0.22, 0.35],
  [-0.38, 0.3], [0.0, 0.0], [0.3, -0.32], [-0.22, -0.32],
];
function drawStrawberry(ctx, r, tier) {
  glossyBody(ctx, r, tier.color, tier.shade, 0.75);

  // seeds
  ctx.fillStyle = ACCENT.seed;
  for (const [dx, dy] of STRAWBERRY_SEEDS) {
    ctx.beginPath();
    ctx.ellipse(dx * r, dy * r, r * 0.06, r * 0.09, Math.atan2(dy, dx), 0, Math.PI * 2);
    ctx.fill();
  }

  shineHighlight(ctx, r);

  // leafy star crown at the top
  ctx.fillStyle = ACCENT.leaf;
  const points = 5;
  for (let i = 0; i < points; i++) {
    const angle = -Math.PI / 2 + (i - (points - 1) / 2) * 0.45;
    ctx.save();
    ctx.translate(Math.sin(angle) * r * 0.5, -r * 0.85 + Math.cos(angle) * r * 0.12);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-r * 0.13, -r * 0.32);
    ctx.lineTo(r * 0.13, -r * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// --- Tier 2: Orange ----------------------------------------------------------
const ORANGE_SPECKLES = [
  [-0.3, -0.25], [0.25, -0.15], [0.1, 0.3], [-0.2, 0.2], [0.35, 0.1], [-0.05, -0.35],
];
function drawOrange(ctx, r, tier) {
  glossyBody(ctx, r, tier.color, tier.shade);

  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  for (const [dx, dy] of ORANGE_SPECKLES) {
    ctx.beginPath();
    ctx.arc(dx * r, dy * r, r * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }

  shineHighlight(ctx, r);
  stemAndLeaf(ctx, r, { tilt: 0.1 });
}

// --- Tier 3: Apple -------------------------------------------------------------
function drawApple(ctx, r, tier) {
  // two-tone red/green blend body, glossier than the others
  const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.08, 0, 0, r);
  grad.addColorStop(0, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.4, tier.color);
  grad.addColorStop(0.75, '#C0392B');
  grad.addColorStop(1, tier.shade);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.045);
  ctx.strokeStyle = 'rgba(0,0,0,0.16)';
  ctx.stroke();

  // faint center crease, a classic apple silhouette cue
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.75);
  ctx.quadraticCurveTo(r * 0.1, 0, 0, r * 0.85);
  ctx.stroke();

  shineHighlight(ctx, r);
  stemAndLeaf(ctx, r, { tilt: -0.1 });
}

// --- Tier 4: Watermelon (max tier) ---------------------------------------------
function drawWatermelon(ctx, r, tier) {
  glossyBody(ctx, r, tier.color, tier.shade, 0.7);

  // curved rind stripes
  ctx.strokeStyle = tier.shade;
  ctx.lineWidth = Math.max(2, r * 0.11);
  ctx.lineCap = 'round';
  const stripeOffsets = [-0.62, -0.32, 0, 0.32, 0.62];
  for (const off of stripeOffsets) {
    ctx.beginPath();
    ctx.moveTo(off * r * 0.55, -r * 0.92);
    ctx.quadraticCurveTo(off * r * 1.3, 0, off * r * 0.55, r * 0.92);
    ctx.stroke();
  }

  shineHighlight(ctx, r);

  // small stem nub
  ctx.save();
  ctx.translate(0, -r * 0.95);
  ctx.fillStyle = ACCENT.stem;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.08, r * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGenericFruit(ctx, r, tier) {
  glossyBody(ctx, r, tier.color, tier.shade);
  shineHighlight(ctx, r);
}

const DRAWERS = [drawCherry, drawStrawberry, drawOrange, drawApple, drawWatermelon];
