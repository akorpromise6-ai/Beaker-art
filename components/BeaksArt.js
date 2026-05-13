import { useState, useEffect, useRef, useCallback } from "react";

const PALETTES = [
  { bg: "#f4a7b9", skin: "#2d1b3d", beak: ["#e8a87c", "#c97b4b"], hat: "#4a2d7a", cloth: "#3d2060", accent: "#c9a0e8", dot: "#6b3fa0" },
  { bg: "#7eb8d4", skin: "#1a2e1a", beak: ["#e8c87c", "#c9a84b"], hat: "#1a3a2a", cloth: "#2d5a3d", accent: "#a0d4c8", dot: "#4a8a6a" },
  { bg: "#d4a0c8", skin: "#2a1a0e", beak: ["#e86060", "#c04040"], hat: "#6a1a2a", cloth: "#4a1a1a", accent: "#e8a0a0", dot: "#9a3040" },
  { bg: "#f0e0a0", skin: "#1a1a2d", beak: ["#80c0e8", "#4090c0"], hat: "#1a1a4a", cloth: "#1a2a4a", accent: "#a0b8e8", dot: "#3050a0" },
  { bg: "#a0d4a0", skin: "#2d1a2d", beak: ["#e8d080", "#c0a840"], hat: "#4a1a5a", cloth: "#6a2a7a", accent: "#d0a0e8", dot: "#7a40a0" },
];

const BEAK_VARIANTS = [
  { topLift: -0.3, tipDrop: 0.45, lowerArc: 0.2 },
  { topLift: -0.22, tipDrop: 0.55, lowerArc: 0.26 },
  { topLift: -0.35, tipDrop: 0.5, lowerArc: 0.16 },
];

const HAT_FEATHERS = [
  [{ x: 0, y: -1.0 }, { x: 0.2, y: -1.4 }, { x: -0.1, y: -1.6 }, { x: 0.3, y: -1.2 }],
  [{ x: -0.1, y: -0.9 }, { x: 0.15, y: -1.5 }, { x: -0.2, y: -1.3 }, { x: 0.35, y: -1.1 }],
  [{ x: 0.05, y: -1.1 }, { x: -0.15, y: -1.6 }, { x: 0.25, y: -1.4 }],
];
const NOISE_PARTICLE_COUNT = 2500;
const NECKLACE_BEAD_COUNT = 18;

