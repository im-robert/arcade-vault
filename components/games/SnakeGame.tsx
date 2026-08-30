"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type TouchEvent as ReactTouchEvent,
} from "react";

export interface SnakeHudState {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover";
}

export interface SnakeGameHandle {
  restart: () => void;
}

interface SnakeGameProps {
  paused: boolean;
  onHudChange: (state: SnakeHudState) => void;
}

const W = 800;
const H = 600;
const CELL = 20;
const COLS = W / CELL;
const ROWS = H / CELL;

const BASE_STEP = 0.14;
const MIN_STEP = 0.06;
const STEP_DECAY = 0.008;
const FRUITS_PER_LEVEL = 5;

interface Sprite {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

// Recortes de la fila de frutas pixel-art de /public/games/snake-fruits.png
const FRUIT_SPRITES: Sprite[] = [
  { sx: 34, sy: 136, sw: 110, sh: 160 }, // banana
  { sx: 186, sy: 136, sw: 150, sh: 160 }, // orange
  { sx: 378, sy: 136, sw: 110, sh: 160 }, // grape
  { sx: 894, sy: 136, sw: 110, sh: 160 }, // strawberry
  { sx: 1066, sy: 136, sw: 110, sh: 160 }, // cherry
  { sx: 1228, sy: 136, sw: 130, sh: 160 }, // carrot
  { sx: 1734, sy: 136, sw: 150, sh: 160 }, // watermelon
  { sx: 2250, sy: 136, sw: 140, sh: 160 }, // lemon
  { sx: 2786, sy: 136, sw: 110, sh: 160 }, // apple
  { sx: 2948, sy: 136, sw: 130, sh: 160 }, // tomato
];

type Point = { x: number; y: number };
type EngineState = "playing" | "gameover";

interface Engine {
  snake: Point[];
  dir: Point;
  nextDir: Point;
  food: { pos: Point; sprite: number };
  score: number;
  level: number;
  state: EngineState;
  moveTimer: number;
  stepInterval: number;
  fruitsEaten: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

const SnakeGame = forwardRef<SnakeGameHandle, SnakeGameProps>(
  function SnakeGame({ paused, onHudChange }, ref) {
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
      spriteImg.src = "/games/snake-fruits.png";

      function onKeyDown(e: KeyboardEvent) {
        keys[e.key] = true;
        const engine = engineRef.current;
        if (!engine || engine.state !== "playing") return;
        if (e.key === "ArrowLeft" && engine.dir.x === 0)
          engine.nextDir = { x: -1, y: 0 };
        else if (e.key === "ArrowRight" && engine.dir.x === 0)
          engine.nextDir = { x: 1, y: 0 };
        else if (e.key === "ArrowUp" && engine.dir.y === 0)
          engine.nextDir = { x: 0, y: -1 };
        else if (e.key === "ArrowDown" && engine.dir.y === 0)
          engine.nextDir = { x: 0, y: 1 };
      }
      function onKeyUp(e: KeyboardEvent) {
        keys[e.key] = false;
      }

      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);

      function randomFood(snake: Point[]): { pos: Point; sprite: number } {
        let pos: Point;
        do {
          pos = { x: randInt(0, COLS - 1), y: randInt(0, ROWS - 1) };
        } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
        return { pos, sprite: randInt(0, FRUIT_SPRITES.length - 1) };
      }

      function initGame() {
        const snake: Point[] = [
          { x: 5, y: 15 },
          { x: 4, y: 15 },
          { x: 3, y: 15 },
        ];
        const engine: Engine = {
          snake,
          dir: { x: 1, y: 0 },
          nextDir: { x: 1, y: 0 },
          food: randomFood(snake),
          score: 0,
          level: 1,
          state: "playing",
          moveTimer: 0,
          stepInterval: BASE_STEP,
          fruitsEaten: 0,
        };
        engineRef.current = engine;
        onHudChangeRef.current({
          score: engine.score,
          lives: 1,
          level: engine.level,
          status: "playing",
        });
      }
      initGameRef.current = initGame;

      function step(engine: Engine) {
        engine.dir = engine.nextDir;
        const head = engine.snake[0];
        const newHead: Point = {
          x: head.x + engine.dir.x,
          y: head.y + engine.dir.y,
        };

        if (
          newHead.x < 0 ||
          newHead.x >= COLS ||
          newHead.y < 0 ||
          newHead.y >= ROWS ||
          engine.snake.some((s) => s.x === newHead.x && s.y === newHead.y)
        ) {
          engine.state = "gameover";
          return;
        }

        engine.snake.unshift(newHead);

        if (
          newHead.x === engine.food.pos.x &&
          newHead.y === engine.food.pos.y
        ) {
          engine.score += 10;
          engine.fruitsEaten++;
          if (engine.fruitsEaten % FRUITS_PER_LEVEL === 0) {
            engine.level++;
            engine.stepInterval = Math.max(
              MIN_STEP,
              BASE_STEP - engine.level * STEP_DECAY,
            );
          }
          engine.food = randomFood(engine.snake);
        } else {
          engine.snake.pop();
        }
      }

      function update(engine: Engine, dt: number) {
        if (engine.state !== "playing") return;
        engine.moveTimer += dt;
        while (engine.moveTimer >= engine.stepInterval) {
          engine.moveTimer -= engine.stepInterval;
          step(engine);
          if (engine.state !== "playing") break;
        }
      }

      function drawSprite(sp: Sprite, x: number, y: number, size: number) {
        if (!spriteLoaded) return;
        ctx.drawImage(spriteImg, sp.sx, sp.sy, sp.sw, sp.sh, x, y, size, size);
      }

      function draw(engine: Engine) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        for (let x = 0; x <= COLS; x++) {
          ctx.beginPath();
          ctx.moveTo(x * CELL, 0);
          ctx.lineTo(x * CELL, H);
          ctx.stroke();
        }
        for (let y = 0; y <= ROWS; y++) {
          ctx.beginPath();
          ctx.moveTo(0, y * CELL);
          ctx.lineTo(W, y * CELL);
          ctx.stroke();
        }

        const foodSize = CELL * 1.6;
        const foodOffset = (foodSize - CELL) / 2;
        drawSprite(
          FRUIT_SPRITES[engine.food.sprite],
          engine.food.pos.x * CELL - foodOffset,
          engine.food.pos.y * CELL - foodOffset,
          foodSize,
        );

        engine.snake.forEach((seg, i) => {
          ctx.fillStyle = i === 0 ? "#39ff6a" : "#1fae42";
          ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
        });

        ctx.fillStyle = "#fff";
        ctx.font = "bold 18px monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("Score: " + engine.score, 10, 10);
        ctx.textAlign = "center";
        ctx.fillText("Nivel: " + engine.level, W / 2, 10);

        if (engine.state === "gameover") {
          ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 48px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("GAME OVER", W / 2, H / 2);
        }
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
            onHudChangeRef.current({
              score: engine.score,
              lives: engine.state === "gameover" ? 0 : 1,
              level: engine.level,
              status: engine.state === "gameover" ? "gameover" : "playing",
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
      };
    }, []);

