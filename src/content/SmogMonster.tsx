import { useEffect, useRef, useState } from "react";
import { getMonsterStage } from "./co2Storage";

type Stage = 1 | 2 | 3 | 4 | 5;

const STAGE_TOASTS: Record<Stage, string> = {
  1: "",
  2: "Monster weakened! 5kg saved",
  3: "Monster lost a limb! 15kg saved",
  4: "Monster fading fast! 30kg saved",
  5: "Monster defeated! Clear skies!",
};

// Sky gradient [top, bottom] per stage
const SKY_COLORS: Record<Stage, [string, string]> = {
  1: ["#5A3A1A", "#B07030"],
  2: ["#7A5228", "#C8883E"],
  3: ["#9A7840", "#D8AE60"],
  4: ["#C0A870", "#E8D090"],
  5: ["#4A90C0", "#A8D8EE"],
};

// Monster fill color per stage
const MONSTER_COLORS: Record<Stage, string> = {
  1: "#6B5F48",
  2: "#7A6F58",
  3: "#897E68",
  4: "#A08F78",
  5: "#B5A48A",
};

// Monster opacity per stage
const MONSTER_OPACITY: Record<Stage, number> = {
  1: 1.0,
  2: 0.85,
  3: 0.7,
  4: 0.5,
  5: 0.15,
};

// Circles fed through the goo filter — remove circles to "lose limbs"
const MONSTER_SHAPES: Record<Stage, Array<{ cx: number; cy: number; r: number }>> = {
  1: [
    // Main body (thick and healthy)
    { cx: 100, cy: 63, r: 38 },
    // Head (strong presence)
    { cx: 72, cy: 36, r: 26 },
    { cx: 128, cy: 36, r: 26 },
    // Arms (prominent)
    { cx: 55, cy: 63, r: 20 },
    { cx: 145, cy: 63, r: 20 },
    // Legs (strong)
    { cx: 62, cy: 82, r: 16 },
    { cx: 138, cy: 82, r: 16 },
    // Side bulges (full pollution)
    { cx: 75, cy: 20, r: 12 },
    { cx: 125, cy: 20, r: 12 },
    { cx: 45, cy: 45, r: 10 },
    { cx: 155, cy: 45, r: 10 },
  ],
  2: [
    // Body shrinks noticeably
    { cx: 100, cy: 64, r: 34 },
    // Head loses definition
    { cx: 74, cy: 38, r: 22 },
    { cx: 126, cy: 38, r: 22 },
    // Arms weaker
    { cx: 58, cy: 64, r: 16 },
    { cx: 142, cy: 64, r: 16 },
    // Legs weakening
    { cx: 65, cy: 82, r: 13 },
    { cx: 135, cy: 82, r: 13 },
    // Side bulges shrink
    { cx: 77, cy: 24, r: 9 },
    { cx: 123, cy: 24, r: 9 },
  ],
  3: [
    // Body significantly smaller
    { cx: 100, cy: 65, r: 28 },
    // Head barely there
    { cx: 78, cy: 42, r: 16 },
    { cx: 122, cy: 42, r: 14 },
    // Left arm weakened, right arm gone
    { cx: 60, cy: 65, r: 11 },
    // Left leg remains, right gone
    { cx: 68, cy: 82, r: 10 },
    // Side bulges mostly gone
    { cx: 80, cy: 28, r: 6 },
  ],
  4: [
    // Body just a blob
    { cx: 100, cy: 66, r: 22 },
    // Head almost invisible
    { cx: 80, cy: 48, r: 10 },
    { cx: 120, cy: 50, r: 8 },
    // Barely a limb on left
    { cx: 62, cy: 66, r: 7 },
  ],
  5: [
    // Barely anything - just a wisp
    { cx: 100, cy: 68, r: 12 },
  ],
};

// Eyes: position, radius, pupil offset for expression
const EYE_POS: Record<Stage, { lx: number; ly: number; rx: number; ry: number; r: number; pupr: number; pupOff: { x: number; y: number } } | null> = {
  1: { lx: 85, ly: 52, rx: 115, ry: 52, r: 6, pupr: 2.8, pupOff: { x: 1.5, y: -1.5 } },  // smug, looking up-right
  2: { lx: 87, ly: 55, rx: 113, ry: 55, r: 5.2, pupr: 2.4, pupOff: { x: 0.8, y: -0.8 } }, // still confident
  3: { lx: 89, ly: 58, rx: 111, ry: 58, r: 4.5, pupr: 2, pupOff: { x: 0.2, y: 0.5 } },   // worried
  4: { lx: 92, ly: 60, rx: 108, ry: 60, r: 3.5, pupr: 1.5, pupOff: { x: -1, y: 1.5 } },  // terrified, looking down
  5: null,
};

