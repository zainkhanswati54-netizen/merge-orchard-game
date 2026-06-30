// ---------------------------------------------------------------------------
// FRUIT RENDERER
// ---------------------------------------------------------------------------
// Each fruit "kind" (cherry, mango, holly, ...) gets its own little canvas
// illustration instead of a flat gradient circle. Looked up by `kind` string
// (set per-tier in js/themes.js) rather than tier index, so any theme can
// mix and match fruits freely, and an unrecognized kind safely falls back to
// a plain glossy circle instead of crashing the renderer.
//
// Everything draws in local space centered at the origin with the given
// radius — drawFruit() handles positioning plus the merge squish/pop scale,
// so individual draw functions only worry about how the fruit itself looks.
// ---------------------------------------------------------------------------

const ACCENT = {
  leaf: '#4CAF50',
  leafDark: '#2E7D32',
  stem: '#6B4226',
  seed: '#FFE08A',
};

// Public entry point. tier is a theme's tier entry ({ color, shade, kind, ... }).
// scaleX/scaleY let the caller apply the merge squish-and-pop (or landing
// squash) without every fruit-drawing function needing its own copy of that
// logic.
export function drawFruit(ctx, tier, kind, x, y, radius, scaleX = 1, scaleY = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scaleX, scaleY);

  const drawer = DRAWERS[kind] || drawGenericFruit;
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

// === CLASSIC ORCHARD ========================================================

function drawSeed(ctx, r, tier) {
  // A small glossy orchard seed with a tiny green sprout just breaking
  // through — the very beginning of the merge chain, thematically tying
  // into "every merge restores a little more life to the orchard."
  glossyBody(ctx, r, tier.color, tier.shade, 0.7);

  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, r * 0.1);
  ctx.quadraticCurveTo(0, -r * 0.2, r * 0.3, r * 0.1);
  ctx.stroke();

  // tiny sprout poking out the top
  ctx.save();
  ctx.translate(0, -r * 0.85);
  ctx.fillStyle = ACCENT.leaf;
  ctx.beginPath();
  ctx.ellipse(-r * 0.08, 0, r * 0.16, r * 0.08, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.08, -r * 0.02, r * 0.16, r * 0.08, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  shineHighlight(ctx, r);
}

function drawCherry(ctx, r, tier) {
  glossyBody(ctx, r, tier.color, tier.shade);
  shineHighlight(ctx, r);
  stemAndLeaf(ctx, r, { tilt: 0.35 });
}

const STRAWBERRY_SEEDS = [
  [-0.32, -0.05], [0.1, -0.18], [0.35, 0.05], [-0.1, 0.22], [0.22, 0.35],
  [-0.38, 0.3], [0.0, 0.0], [0.3, -0.32], [-0.22, -0.32],
];
function drawStrawberry(ctx, r, tier) {
  glossyBody(ctx, r, tier.color, tier.shade, 0.75);

  ctx.fillStyle = ACCENT.seed;
  for (const [dx, dy] of STRAWBERRY_SEEDS) {
    ctx.beginPath();
    ctx.ellipse(dx * r, dy * r, r * 0.06, r * 0.09, Math.atan2(dy, dx), 0, Math.PI * 2);
    ctx.fill();
  }

  shineHighlight(ctx, r);

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

function drawApple(ctx, r, tier) {
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

  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.75);
  ctx.quadraticCurveTo(r * 0.1, 0, 0, r * 0.85);
  ctx.stroke();

  shineHighlight(ctx, r);
  stemAndLeaf(ctx, r, { tilt: -0.1 });
}

