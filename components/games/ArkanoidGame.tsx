"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type TouchEvent as ReactTouchEvent,
} from "react";

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
  function ArkanoidGame({ paused, onHudChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pausedRef = useRef(paused);
    const onHudChangeRef = useRef(onHudChange);
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

      function draw(engine: Engine) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);

        for (const block of engine.blocks) {
          if (block.alive)
            drawSprite(
              SPRITES.blocks[block.color],
              block.x,
              block.y,
              block.w,
              block.h,
            );
        }

        for (const exp of engine.explosions) {
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
        }

        drawSprite(
          SPRITES.paddle,
          engine.paddle.x,
          engine.paddle.y,
          engine.paddle.w,
          engine.paddle.h,
        );
        drawSprite(
          SPRITES.ball,
          engine.ball.x,
          engine.ball.y,
          engine.ball.w,
          engine.ball.h,
        );

        ctx.fillStyle = "#fff";
        ctx.font = "bold 18px monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("Score: " + engine.score, 10, 10);
        ctx.textAlign = "center";
        ctx.fillText("Nivel: " + engine.level, W / 2, 10);
        const ballSize = 16;
        const ballSpacing = 4;
        for (let i = 0; i < engine.lives; i++) {
          const bx = W - 10 - (engine.lives - i) * (ballSize + ballSpacing);
          drawSprite(SPRITES.ball, bx, 10, ballSize, ballSize);
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
          <button
            type="button"
            className="touch-btn"
            aria-label="Mover paleta a la izquierda"
            {...touchHandlers("ArrowLeft")}
          >
            ◀
          </button>
          <button
            type="button"
            className="touch-btn"
            aria-label="Mover paleta a la derecha"
            {...touchHandlers("ArrowRight")}
          >
            ▶
          </button>
        </div>
      </>
    );
  },
);

export default ArkanoidGame;