const BUILDING_COLOR: Record<Stage, string> = {
  1: "#181818",
  2: "#202028",
  3: "#2A3040",
  4: "#3A4A5A",
  5: "#3A5A6E",
};

function Building({
  x,
  y,
  w,
  h,
  fill,
  stage,
  windowColor,
  windowSize = 3,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  stage: Stage;
  windowColor: string;
  windowSize?: number;
}) {
  // Create a grid of windows with more control
  const windowGap = windowSize + 1.5;
  const startX = x + 2;
  const startY = y + 2;
  const windowsPerRow = Math.max(1, Math.floor((w - 4) / windowGap));
  const windowsPerCol = Math.max(1, Math.floor((h - 4) / windowGap));

  // Calculate light ratio based on stage
  const litRatio = [0.15, 0.35, 0.55, 0.75, 0.95][stage - 1];

  // Create windows with a pseudo-random but deterministic pattern
  const windows: Array<{ x: number; y: number; lit: boolean }> = [];
  for (let row = 0; row < windowsPerCol; row++) {
    for (let col = 0; col < windowsPerRow; col++) {
      const wx = startX + col * windowGap;
      const wy = startY + row * windowGap;
      // Use a hash-like function for consistent but varied lit patterns
      const hash = Math.sin(x * 0.1 + y * 0.1 + col * 7.1 + row * 13.7) * 10000;
      const isLit = (hash % 1) < litRatio;
      windows.push({ x: wx, y: wy, lit: isLit });
    }
  }

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={fill} />

      {/* Building edge highlight */}
      <rect x={x} y={y} width={w} height={h} fill="url(#buildingShade)" opacity="0.3" />

      {/* Windows */}
      {windows.map((win, i) => (
        <g key={i}>
          {/* Window frame */}
          <rect
            x={win.x - 0.5}
            y={win.y - 0.5}
            width={windowSize + 1}
            height={windowSize + 1}
            fill={win.lit ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.8)"}
            opacity="0.6"
          />
          {/* Light glow */}
          {win.lit && (
            <>
              <rect x={win.x} y={win.y} width={windowSize} height={windowSize} fill={windowColor} opacity="0.9" />
              <rect x={win.x} y={win.y} width={windowSize} height={windowSize} fill="white" opacity="0.2" />
            </>
          )}
          {!win.lit && (
            <rect x={win.x} y={win.y} width={windowSize} height={windowSize} fill="rgba(0,0,0,0.3)" opacity="0.5" />
          )}
        </g>
      ))}
    </g>
  );
}