function drawWatermelon(ctx, r, tier) {
  glossyBody(ctx, r, tier.color, tier.shade, 0.7);

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

  ctx.save();
  ctx.translate(0, -r * 0.95);
  ctx.fillStyle = ACCENT.stem;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.08, r * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGoldenPear(ctx, r, tier) {
  // Pear-ish silhouette (narrower top, wider bottom) via two overlapping
  // circles rather than a perfectly round body — visually distinct from
  // the watermelon it grows from, with a warm golden glow befitting a
  // "restored" higher tier.
  ctx.save();
  const topR = r * 0.62;
  const botR = r * 0.92;
  const topCY = -r * 0.32;
  const botCY = r * 0.18;

  ctx.beginPath();
  ctx.arc(0, botCY, botR, 0, Math.PI * 2);
  ctx.closePath();
  const grad = ctx.createRadialGradient(-r * 0.3, topCY - r * 0.1, r * 0.08, 0, botCY, botR);
  grad.addColorStop(0, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.45, tier.color);
  grad.addColorStop(1, tier.shade);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, topCY, topR, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.strokeStyle = 'rgba(0,0,0,0.14)';
  ctx.beginPath();
  ctx.arc(0, botCY, botR, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.restore();

  // soft golden speckles
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  const speckles = [[-0.25, 0.0], [0.22, -0.15], [0.05, 0.35], [-0.3, 0.4], [0.3, 0.3]];
  for (const [dx, dy] of speckles) {
    ctx.beginPath();
    ctx.arc(dx * r, dy * r, r * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }

  shineHighlight(ctx, r);
  stemAndLeaf(ctx, r, { tilt: -0.15 });
}

function drawEternalPumpkin(ctx, r, tier) {
  // The final, "legendary" tier — a glowing orchard pumpkin with carved
  // ridges and an inner radiant core, marking it clearly as the capstone
  // of the merge chain.
  glossyBody(ctx, r, tier.color, tier.shade, 0.8);

  // carved vertical ridges, like a pumpkin
  ctx.strokeStyle = tier.shade;
  ctx.lineWidth = Math.max(1.5, r * 0.05);
  ctx.lineCap = 'round';
  const ridgeOffsets = [-0.66, -0.34, 0, 0.34, 0.66];
  for (const off of ridgeOffsets) {
    ctx.beginPath();
    ctx.moveTo(off * r * 0.5, -r * 0.88);
    ctx.quadraticCurveTo(off * r * 1.18, 0, off * r * 0.5, r * 0.88);
    ctx.stroke();
  }

  // inner radiant "life energy" glow core
  const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.5);
  coreGrad.addColorStop(0, 'rgba(255,255,200,0.9)');
  coreGrad.addColorStop(1, 'rgba(255,255,200,0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
  ctx.fill();

  shineHighlight(ctx, r);

  // stem crown
  ctx.save();
  ctx.translate(0, -r * 0.95);
  ctx.fillStyle = ACCENT.stem;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.1, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// === TROPICAL PARADISE ======================================================

function drawMango(ctx, r, tier) {
  // warm yellow-to-blush gradient, slightly egg-shaped via a wider radial
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.08, r * 0.1, r * 0.1, r * 1.05);
  grad.addColorStop(0, 'rgba(255,255,255,0.8)');
  grad.addColorStop(0.35, '#FFE08A');
  grad.addColorStop(0.7, tier.color);
  grad.addColorStop(1, '#D9472B'); // red blush toward one edge
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.045);
  ctx.strokeStyle = 'rgba(0,0,0,0.16)';
  ctx.stroke();

  shineHighlight(ctx, r);
  stemAndLeaf(ctx, r, { tilt: 0.2 });
}

function drawCoconut(ctx, r, tier) {
  glossyBody(ctx, r, tier.color, tier.shade, 0.55);

  // fibrous "hairy" texture — short dark strokes radiating from center
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.lineCap = 'round';
  const hairCount = 14;
  for (let i = 0; i < hairCount; i++) {
    const angle = (i / hairCount) * Math.PI * 2 + 0.3;
    const innerR = r * 0.35;
    const outerR = r * 0.92;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
    ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
    ctx.stroke();
  }

  // three germination pores near the top — a coconut's signature "face"
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  const poreOffsets = [[-0.16, -0.55], [0.16, -0.55], [0, -0.32]];
  for (const [dx, dy] of poreOffsets) {
    ctx.beginPath();
    ctx.ellipse(dx * r, dy * r, r * 0.07, r * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  shineHighlight(ctx, r);
}

function drawPineapple(ctx, r, tier) {
  glossyBody(ctx, r, tier.color, tier.shade);

  // diamond crosshatch rind texture
  ctx.strokeStyle = 'rgba(0,0,0,0.14)';
  ctx.lineWidth = Math.max(1, r * 0.035);
  const step = r * 0.4;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.97, 0, Math.PI * 2);
  ctx.clip();
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-r * 1.2, i * step);
    ctx.lineTo(r * 1.2, i * step + r * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 1.2, i * step);
    ctx.lineTo(r * 1.2, i * step - r * 0.7);
    ctx.stroke();
  }
  ctx.restore();

  shineHighlight(ctx, r);

  // spiky leaf crown
  ctx.fillStyle = ACCENT.leaf;
  const spikes = 5;
  for (let i = 0; i < spikes; i++) {
    const angle = -Math.PI / 2 + (i - (spikes - 1) / 2) * 0.4;
    ctx.save();
    ctx.translate(Math.sin(angle) * r * 0.3, -r * 0.92);
    ctx.rotate(angle * 0.6);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-r * 0.1, -r * 0.5);
    ctx.lineTo(r * 0.1, -r * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawDragonfruit(ctx, r, tier) {
  glossyBody(ctx, r, tier.color, tier.shade, 0.7);

  // triangular green "scales" around the rim — dragonfruit's signature look
  ctx.fillStyle = ACCENT.leaf;
  const scaleCount = 9;
  for (let i = 0; i < scaleCount; i++) {
    const angle = (i / scaleCount) * Math.PI * 2;
    ctx.save();
    ctx.rotate(angle);
    ctx.translate(0, -r * 0.98);
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, 0);
    ctx.lineTo(r * 0.1, 0);
    ctx.lineTo(0, -r * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // a few small dark seed-flecks for texture
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  const flecks = [[-0.2, 0.1], [0.15, -0.1], [0.05, 0.3], [-0.1, -0.3]];
  for (const [dx, dy] of flecks) {
    ctx.beginPath();
    ctx.arc(dx * r, dy * r, r * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }

  shineHighlight(ctx, r);
}

// === WINTER BERRY BLAST ======================================================

function drawHolly(ctx, r, tier) {
  // small spiky holly-leaf silhouette behind a cluster of red berries
  ctx.save();
  ctx.fillStyle = ACCENT.leaf;
  ctx.beginPath();
  const spikes = 6;
  for (let i = 0; i <= spikes; i++) {
    const angle = (i / spikes) * Math.PI * 2;
    const rad = i % 2 === 0 ? r * 0.95 : r * 0.65;
    const px = Math.cos(angle) * rad;
    const py = Math.sin(angle) * rad * 0.85 - r * 0.1;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.strokeStyle = ACCENT.leafDark;
  ctx.stroke();
  ctx.restore();

  // berry cluster on top
  const berryColor = tier.color;
  const berryOffsets = [[-0.18, -0.05], [0.18, -0.05], [0, 0.2]];
  for (const [dx, dy] of berryOffsets) {
    const bx = dx * r;
    const by = dy * r;
    const br = r * 0.32;
    const grad = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.3, br * 0.1, bx, by, br);
    grad.addColorStop(0, 'rgba(255,255,255,0.8)');
    grad.addColorStop(0.5, berryColor);
    grad.addColorStop(1, tier.shade);
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

function drawBlueberry(ctx, r, tier) {
  glossyBody(ctx, r, tier.color, tier.shade, 0.6);
  shineHighlight(ctx, r);

  // signature 5-point "crown" calyx mark at the top
  ctx.save();
  ctx.translate(0, -r * 0.05);
  ctx.strokeStyle = 'rgba(20,20,40,0.45)';
  ctx.lineWidth = Math.max(1, r * 0.045);
  ctx.lineCap = 'round';
  const points = 5;
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * r * 0.22, Math.sin(angle) * r * 0.22);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCranberry(ctx, r, tier) {
  glossyBody(ctx, r, tier.color, tier.shade, 0.8);
  shineHighlight(ctx, r);

  // small blossom-end dimple, cranberries' tell-tale mark
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.arc(0, r * 0.78, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawFrozenMelon(ctx, r, tier) {
  // icy blue-white gradient, brighter/cooler than the classic watermelon
  const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.08, 0, 0, r);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.4, tier.color);
  grad.addColorStop(1, tier.shade);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.045);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.stroke();

  // jagged frost-crack lines across the surface
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.lineCap = 'round';
  const cracks = [
    [[-0.5, -0.2], [-0.1, -0.4], [0.2, -0.15]],
    [[0.1, 0.1], [0.4, 0.0], [0.55, 0.3]],
    [[-0.3, 0.3], [-0.5, 0.55]],
  ];
  for (const path of cracks) {
    ctx.beginPath();
    path.forEach(([dx, dy], i) => {
      const px = dx * r;
      const py = dy * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }

  shineHighlight(ctx, r);

  // small ice-crystal stub on top, in place of a stem
  ctx.save();
  ctx.translate(0, -r * 0.95);
  ctx.fillStyle = '#E0F7FA';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.16);
  ctx.lineTo(r * 0.07, 0);
  ctx.lineTo(-r * 0.07, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGenericFruit(ctx, r, tier) {
  glossyBody(ctx, r, tier.color, tier.shade);
  shineHighlight(ctx, r);
}

const DRAWERS = {
  seed: drawSeed,
  cherry: drawCherry,
  strawberry: drawStrawberry,
  orange: drawOrange,
  apple: drawApple,
  watermelon: drawWatermelon,
  goldenpear: drawGoldenPear,
  eternalpumpkin: drawEternalPumpkin,
  mango: drawMango,
  coconut: drawCoconut,
  pineapple: drawPineapple,
  dragonfruit: drawDragonfruit,
  holly: drawHolly,
  blueberry: drawBlueberry,
  cranberry: drawCranberry,
  frozenmelon: drawFrozenMelon,
};