function drawStipple(ctx, x, y, r, color, rng, density = 40, minRadius = 0.25, maxRadius = 1.4) {
  ctx.fillStyle = color;
  for (let i = 0; i < density; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = Math.sqrt(rng()) * r;
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;
    ctx.beginPath();
    ctx.arc(px, py, rng() * (maxRadius - minRadius) + minRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function createSeededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function drawCrossHatch(ctx, x, y, w, h, color, spacing = 8, alpha = 0.22) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.6;
  ctx.globalAlpha = alpha;
  for (let i = -h; i < w + h; i += spacing) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i - h, y + h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + h, y + h);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawContourLines(ctx, cx, cy, radius, color, count = 7) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < count; i++) {
    const arcR = radius * (0.35 + i * 0.08);
    ctx.beginPath();
    ctx.ellipse(cx - radius * 0.08 + i * 0.7, cy - radius * 0.05 + i * 0.4, arcR, arcR * 0.78, -0.22, -0.1, Math.PI * 1.2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function generateBeak(seed) {
  const rng = createSeededRandom(seed);

  const paletteIndex = Math.floor(rng() * PALETTES.length);
  const palette = PALETTES[paletteIndex];
  const beakIdx = Math.floor(rng() * BEAK_VARIANTS.length);
  const hatFeatherIdx = Math.floor(rng() * HAT_FEATHERS.length);
  const hasNecklace = rng() > 0.4;
  const hasFlower = rng() > 0.55;
  const hasEyepatch = rng() > 0.76;
  const clothStripes = rng() > 0.35;
  const hatTilt = (rng() - 0.5) * 12;
  const beakTilt = rng() * 16 - 4;
  const flowerColors = ["#ffffff", "#f8e0f0", "#e0f0e8"];
  const flowerColor = flowerColors[Math.floor(rng() * flowerColors.length)];

  return { palette, paletteIndex, beakIdx, hatFeatherIdx, hasNecklace, hasFlower, hasEyepatch, clothStripes, hatTilt, beakTilt, flowerColor, rng };
}

function drawCurvedBeak(ctx, startX, startY, scale, palette, rng, variant) {
  const tipX = startX + scale * 1.42;
  const tipY = startY + scale * variant.tipDrop;
  const upperPath = new Path2D();
  upperPath.moveTo(startX, startY);
  upperPath.bezierCurveTo(startX + scale * 0.35, startY + scale * variant.topLift, startX + scale * 1.02, startY + scale * 0.02, tipX, tipY);
  upperPath.bezierCurveTo(startX + scale * 1.05, startY + scale * 0.68, startX + scale * 0.5, startY + scale * 0.72, startX + scale * 0.12, startY + scale * 0.52);
  upperPath.closePath();

  const lowerPath = new Path2D();
  lowerPath.moveTo(startX + scale * 0.13, startY + scale * 0.5);
  lowerPath.bezierCurveTo(startX + scale * 0.52, startY + scale * (0.88 + variant.lowerArc), startX + scale * 0.95, startY + scale * 0.76, startX + scale * 1.2, startY + scale * 0.62);
  lowerPath.bezierCurveTo(startX + scale * 0.86, startY + scale * 0.95, startX + scale * 0.35, startY + scale * 0.9, startX + scale * 0.08, startY + scale * 0.65);
  lowerPath.closePath();

  const upperGrad = ctx.createLinearGradient(startX, startY, tipX, tipY);
  upperGrad.addColorStop(0, palette.beak[0]);
  upperGrad.addColorStop(0.55, "#efd292");
  upperGrad.addColorStop(1, palette.beak[1]);
  ctx.fillStyle = upperGrad;
  ctx.fill(upperPath);

  const lowerGrad = ctx.createLinearGradient(startX, startY + scale * 0.4, tipX, tipY + scale * 0.2);
  lowerGrad.addColorStop(0, "rgba(80,50,10,0.25)");
  lowerGrad.addColorStop(0.6, "rgba(40,20,5,0.25)");
  lowerGrad.addColorStop(1, "rgba(20,8,0,0.35)");
  ctx.fillStyle = lowerGrad;
  ctx.fill(lowerPath);

  ctx.strokeStyle = "rgba(70,35,0,0.35)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(startX + scale * 0.2, startY + scale * 0.52);
  ctx.bezierCurveTo(startX + scale * 0.58, startY + scale * 0.38, startX + scale * 1.0, startY + scale * 0.42, startX + scale * 1.18, startY + scale * 0.56);
  ctx.stroke();

  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 6; i++) {
    const offset = i * scale * 0.08;
    ctx.beginPath();
    ctx.moveTo(startX + scale * 0.24 + offset * 0.15, startY + scale * 0.12 + offset * 0.25);
    ctx.quadraticCurveTo(startX + scale * 0.82, startY + scale * 0.16 + offset * 0.2, startX + scale * 1.2, startY + scale * 0.5 + offset * 0.05);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  drawStipple(ctx, startX + scale * 0.78, startY + scale * 0.52, scale * 0.36, "rgba(120,70,20,0.28)", rng, 42, 0.2, 1.2);
}

function drawCharacter(canvas, seed) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const { palette, beakIdx, hatFeatherIdx, hasNecklace, hasFlower, hasEyepatch, clothStripes, hatTilt, beakTilt, flowerColor, rng } = generateBeak(seed);

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, W, H);

  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, "rgba(255,255,255,0.08)");
  bgGrad.addColorStop(1, "rgba(0,0,0,0.1)");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const vignette = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.24, W / 2, H / 2, H * 0.86);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < NOISE_PARTICLE_COUNT; i++) {
    ctx.fillStyle = `rgba(${rng() > 0.54 ? 255 : 0},${rng() > 0.45 ? 255 : 0},${rng() > 0.4 ? 255 : 0},0.02)`;
    ctx.fillRect(rng() * W, rng() * H, 1, 1);
  }

  const cx = W * 0.43;
  const cy = H * 0.52;
  const headR = W * 0.175;

  ctx.save();
  ctx.translate(cx, cy + headR * 1.18);

  const torsoGrad = ctx.createLinearGradient(-headR * 1.6, -headR * 0.2, headR * 1.7, headR * 2.25);
  torsoGrad.addColorStop(0, palette.cloth);
  torsoGrad.addColorStop(0.5, "#244734");
  torsoGrad.addColorStop(1, "#193724");

  ctx.fillStyle = torsoGrad;
  ctx.beginPath();
  ctx.moveTo(-headR * 1.75, headR * 0.05);
  ctx.quadraticCurveTo(-headR * 1.5, headR * 1.1, -headR * 1.25, headR * 1.8);
  ctx.lineTo(headR * 1.25, headR * 1.8);
  ctx.quadraticCurveTo(headR * 1.5, headR * 1.1, headR * 1.75, headR * 0.05);
  ctx.quadraticCurveTo(headR * 1.15, -headR * 0.25, 0, -headR * 0.18);
  ctx.quadraticCurveTo(-headR * 1.15, -headR * 0.25, -headR * 1.75, headR * 0.05);
  ctx.closePath();
  ctx.fill();

  if (clothStripes) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-headR * 1.7, 0);
    ctx.quadraticCurveTo(0, -headR * 0.35, headR * 1.7, 0);
    ctx.lineTo(headR * 1.35, headR * 1.82);
    ctx.lineTo(-headR * 1.35, headR * 1.82);
    ctx.closePath();
    ctx.clip();
    drawCrossHatch(ctx, -headR * 1.8, -headR * 0.4, headR * 3.6, headR * 2.3, "rgba(200,250,220,0.6)", 9, 0.2);
    ctx.restore();
  }

  ctx.fillStyle = "#f2e8d5";
  ctx.beginPath();
  ctx.moveTo(-headR * 0.86, -headR * 0.08);
  ctx.quadraticCurveTo(-headR * 0.64, headR * 0.65, -headR * 0.03, headR * 0.42);
  ctx.lineTo(-headR * 0.17, headR * 0.06);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(headR * 0.86, -headR * 0.08);
  ctx.quadraticCurveTo(headR * 0.64, headR * 0.65, headR * 0.03, headR * 0.42);
  ctx.lineTo(headR * 0.17, headR * 0.06);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.cloth;
  ctx.beginPath();
  ctx.moveTo(-headR * 1.0, -headR * 0.12);
  ctx.quadraticCurveTo(-headR * 0.82, headR * 0.72, -headR * 0.08, headR * 0.48);
  ctx.lineTo(-headR * 0.23, headR * 0.04);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(headR * 1.0, -headR * 0.12);
  ctx.quadraticCurveTo(headR * 0.82, headR * 0.72, headR * 0.08, headR * 0.48);
  ctx.lineTo(headR * 0.23, headR * 0.04);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(20,45,30,0.75)";
  ctx.beginPath();
  ctx.moveTo(-headR * 0.2, headR * 0.02);
  ctx.lineTo(headR * 0.2, headR * 0.02);
  ctx.lineTo(headR * 0.32, headR * 1.25);
  ctx.lineTo(-headR * 0.32, headR * 1.25);
  ctx.closePath();
  ctx.fill();

  for (let b = 0; b < 5; b++) {
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.arc(0, headR * (0.15 + b * 0.24), headR * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  if (hasNecklace) {
    ctx.save();
    ctx.translate(cx, cy + headR * 1.02);
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i <= NECKLACE_BEAD_COUNT; i++) {
      const t = (i / NECKLACE_BEAD_COUNT) * Math.PI;
      const bx = Math.cos(t + Math.PI) * headR * 0.83;
      const by = Math.sin(t + Math.PI) * headR * 0.28 + headR * 0.1;
      if (i === 0) ctx.moveTo(bx, by);
      else ctx.lineTo(bx, by);
    }
    ctx.stroke();

    for (let i = 0; i <= NECKLACE_BEAD_COUNT; i++) {
      const t = (i / NECKLACE_BEAD_COUNT) * Math.PI;
      const bx = Math.cos(t + Math.PI) * headR * 0.83;
      const by = Math.sin(t + Math.PI) * headR * 0.28 + headR * 0.1;
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 ? palette.accent : "#e8f5ef";
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(cx, cy);

  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(headR * 0.18, headR * 0.15, headR * 1.04, headR * 1.0, 0.06, 0, Math.PI * 2);
  ctx.fill();

  const headGrad = ctx.createRadialGradient(-headR * 0.25, -headR * 0.28, headR * 0.25, 0, 0, headR * 1.02);
  headGrad.addColorStop(0, "#30523e");
  headGrad.addColorStop(0.45, palette.skin);
  headGrad.addColorStop(1, "#102315");
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(0, 0, headR, 0, Math.PI * 2);
  ctx.fill();

  drawStipple(ctx, 0, 0, headR * 0.94, palette.dot, rng, 190, 0.2, 1.1);
  drawStipple(ctx, -headR * 0.1, -headR * 0.1, headR * 0.68, "rgba(190,255,220,0.25)", rng, 80, 0.15, 0.9);

  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.beginPath();
  ctx.arc(-headR * 0.16, -headR * 0.2, headR * 0.48, 0, Math.PI * 2);
  ctx.fill();

  drawContourLines(ctx, 0, 0, headR, "rgba(215,255,235,0.6)", 7);

  for (let i = -4; i <= 4; i++) {
    ctx.fillStyle = palette.dot;
    ctx.save();
    ctx.translate(i * headR * 0.115, -headR * 0.75);
    ctx.rotate(i * 0.08);
    ctx.beginPath();
    ctx.ellipse(0, 0, headR * 0.06, headR * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = "rgba(245,252,246,0.98)";
  ctx.beginPath();
  ctx.ellipse(-headR * 0.22, -headR * 0.12, headR * 0.19, headR * 0.14, -0.06, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1a0a00";
  ctx.beginPath();
  ctx.arc(-headR * 0.2, -headR * 0.11, headR * 0.09, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(-headR * 0.245, -headR * 0.15, headR * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-headR * 0.19, -headR * 0.085, headR * 0.018, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(20,5,0,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-headR * 0.38, -headR * 0.23);
  ctx.quadraticCurveTo(-headR * 0.2, -headR * 0.34, -headR * 0.03, -headR * 0.25);
  ctx.stroke();

  if (hasEyepatch) {
    ctx.fillStyle = "rgba(30,10,10,0.9)";
    ctx.beginPath();
    ctx.ellipse(headR * 0.2, -headR * 0.1, headR * 0.2, headR * 0.15, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8b6914";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(headR * 0.0, -headR * 0.25);
    ctx.lineTo(headR * 0.1, -headR * 0.0);
    ctx.stroke();
  }

  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((beakTilt * Math.PI) / 180);

  const beakScale = headR * 0.92;
  const beakStartX = headR * 0.2;
  const beakStartY = headR * 0.02;
  drawCurvedBeak(ctx, beakStartX, beakStartY, beakScale, palette, rng, BEAK_VARIANTS[beakIdx]);

  ctx.restore();

  if (hasFlower) {
    ctx.save();
    ctx.translate(cx + headR * 0.82, cy + headR * 0.42);
    for (let p = 0; p < 6; p++) {
      ctx.fillStyle = flowerColor;
      ctx.save();
      ctx.rotate((p / 6) * Math.PI * 2);
      ctx.beginPath();
      ctx.ellipse(headR * 0.14, 0, headR * 0.1, headR * 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = "#f5d070";
    ctx.beginPath();
    ctx.arc(0, 0, headR * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(cx, cy - headR * 0.78);
  ctx.rotate((hatTilt * Math.PI) / 180);

  ctx.fillStyle = "rgba(0,0,0,0.23)";
  ctx.beginPath();
  ctx.ellipse(headR * 0.1, headR * 0.09, headR * 1.48, headR * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  const brimGrad = ctx.createLinearGradient(-headR * 1.4, -headR * 0.35, headR * 1.4, headR * 0.35);
  brimGrad.addColorStop(0, palette.hat);
  brimGrad.addColorStop(0.45, "#183a2a");
  brimGrad.addColorStop(1, "#0f2a1d");
  ctx.fillStyle = brimGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, headR * 1.42, headR * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(200,255,225,0.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, -headR * 0.02, headR * 1.28, headR * 0.19, 0, Math.PI * 0.04, Math.PI * 0.96);
  ctx.stroke();

  const crownGrad = ctx.createLinearGradient(0, -headR * 1.28, 0, 0);
  crownGrad.addColorStop(0, "#214935");
  crownGrad.addColorStop(1, palette.hat);
  ctx.fillStyle = crownGrad;
  ctx.beginPath();
  ctx.moveTo(-headR * 0.75, 0);
  ctx.quadraticCurveTo(-headR * 0.74, -headR * 0.6, -headR * 0.62, -headR * 1.2);
  ctx.quadraticCurveTo(0, -headR * 1.34, headR * 0.62, -headR * 1.2);
  ctx.quadraticCurveTo(headR * 0.74, -headR * 0.6, headR * 0.75, 0);
  ctx.closePath();
  ctx.fill();

  drawCrossHatch(ctx, -headR * 0.74, -headR * 1.22, headR * 1.48, headR * 1.22, "rgba(220,255,235,0.35)", 10, 0.2);

  ctx.fillStyle = palette.dot;
  ctx.fillRect(-headR * 0.76, -headR * 0.2, headR * 1.52, headR * 0.18);

  for (let d = -headR * 0.62; d < headR * 0.62; d += headR * 0.16) {
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.arc(d, -headR * 0.11, headR * 0.03, 0, Math.PI * 2);
    ctx.fill();
  }

  const feathers = HAT_FEATHERS[hatFeatherIdx];
  feathers.forEach((f, i) => {
    ctx.save();
    ctx.translate(f.x * headR, f.y * headR - headR * 0.1);
    ctx.rotate((i - feathers.length / 2) * 0.16);

    const fGrad = ctx.createLinearGradient(0, 0, 0, -headR * 0.45);
    fGrad.addColorStop(0, "rgba(220,250,240,0.2)");
    fGrad.addColorStop(0.4, palette.accent);
    fGrad.addColorStop(1, "#def8ee");
    ctx.fillStyle = fGrad;
    ctx.beginPath();
    ctx.ellipse(0, -headR * 0.22, headR * 0.055, headR * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, -headR * 0.03);
    ctx.lineTo(0, -headR * 0.42);
    ctx.stroke();

    ctx.lineWidth = 0.5;
    for (let v = -3; v <= 3; v++) {
      ctx.beginPath();
      ctx.moveTo(0, -headR * 0.14 - Math.abs(v) * headR * 0.02);
      ctx.lineTo(v * headR * 0.04, -headR * 0.38);
      ctx.stroke();
    }
    ctx.restore();
  });

  ctx.restore();

  ctx.strokeStyle = palette.dot;
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, W - 24, H - 24);
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, W - 36, H - 36);

  const corners = [[22, 22], [W - 22, 22], [22, H - 22], [W - 22, H - 22]];
  corners.forEach(([cornerX, cornerY]) => {
    ctx.fillStyle = palette.dot;
    ctx.beginPath();
    ctx.arc(cornerX, cornerY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.arc(cornerX, cornerY, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.font = `bold ${W * 0.025}px serif`;
  ctx.textAlign = "right";
  ctx.fillText("THE BEAKS", W - 28, H - 28);
}

export default function BeaksArt() {
  const canvasRef = useRef(null);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 999999));
  const [isGenerating, setIsGenerating] = useState(false);
  const [tokenId, setTokenId] = useState(() => Math.floor(Math.random() * 1111) + 1);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawCharacter(canvas, seed);
  }, [seed]);

  useEffect(() => {
    render();
  }, [render]);

  const generate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newSeed = Math.floor(Math.random() * 999999);
      const newId = Math.floor(Math.random() * 1111) + 1;
      setSeed(newSeed);
      setTokenId(newId);
      setIsGenerating(false);
    }, 100);
  };

  const generated = generateBeak(seed);
  const paletteIndex = generated.paletteIndex;
  const palette = generated.palette;
  const paletteColors = [palette.bg, palette.skin, palette.beak[0], palette.beak[1], palette.hat, palette.accent];

  return (
    <section
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#0f0b17",
        color: "#eee7ff",
        padding: "24px",
      }}
    >
      <div style={{ width: "min(92vw, 860px)", display: "grid", gap: 14 }}>
        <canvas
          ref={canvasRef}
          width={1024}
          height={1024}
          style={{
            width: "100%",
            height: "auto",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: "0 22px 70px rgba(0,0,0,0.45)",
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <strong>Token #{tokenId}</strong>
            <span style={{ opacity: 0.8 }}>Seed {seed}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Palette {paletteIndex + 1}</span>
            {paletteColors.map((color, index) => (
              <span key={index} style={{ width: 14, height: 14, borderRadius: 999, background: color, border: "1px solid rgba(255,255,255,0.25)" }} />
            ))}
            <button
              onClick={generate}
              disabled={isGenerating}
              style={{
                marginLeft: 10,
                border: "1px solid rgba(255,255,255,0.25)",
                background: isGenerating ? "#3a2d5f" : "#5a3a8e",
                color: "#fff",
                borderRadius: 10,
                padding: "8px 12px",
                cursor: isGenerating ? "wait" : "pointer",
                fontWeight: 600,
              }}
            >
              {isGenerating ? "Generating..." : "Generate New"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