function CitySkyline({ stage }: { stage: Stage }) {
  const fill = BUILDING_COLOR[stage];
  const windowColor = stage <= 2 ? "#FFC860" : stage <= 3 ? "#FFD880" : stage <= 4 ? "#FFE8A0" : "#87CEEB";

  return (
    <svg
      className="cc-city-svg"
      viewBox="0 0 360 80"
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        <linearGradient id="buildingShade" x1="0" y1="0" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.1)" />
        </linearGradient>
      </defs>

      {/* Building shadows for depth */}
      <rect x="0" y="80" width="360" height="2" fill="rgba(0,0,0,0.15)" />

      {/* Left cluster */}
      <Building x="0" y="62" w="38" h="18" fill={fill} stage={stage} windowColor={windowColor} windowSize={2.5} />
      <Building x="10" y="50" w="8" h="12" fill={fill} stage={stage} windowColor={windowColor} windowSize={2} />
      <Building x="36" y="46" w="26" h="34" fill={fill} stage={stage} windowColor={windowColor} windowSize={2.8} />
      <Building x="44" y="36" w="6" h="10" fill={fill} stage={stage} windowColor={windowColor} windowSize={1.8} />

      {/* Mid-left cluster */}
      <Building x="66" y="55" w="38" h="25" fill={fill} stage={stage} windowColor={windowColor} windowSize={2.8} />
      <Building x="74" y="38" w="22" h="17" fill={fill} stage={stage} windowColor={windowColor} windowSize={2.5} />
      <Building x="83" y="28" w="4" h="10" fill={fill} stage={stage} windowColor={windowColor} windowSize={1.5} />

      {/* Center cluster */}
      <Building x="112" y="50" w="52" h="30" fill={fill} stage={stage} windowColor={windowColor} windowSize={3} />
      <Building x="122" y="34" w="32" h="16" fill={fill} stage={stage} windowColor={windowColor} windowSize={2.5} />
      <Building x="136" y="24" w="4" h="10" fill={fill} stage={stage} windowColor={windowColor} windowSize={1.5} />

      {/* Tallest tower (center) */}
      <Building x="172" y="28" w="22" h="52" fill={fill} stage={stage} windowColor={windowColor} windowSize={2.8} />
      <Building x="178" y="16" w="10" h="12" fill={fill} stage={stage} windowColor={windowColor} windowSize={2.2} />
      <Building x="182" y="10" w="2" h="6" fill={fill} stage={stage} windowColor={windowColor} windowSize={1.2} />

      {/* Right-center cluster */}
      <Building x="200" y="44" w="44" h="36" fill={fill} stage={stage} windowColor={windowColor} windowSize={3} />
      <Building x="210" y="28" w="24" h="16" fill={fill} stage={stage} windowColor={windowColor} windowSize={2.5} />

      {/* Right cluster */}
      <Building x="252" y="54" w="32" h="26" fill={fill} stage={stage} windowColor={windowColor} windowSize={2.8} />
      <Building x="260" y="42" w="14" h="12" fill={fill} stage={stage} windowColor={windowColor} windowSize={2.2} />
      <Building x="290" y="46" w="38" h="34" fill={fill} stage={stage} windowColor={windowColor} windowSize={3} />
      <Building x="300" y="36" w="18" h="10" fill={fill} stage={stage} windowColor={windowColor} windowSize={2.5} />
      <Building x="332" y="58" w="28" h="22" fill={fill} stage={stage} windowColor={windowColor} windowSize={2.8} />
    </svg>
  );
}

