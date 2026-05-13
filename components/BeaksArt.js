import { useState, useEffect, useRef, useCallback } from "react";

const PALETTES = [
  { bg: "#f4a7b9", skin: "#2d1b3d", beak: ["#e8a87c", "#c97b4b"], hat: "#4a2d7a", cloth: "#3d2060", accent: "#c9a0e8", dot: "#6b3fa0" },
  { bg: "#7eb8d4", skin: "#1a2e1a", beak: ["#e8c87c", "#c9a84b"], hat: "#1a3a2a", cloth: "#2d5a3d", accent: "#a0d4c8", dot: "#4a8a6a" },
  { bg: "#d4a0c8", skin: "#2a1a0e", beak: ["#e86060", "#c04040"], hat: "#6a1a2a", cloth: "#4a1a1a", accent: "#e8a0a0", dot: "#9a3040" },
  { bg: "#f0e0a0", skin: "#1a1a2d", beak: ["#80c0e8", "#4090c0"], hat: "#1a1a4a", cloth: "#1a2a4a", accent: "#a0b8e8", dot: "#3050a0" },
  { bg: "#a0d4a0", skin: "#2d1a2d", beak: ["#e8d080", "#c0a840"], hat: "#4a1a5a", cloth: "#6a2a7a", accent: "#d0a0e8", dot: "#7a40a0" },
];

const BEAK_SHAPES = [
  (cx, cy, s) => `M${cx} ${cy} Q${cx + s * 1.4} ${cy + s * 0.3} ${cx + s * 1.6} ${cy + s * 0.9} Q${cx + s * 1.2} ${cy + s * 1.2} ${cx + s * 0.6} ${cy + s * 1.0} Z`,
  (cx, cy, s) => `M${cx} ${cy - s * 0.2} Q${cx + s * 1.5} ${cy - s * 0.4} ${cx + s * 1.7} ${cy + s * 0.6} Q${cx + s * 1.3} ${cy + s * 1.0} ${cx + s * 0.5} ${cy + s * 0.8} Z`,
  (cx, cy, s) => `M${cx} ${cy} Q${cx + s * 0.8} ${cy + s * 0.2} ${cx + s * 1.8} ${cy + s * 1.4} Q${cx + s * 1.6} ${cy + s * 1.5} ${cx + s * 0.4} ${cy + s * 0.9} Z`,
];

const HAT_FEATHERS = [
  [{ x: 0, y: -1.0 }, { x: 0.2, y: -1.4 }, { x: -0.1, y: -1.6 }, { x: 0.3, y: -1.2 }],
  [{ x: -0.1, y: -0.9 }, { x: 0.15, y: -1.5 }, { x: -0.2, y: -1.3 }, { x: 0.35, y: -1.1 }],
  [{ x: 0.05, y: -1.1 }, { x: -0.15, y: -1.6 }, { x: 0.25, y: -1.4 }],
];
const NOISE_PARTICLE_COUNT = 3000;
const NECKLACE_BEAD_COUNT = 18;

