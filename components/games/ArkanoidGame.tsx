"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { ARKANOID_SKINS, type GameSkin } from "@/lib/game-skins";

export interface ArkanoidHudState {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover";
}

export interface ArkanoidGameHandle {
  restart: () => void;
}

interface ArkanoidGameProps {
  paused: boolean;
  skin: GameSkin;
  onHudChange: (state: ArkanoidHudState) => void;
}

const W = 800;
const H = 600;

const PADDLE_SPEED = 400;
const PADDLE_W = 162;
const PADDLE_H = 14;
const BALL_SIZE = 16;
const BLOCK_COLS = 10;
const BLOCK_ROWS = 6;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;
const EXPLOSION_DURATION = 150;

type BlockColor =
  "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";

interface Sprite {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

const SPRITES: {
  paddle: Sprite;
  ball: Sprite;
  blocks: Record<BlockColor, Sprite>;
} = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  blocks: {
    gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  },
};

const EXPLOSION_FRAMES: Record<BlockColor, Sprite[]> = {
  red: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
  cyan: [
    { sx: 256, sy: 192, sw: 32, sh: 16 },
    { sx: 288, sy: 192, sw: 32, sh: 16 },
    { sx: 320, sy: 192, sw: 32, sh: 16 },
    { sx: 352, sy: 192, sw: 32, sh: 16 },
  ],
  green: [
    { sx: 256, sy: 208, sw: 32, sh: 16 },
    { sx: 288, sy: 208, sw: 32, sh: 16 },
    { sx: 320, sy: 208, sw: 32, sh: 16 },
    { sx: 352, sy: 208, sw: 32, sh: 16 },
  ],
  magenta: [
    { sx: 256, sy: 224, sw: 32, sh: 16 },
    { sx: 288, sy: 224, sw: 32, sh: 16 },
    { sx: 320, sy: 224, sw: 32, sh: 16 },
    { sx: 352, sy: 224, sw: 32, sh: 16 },
  ],
  yellow: [
    { sx: 256, sy: 240, sw: 32, sh: 16 },
    { sx: 288, sy: 240, sw: 32, sh: 16 },
    { sx: 320, sy: 240, sw: 32, sh: 16 },
    { sx: 352, sy: 240, sw: 32, sh: 16 },
  ],
  hotpink: [
    { sx: 256, sy: 256, sw: 32, sh: 16 },
    { sx: 288, sy: 256, sw: 32, sh: 16 },
    { sx: 320, sy: 256, sw: 32, sh: 16 },
    { sx: 352, sy: 256, sw: 32, sh: 16 },
  ],
  gray: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
};

interface LevelBlock {
  col: number;
  row: number;
  color: BlockColor;
}

interface Level {
  speed: number;
  blocks: LevelBlock[];
}

const LEVELS: Level[] = (() => {
  const rowColors1: BlockColor[] = [
    "red",
    "yellow",
    "cyan",
    "magenta",
    "hotpink",
    "green",
  ];
  const rowColors2: BlockColor[] = [
    "gray",
    "cyan",
    "hotpink",
    "yellow",
    "magenta",
    "green",
  ];
  const rowColors4: BlockColor[] = [
    "cyan",
    "magenta",
    "green",
    "yellow",
    "hotpink",
    "red",
  ];

  const l1: LevelBlock[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      l1.push({ col, row, color: rowColors1[row] });

  const l2: LevelBlock[] = [];
  const pyStart = [4, 3, 2, 1, 0, 0];
  const pyEnd = [5, 6, 7, 8, 9, 9];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = pyStart[row]; col <= pyEnd[row]; col++)
      l2.push({ col, row, color: rowColors2[row] });

  const l3: LevelBlock[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      if ((col + row) % 2 === 0)
        l3.push({ col, row, color: row < 3 ? "yellow" : "magenta" });

  const gaps4 = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const l4: LevelBlock[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      if (!gaps4[row].includes(col))
        l4.push({ col, row, color: rowColors4[row] });

  const l5: LevelBlock[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++) {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross)
        l5.push({ col, row, color: isCross && !isFrame ? "hotpink" : "cyan" });
    }

  return [
    { speed: 1.0, blocks: l1 },
    { speed: 1.1, blocks: l2 },
    { speed: 1.21, blocks: l3 },
    { speed: 1.33, blocks: l4 },
    { speed: 1.46, blocks: l5 },
  ];
})();

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
}

interface Explosion {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  elapsed: number;
}

type EngineState = "playing" | "gameover" | "win";

interface Engine {
  paddle: { x: number; y: number; w: number; h: number };
  ball: { x: number; y: number; w: number; h: number; vx: number; vy: number };
  blocks: Block[];
  explosions: Explosion[];
  score: number;
  lives: number;
  level: number;
  state: EngineState;
}