export function SmogMonster({ totalCO2Saved }: { totalCO2Saved: number }) {
  const stage = getMonsterStage(totalCO2Saved);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastText, setToastText] = useState("");
  const prevStageRef = useRef<Stage>(stage);

  // Show toast when stage advances
  useEffect(() => {
    const prev = prevStageRef.current;
    if (stage > prev) {
      setToastText(STAGE_TOASTS[stage]);
      setShowToast(true);
      const t = setTimeout(() => setShowToast(false), 3500);
      prevStageRef.current = stage;
      return () => clearTimeout(t);
    }
    prevStageRef.current = stage;
  }, [stage]);

  // Smog trail canvas - disabled (no smog emission)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 360;
    canvas.height = 190;

    // Just clear the canvas, no particles
    ctx.clearRect(0, 0, 360, 190);
  }, []);

  // Particle dissolve at stage 5
  useEffect(() => {
    if (stage !== 5) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 360;
    canvas.height = 190;

    type Particle = { x: number; y: number; vx: number; vy: number; alpha: number; r: number };
    const particles: Particle[] = Array.from({ length: 60 }, () => ({
      x: 180 + (Math.random() - 0.5) * 50,
      y: 60 + (Math.random() - 0.5) * 30,
      vx: (Math.random() - 0.5) * 2.5,
      vy: -0.5 - Math.random() * 1.5,
      alpha: 0.7 + Math.random() * 0.3,
      r: 2 + Math.random() * 5,
    }));

    let rafId: number;
    const tick = () => {
      ctx.clearRect(0, 0, 360, 190);
      let anyAlive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.007;
        if (p.alpha > 0) {
          anyAlive = true;
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = MONSTER_COLORS[5];
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (anyAlive) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [stage]);

  const [skyTop, skyBot] = SKY_COLORS[stage];
  const circles = MONSTER_SHAPES[stage];
  const eyes = EYE_POS[stage];
  const monsterColor = MONSTER_COLORS[stage];

  return (
    <div
      className={`cc-smog-scene cc-smog-s${stage}`}
      style={{ background: `linear-gradient(180deg, ${skyTop} 0%, ${skyBot} 100%)` }}
    >
      {/* Trail canvas - shows smog particles behind everything */}
      <canvas
        ref={canvasRef}
        className="cc-trail-canvas"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      <CitySkyline stage={stage} />

      <div className="cc-haze" style={{ opacity: [0.65, 0.45, 0.25, 0.1, 0][stage - 1] }} />

      <div
        className="cc-monster-wrap"
        style={{ opacity: MONSTER_OPACITY[stage] }}
      >
        <svg viewBox="0 0 200 100" width="200" height="100" className="cc-monster-svg" overflow="visible">
          <defs>
            <filter id="cc-goo" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9"
              />
            </filter>
            {/* Radial gradient for monster shine */}
            <radialGradient id="monsterShine" cx="35%" cy="30%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.08)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </defs>

          <g filter="url(#cc-goo)">
            {circles.map((c, i) => (
              <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill={monsterColor} />
            ))}
          </g>

          {/* Shine/highlight to show volume */}
          <circle cx="85" cy="48" r="28" fill="url(#monsterShine)" opacity={[1, 0.9, 0.7, 0.5, 0][stage - 1]} />

          {/* Texture spots for early stages */}
          {stage <= 2 && (
            <g opacity="0.4">
              <circle cx="95" cy="60" r="3" fill="rgba(0,0,0,0.5)" />
              <circle cx="110" cy="55" r="2.5" fill="rgba(0,0,0,0.5)" />
              <circle cx="88" cy="48" r="2" fill="rgba(0,0,0,0.5)" />
              <circle cx="115" cy="70" r="2.5" fill="rgba(0,0,0,0.5)" />
              <circle cx="105" cy="75" r="2" fill="rgba(0,0,0,0.5)" />
              <circle cx="72" cy="50" r="2" fill="rgba(0,0,0,0.5)" />
              <circle cx="128" cy="52" r="2.5" fill="rgba(0,0,0,0.5)" />
            </g>
          )}

          {eyes && (
            <g>
              {/* Left eye */}
              <circle cx={eyes.lx} cy={eyes.ly} r={eyes.r} fill="white" />
              <circle cx={eyes.lx} cy={eyes.ly} r={eyes.r * 0.8} fill="#E8F0FF" opacity="0.6" />
              <circle cx={eyes.lx + eyes.pupOff.x} cy={eyes.ly + eyes.pupOff.y} r={eyes.pupr} fill="#2A2010" />
              <circle cx={eyes.lx + eyes.pupOff.x + 0.8} cy={eyes.ly + eyes.pupOff.y - 0.8} r={eyes.pupr * 0.4} fill="white" />

              {/* Right eye */}
              <circle cx={eyes.rx} cy={eyes.ry} r={eyes.r} fill="white" />
              <circle cx={eyes.rx} cy={eyes.ry} r={eyes.r * 0.8} fill="#E8F0FF" opacity="0.6" />
              <circle cx={eyes.rx + eyes.pupOff.x} cy={eyes.ry + eyes.pupOff.y} r={eyes.pupr} fill="#2A2010" />
              <circle cx={eyes.rx + eyes.pupOff.x + 0.8} cy={eyes.ry + eyes.pupOff.y - 0.8} r={eyes.pupr * 0.4} fill="white" />

              {/* Blush marks for stages 1-2 */}
              {stage <= 2 && (
                <>
                  <circle cx="68" cy="68" r="3.5" fill="#A86A6A" opacity="0.3" />
                  <circle cx="132" cy="68" r="3.5" fill="#A86A6A" opacity="0.3" />
                </>
              )}

              {/* Tears/sad mouth for stages 3-4 */}
              {stage >= 3 && stage <= 4 && (
                <path
                  d={`M ${100 - 5},70 Q ${100},72 ${100 + 5},70`}
                  fill="none"
                  stroke="#7A7260"
                  strokeWidth="1.5"
                  opacity="0.6"
                  strokeLinecap="round"
                />
              )}
            </g>
          )}
        </svg>

        {stage === 5 && (
          <canvas ref={canvasRef} className="cc-dissolve-canvas" />
        )}
      </div>

      {showToast && (
        <div className="cc-monster-toast">{toastText}</div>
      )}
    </div>
  );
}