function drawStipple(ctx, x, y, r, color, rng, density = 40) {
  ctx.fillStyle = color;
  for (let i = 0; i < density; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = rng() * r;
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;
    ctx.beginPath();
    ctx.arc(px, py, rng() * 1.5 + 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function createSeededRandom(seed) {
  let s = seed;
  return () => {
    // Numerical Recipes 32-bit LCG constants.
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function drawCrossHatch(ctx, x, y, w, h, color, spacing = 8) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.3;
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

function generateBeak(seed) {
  const rng = createSeededRandom(seed);

  const paletteIndex = Math.floor(rng() * PALETTES.length);
  const palette = PALETTES[paletteIndex];
  const beakIdx = Math.floor(rng() * BEAK_SHAPES.length);
  const hatFeatherIdx = Math.floor(rng() * HAT_FEATHERS.length);
  const hasNecklace = rng() > 0.4;
  const hasFlower = rng() > 0.5;
  const hasEyepatch = rng() > 0.7;
  const clothStripes = rng() > 0.4;
  const hatTilt = (rng() - 0.5) * 15;
  const beakTilt = rng() * 20 - 5;
  const flowerColors = ["#ffffff", "#f8e0f0", "#e0f0e8"];
  const flowerColor = flowerColors[Math.floor(rng() * flowerColors.length)];

  return { palette, paletteIndex, beakIdx, hatFeatherIdx, hasNecklace, hasFlower, hasEyepatch, clothStripes, hatTilt, beakTilt, flowerColor, rng };
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

  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.8);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < NOISE_PARTICLE_COUNT; i++) {
    ctx.fillStyle = `rgba(${rng() > 0.5 ? 255 : 0},${rng() > 0.5 ? 255 : 0},${rng() > 0.5 ? 255 : 0},0.015)`;
    ctx.fillRect(rng() * W, rng() * H, 1, 1);
  }

  const cx = W * 0.42;
  const cy = H * 0.52;
  const headR = W * 0.18;

  ctx.save();
  ctx.translate(cx, cy + headR * 1.3);

  ctx.fillStyle = palette.cloth;
  ctx.beginPath();
  ctx.moveTo(-headR * 1.4, 0);
  ctx.quadraticCurveTo(-headR * 1.6, headR * 1.2, -headR * 2.0, H * 0.6 - (cy + headR * 1.3));
  ctx.lineTo(headR * 2.2, H * 0.6 - (cy + headR * 1.3));
  ctx.quadraticCurveTo(headR * 1.6, headR * 1.2, headR * 1.4, 0);
  ctx.closePath();
  ctx.fill();

  if (clothStripes) {
    drawCrossHatch(ctx, -headR * 2.0, 0, headR * 4.0, H * 0.5, palette.accent, 12);
  }

  ctx.fillStyle = "#f0ead8";
  ctx.beginPath();
  ctx.moveTo(-headR * 0.5, -headR * 0.1);
  ctx.lineTo(-headR * 0.9, headR * 0.6);
  ctx.lineTo(0, headR * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(headR * 0.5, -headR * 0.1);
  ctx.lineTo(headR * 0.9, headR * 0.6);
  ctx.lineTo(0, headR * 0.1);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.cloth;
  ctx.beginPath();
  ctx.moveTo(-headR * 0.5, -headR * 0.2);
  ctx.lineTo(-headR * 1.3, headR * 0.8);
  ctx.lineTo(0, headR * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(headR * 0.5, -headR * 0.2);
  ctx.lineTo(headR * 1.3, headR * 0.8);
  ctx.lineTo(0, headR * 0.15);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  if (hasNecklace) {
    ctx.save();
    ctx.translate(cx, cy + headR * 1.0);
    const beadCount = NECKLACE_BEAD_COUNT;
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= beadCount; i++) {
      const t = (i / beadCount) * Math.PI;
      const bx = Math.cos(t + Math.PI) * headR * 0.85;
      const by = Math.sin(t + Math.PI) * headR * 0.3 + headR * 0.1;
      if (i === 0) ctx.moveTo(bx, by);
      else ctx.lineTo(bx, by);
    }
    ctx.stroke();
    for (let i = 0; i <= beadCount; i++) {
      const t = (i / beadCount) * Math.PI;
      const bx = Math.cos(t + Math.PI) * headR * 0.85;
      const by = Math.sin(t + Math.PI) * headR * 0.3 + headR * 0.1;
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fillStyle = palette.accent;
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(cx, cy);

  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.arc(headR * 0.15, headR * 0.1, headR * 1.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.skin;
  ctx.beginPath();
  ctx.arc(0, 0, headR, 0, Math.PI * 2);
  ctx.fill();

  drawStipple(ctx, 0, 0, headR * 0.9, palette.dot, rng, 80);

  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.beginPath();
  ctx.arc(-headR * 0.2, -headR * 0.2, headR * 0.5, 0, Math.PI * 2);
  ctx.fill();

  const hairColor = palette.dot;
  for (let i = -4; i <= 4; i++) {
    ctx.fillStyle = hairColor;
    ctx.save();
    ctx.translate(i * headR * 0.12, -headR * 0.7);
    ctx.rotate(i * 0.08);
    ctx.beginPath();
    ctx.ellipse(0, 0, headR * 0.06, headR * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.ellipse(-headR * 0.2, -headR * 0.1, headR * 0.18, headR * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a0a00";
  ctx.beginPath();
  ctx.arc(-headR * 0.18, -headR * 0.1, headR * 0.09, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.arc(-headR * 0.22, -headR * 0.14, headR * 0.03, 0, Math.PI * 2);
  ctx.fill();

  if (hasEyepatch) {
    ctx.fillStyle = "rgba(30,10,10,0.9)";
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(headR * 0.2, -headR * 0.1, headR * 0.2, headR * 0.15, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8b6914";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(headR * 0.0, -headR * 0.25);
    ctx.lineTo(headR * 0.1, -headR * 0.0);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((beakTilt * Math.PI) / 180);

  const beakScale = headR * 0.9;
  const beakStartX = headR * 0.3;
  const beakStartY = headR * 0.05;

  const beakGrad = ctx.createLinearGradient(beakStartX, beakStartY, beakStartX + beakScale, beakStartY + beakScale);
  beakGrad.addColorStop(0, palette.beak[0]);
  beakGrad.addColorStop(1, palette.beak[1]);
  ctx.fillStyle = beakGrad;

  const beakPath = new Path2D(BEAK_SHAPES[beakIdx](beakStartX, beakStartY, beakScale));
  ctx.fill(beakPath);

  ctx.strokeStyle = palette.beak[1];
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  for (let r = 0; r < 4; r++) {
    ctx.beginPath();
    ctx.moveTo(beakStartX + r * 10, beakStartY + r * 5);
    ctx.quadraticCurveTo(
      beakStartX + beakScale * 0.8 + r * 8,
      beakStartY + beakScale * 0.3,
      beakStartX + beakScale * 1.2,
      beakStartY + beakScale * 0.7 + r * 8
    );
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  drawStipple(ctx, beakStartX + beakScale * 0.7, beakStartY + beakScale * 0.5, beakScale * 0.35, palette.beak[1], rng, 30);

  ctx.restore();

  if (hasFlower) {
    ctx.save();
    ctx.translate(cx + headR * 0.8, cy + headR * 0.4);
    for (let p = 0; p < 5; p++) {
      ctx.fillStyle = flowerColor;
      ctx.save();
      ctx.rotate((p / 5) * Math.PI * 2);
      ctx.beginPath();
      ctx.ellipse(headR * 0.15, 0, headR * 0.12, headR * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = "#f5d070";
    ctx.beginPath();
    ctx.arc(0, 0, headR * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(cx, cy - headR * 0.75);
  ctx.rotate((hatTilt * Math.PI) / 180);

  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(headR * 0.1, headR * 0.08, headR * 1.45, headR * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.hat;
  ctx.beginPath();
  ctx.ellipse(0, 0, headR * 1.4, headR * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();

  const brimGrad = ctx.createLinearGradient(-headR, -headR * 0.26, headR, headR * 0.26);
  brimGrad.addColorStop(0, "rgba(255,255,255,0.1)");
  brimGrad.addColorStop(0.5, "rgba(255,255,255,0.05)");
  brimGrad.addColorStop(1, "rgba(0,0,0,0.1)");
  ctx.fillStyle = brimGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, headR * 1.4, headR * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.hat;
  ctx.beginPath();
  ctx.moveTo(-headR * 0.75, 0);
  ctx.lineTo(-headR * 0.65, -headR * 1.2);
  ctx.lineTo(headR * 0.65, -headR * 1.2);
  ctx.lineTo(headR * 0.75, 0);
  ctx.closePath();
  ctx.fill();

  drawCrossHatch(ctx, -headR * 0.75, -headR * 1.2, headR * 1.5, headR * 1.2, "rgba(255,255,255,0.15)", 10);

  ctx.fillStyle = palette.dot;
  ctx.fillRect(-headR * 0.75, -headR * 0.2, headR * 1.5, headR * 0.18);

  for (let d = -headR * 0.6; d < headR * 0.6; d += headR * 0.15) {
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.arc(d, -headR * 0.11, headR * 0.03, 0, Math.PI * 2);
    ctx.fill();
  }

  const feathers = HAT_FEATHERS[hatFeatherIdx];
  feathers.forEach((f, i) => {
    ctx.save();
    ctx.translate(f.x * headR, f.y * headR - headR * 0.1);
    ctx.rotate((i - feathers.length / 2) * 0.15);
    const fGrad = ctx.createLinearGradient(0, 0, 0, -headR * 0.4);
    fGrad.addColorStop(0, palette.accent);
    fGrad.addColorStop(1, palette.bg);
    ctx.fillStyle = fGrad;
    ctx.beginPath();
    ctx.ellipse(0, -headR * 0.2, headR * 0.055, headR * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 0.5;
    for (let v = -3; v <= 3; v++) {
      ctx.beginPath();
      ctx.moveTo(0, -headR * 0.05);
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