const ArkanoidGame = forwardRef<ArkanoidGameHandle, ArkanoidGameProps>(
  function ArkanoidGame({ paused, skin, onHudChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pausedRef = useRef(paused);
    const onHudChangeRef = useRef(onHudChange);
    const skinRef = useRef(skin);
    const engineRef = useRef<Engine | null>(null);
    const initGameRef = useRef<() => void>(() => {});
    const keysRef = useRef<Record<string, boolean>>({});

    useEffect(() => {
      pausedRef.current = paused;
    }, [paused]);

    useEffect(() => {
      onHudChangeRef.current = onHudChange;
    }, [onHudChange]);

    useEffect(() => {
      skinRef.current = skin;
    }, [skin]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx2d = canvas.getContext("2d");
      if (!ctx2d) return;
      const ctx: CanvasRenderingContext2D = ctx2d;

      const keys = keysRef.current;

      const spriteImg = new Image();
      let spriteLoaded = false;
      spriteImg.onload = () => {
        spriteLoaded = true;
      };
      spriteImg.src = "/games/arkanoid-spritesheet.png";

      const breakSound = new Audio("/games/sounds/arkanoid-break.mp3");
      function playBreakSound() {
        (breakSound.cloneNode() as HTMLAudioElement).play().catch(() => {});
      }

      function drawSprite(
        sp: Sprite,
        x: number,
        y: number,
        w: number,
        h: number,
      ) {
        if (!spriteLoaded) return;
        ctx.drawImage(spriteImg, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
      }

      function shadeColor(hex: string, percent: number): string {
        if (!hex.startsWith("#") || (hex.length !== 7 && hex.length !== 4))
          return hex;
        const full =
          hex.length === 4
            ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
            : hex;
        const num = parseInt(full.slice(1), 16);
        const clamp = (v: number) => Math.max(0, Math.min(255, v));
        const r = clamp(Math.round((num >> 16) + 255 * percent));
        const g = clamp(Math.round(((num >> 8) & 0x00ff) + 255 * percent));
        const b = clamp(Math.round((num & 0x0000ff) + 255 * percent));
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
      }

      function roundRectPath(
        x: number,
        y: number,
        w: number,
        h: number,
        r: number,
      ) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
      }

      function drawFlatBlock(
        x: number,
        y: number,
        w: number,
        h: number,
        color: string,
        alpha = 1,
      ) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        const edge = 3;
        ctx.fillStyle = shadeColor(color, 0.22);
        ctx.fillRect(x, y, w, edge);
        ctx.fillRect(x, y, edge, h);
        ctx.fillStyle = shadeColor(color, -0.28);
        ctx.fillRect(x, y + h - edge, w, edge);
        ctx.fillRect(x + w - edge, y, edge, h);
        ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        ctx.restore();
      }

      function drawPaddleShape(
        x: number,
        y: number,
        w: number,
        h: number,
        color: string,
        glow: string,
      ) {
        ctx.save();
        if (glow !== "transparent") {
          ctx.shadowColor = glow;
          ctx.shadowBlur = 14;
        }
        roundRectPath(x, y, w, h, 5);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.fillRect(x + 3, y + 2, w - 6, 2);
        ctx.strokeStyle = shadeColor(color, -0.35);
        ctx.lineWidth = 1;
        roundRectPath(x + 0.5, y + 0.5, w - 1, h - 1, 5);
        ctx.stroke();
        ctx.restore();
      }

      function drawScanlines() {
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
        for (let y = 0; y < H; y += 4) {
          ctx.fillRect(0, y, W, 2);
        }
        ctx.restore();
      }

      function onKeyDown(e: KeyboardEvent) {
        keys[e.key] = true;
      }
      function onKeyUp(e: KeyboardEvent) {
        keys[e.key] = false;
      }

      function onMouseMove(e: MouseEvent) {
        const engine = engineRef.current;
        if (!engine || !canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = W / rect.width;
        const mouseX = (e.clientX - rect.left) * scaleX;
        engine.paddle.x = Math.max(
          0,
          Math.min(W - engine.paddle.w, mouseX - engine.paddle.w / 2),
        );
      }

      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      canvas.addEventListener("mousemove", onMouseMove);

      function loadLevel(engine: Engine, n: number) {
        engine.level = n;
        const level = LEVELS[n - 1];
        engine.blocks = level.blocks.map((b) => ({
          x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
          y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
          w: BLOCK_W,
          h: BLOCK_H,
          color: b.color,
          alive: true,
        }));
        engine.explosions = [];
        engine.paddle.x = (W - engine.paddle.w) / 2;
        engine.ball.x = engine.paddle.x + (engine.paddle.w - engine.ball.w) / 2;
        engine.ball.y = engine.paddle.y - engine.ball.h;
        engine.ball.vx = BASE_BALL_VX * level.speed;
        engine.ball.vy = BASE_BALL_VY * level.speed;
      }

      function initGame() {
        const engine: Engine = {
          paddle: { x: (W - PADDLE_W) / 2, y: 560, w: PADDLE_W, h: PADDLE_H },
          ball: { x: 0, y: 0, w: BALL_SIZE, h: BALL_SIZE, vx: 0, vy: 0 },
          blocks: [],
          explosions: [],
          score: 0,
          lives: 3,
          level: 1,
          state: "playing",
        };
        loadLevel(engine, 1);
        engineRef.current = engine;
        onHudChangeRef.current({
          score: engine.score,
          lives: engine.lives,
          level: engine.level,
          status: "playing",
        });
      }
      initGameRef.current = initGame;

      function collideAABB(ball: Engine["ball"], block: Block) {
        return (
          ball.x < block.x + block.w &&
          ball.x + ball.w > block.x &&
          ball.y < block.y + block.h &&
          ball.y + ball.h > block.y
        );
      }

      function update(engine: Engine, dt: number) {
        if (engine.state !== "playing") return;

        const { paddle, ball } = engine;

        if (keys.ArrowLeft)
          paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
        if (keys.ArrowRight)
          paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        if (ball.x <= 0) {
          ball.x = 0;
          ball.vx = Math.abs(ball.vx);
        }
        if (ball.x + ball.w >= W) {
          ball.x = W - ball.w;
          ball.vx = -Math.abs(ball.vx);
        }
        if (ball.y <= 0) {
          ball.y = 0;
          ball.vy = Math.abs(ball.vy);
        }

        if (
          ball.vy > 0 &&
          ball.x + ball.w > paddle.x &&
          ball.x < paddle.x + paddle.w &&
          ball.y + ball.h >= paddle.y &&
          ball.y + ball.h <= paddle.y + paddle.h + 8
        ) {
          ball.y = paddle.y - ball.h;
          ball.vy = -Math.abs(ball.vy);
        }

        for (const block of engine.blocks) {
          if (!block.alive) continue;
          if (collideAABB(ball, block)) {
            block.alive = false;
            engine.explosions.push({
              x: block.x,
              y: block.y,
              w: block.w,
              h: block.h,
              color: block.color,
              elapsed: 0,
            });
            engine.score += 10;
            ball.vy = -ball.vy;
            playBreakSound();
            if (engine.blocks.every((b) => !b.alive)) {
              if (engine.level < 5) loadLevel(engine, engine.level + 1);
              else engine.state = "win";
            }
            break;
          }
        }

        for (const exp of engine.explosions) exp.elapsed += dt * 1000;
        engine.explosions = engine.explosions.filter(
          (exp) => exp.elapsed < EXPLOSION_DURATION,
        );

        if (ball.y > H) {
          engine.lives--;
          if (engine.lives <= 0) {
            engine.lives = 0;
            engine.state = "gameover";
          } else {
            ball.x = paddle.x + (paddle.w - ball.w) / 2;
            ball.y = paddle.y - ball.h;
            const speed = LEVELS[engine.level - 1].speed;
            ball.vx = BASE_BALL_VX * speed;
            ball.vy = BASE_BALL_VY * speed;
          }
        }
      }

      function drawOverlay(message: string) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 48px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(message, W / 2, H / 2);
      }

      function drawBall(
        palette: (typeof ARKANOID_SKINS)[GameSkin],
        x: number,
        y: number,
        w: number,
        h: number,
      ) {
        if (palette.useSprites) {
          drawSprite(SPRITES.ball, x, y, w, h);
          return;
        }
        ctx.save();
        if (palette.ballGlow !== "transparent") {
          ctx.shadowColor = palette.ballGlow;
          ctx.shadowBlur = 12;
        }
        const cx = x + w / 2;
        const cy = y + h / 2;
        const gradient = ctx.createRadialGradient(
          cx - w * 0.2,
          cy - h * 0.2,
          w * 0.1,
          cx,
          cy,
          w / 2,
        );
        gradient.addColorStop(0, shadeColor(palette.ball, 0.4));
        gradient.addColorStop(1, shadeColor(palette.ball, -0.1));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      function draw(engine: Engine) {
        const palette = ARKANOID_SKINS[skinRef.current];

        ctx.fillStyle = palette.background;
        ctx.fillRect(0, 0, W, H);

        if (!palette.useSprites && skinRef.current === "retro") {
          drawScanlines();
        }

        for (const block of engine.blocks) {
          if (!block.alive) continue;
          if (palette.useSprites) {
            drawSprite(
              SPRITES.blocks[block.color],
              block.x,
              block.y,
              block.w,
              block.h,
            );
          } else {
            drawFlatBlock(
              block.x,
              block.y,
              block.w,
              block.h,
              palette.blocks[block.color],
            );
          }
        }

        for (const exp of engine.explosions) {
          if (palette.useSprites) {
            const frameIndex = Math.min(
              Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4),
              3,
            );
            drawSprite(
              EXPLOSION_FRAMES[exp.color][frameIndex],
              exp.x,
              exp.y,
              exp.w,
              exp.h,
            );
          } else {
            const alpha = Math.max(0, 1 - exp.elapsed / EXPLOSION_DURATION);
            drawFlatBlock(
              exp.x,
              exp.y,
              exp.w,
              exp.h,
              palette.blocks[exp.color],
              alpha,
            );
          }
        }

        if (palette.useSprites) {
          drawSprite(
            SPRITES.paddle,
            engine.paddle.x,
            engine.paddle.y,
            engine.paddle.w,
            engine.paddle.h,
          );
        } else {
          drawPaddleShape(
            engine.paddle.x,
            engine.paddle.y,
            engine.paddle.w,
            engine.paddle.h,
            palette.paddle,
            palette.paddleGlow,
          );
        }
        drawBall(
          palette,
          engine.ball.x,
          engine.ball.y,
          engine.ball.w,
          engine.ball.h,
        );

        ctx.save();
        if (palette.textGlow !== "transparent") {
          ctx.shadowColor = palette.textGlow;
          ctx.shadowBlur = 8;
        }
        ctx.fillStyle = palette.text;
        ctx.font = "bold 18px monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("Score: " + engine.score, 10, 10);
        ctx.textAlign = "center";
        ctx.fillText("Nivel: " + engine.level, W / 2, 10);
        ctx.restore();
        const ballSize = 16;
        const ballSpacing = 4;
        for (let i = 0; i < engine.lives; i++) {
          const bx = W - 10 - (engine.lives - i) * (ballSize + ballSpacing);
          drawBall(palette, bx, 10, ballSize, ballSize);
        }

        if (engine.state === "gameover") drawOverlay("GAME OVER");
        if (engine.state === "win") drawOverlay("¡COMPLETASTE EL JUEGO!");
      }

      let rafId = 0;
      let lastTime: number | null = null;

      function loop(ts: number) {
        const engine = engineRef.current;
        if (engine) {
          if (pausedRef.current) {
            lastTime = null;
          } else {
            const dt =
              lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
            lastTime = ts;
            update(engine, dt);
            draw(engine);
            const status =
              engine.state === "gameover" || engine.state === "win"
                ? "gameover"
                : "playing";
            onHudChangeRef.current({
              score: engine.score,
              lives: engine.lives,
              level: engine.level,
              status,
            });
          }
        }
        rafId = requestAnimationFrame(loop);
      }

      initGame();
      rafId = requestAnimationFrame(loop);

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        canvas.removeEventListener("mousemove", onMouseMove);
      };
    }, []);

    useImperativeHandle(ref, () => ({
      restart: () => {
        initGameRef.current();
      },
    }));

    function pressKey(code: string) {
      keysRef.current[code] = true;
    }
    function releaseKey(code: string) {
      keysRef.current[code] = false;
    }

    function touchHandlers(code: string) {
      return {
        onTouchStart: (e: ReactTouchEvent) => {
          e.preventDefault();
          pressKey(code);
        },
        onTouchEnd: (e: ReactTouchEvent) => {
          e.preventDefault();
          releaseKey(code);
        },
        onTouchCancel: (e: ReactTouchEvent) => {
          e.preventDefault();
          releaseKey(code);
        },
      };
    }

    return (
      <>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
        <div className="touch-controls">
          <div className="touch-controls-panel">
            <div className="touch-dpad" aria-label="Mover paleta">
              <button
                type="button"
                className="touch-dpad-btn touch-dpad-left"
                aria-label="Mover paleta a la izquierda"
                {...touchHandlers("ArrowLeft")}
              >
                <svg className="touch-dpad-arrow" viewBox="0 0 24 24">
                  <path d="M16 4 L16 20 L4 12 Z" />
                </svg>
              </button>
              <button
                type="button"
                className="touch-dpad-btn touch-dpad-right"
                aria-label="Mover paleta a la derecha"
                {...touchHandlers("ArrowRight")}
              >
                <svg className="touch-dpad-arrow" viewBox="0 0 24 24">
                  <path d="M8 4 L20 12 L8 20 Z" />
                </svg>
              </button>
              <div className="touch-dpad-hub" aria-hidden="true">
                <span className="touch-dpad-hub-gem"></span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  },
);

export default ArkanoidGame;