    useImperativeHandle(ref, () => ({
      restart: () => {
        initGameRef.current();
      },
    }));

    function pressDir(dir: Point) {
      const engine = engineRef.current;
      if (!engine || engine.state !== "playing") return;
      if (dir.x !== 0 && engine.dir.x === 0) engine.nextDir = dir;
      else if (dir.y !== 0 && engine.dir.y === 0) engine.nextDir = dir;
    }

    function touchHandlers(dir: Point) {
      return {
        onTouchStart: (e: ReactTouchEvent) => {
          e.preventDefault();
          pressDir(dir);
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
            aria-label="Mover a la izquierda"
            {...touchHandlers({ x: -1, y: 0 })}
          >
            ◀
          </button>
          <button
            type="button"
            className="touch-btn"
            aria-label="Mover arriba"
            {...touchHandlers({ x: 0, y: -1 })}
          >
            ▲
          </button>
          <button
            type="button"
            className="touch-btn"
            aria-label="Mover abajo"
            {...touchHandlers({ x: 0, y: 1 })}
          >
            ▼
          </button>
          <button
            type="button"
            className="touch-btn"
            aria-label="Mover a la derecha"
            {...touchHandlers({ x: 1, y: 0 })}
          >
            ▶
          </button>
        </div>
      </>
    );
  },
);

export default SnakeGame;
