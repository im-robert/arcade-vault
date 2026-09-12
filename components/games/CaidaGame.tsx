"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type TouchEvent as ReactTouchEvent,
} from "react";

export interface CaidaHudState {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover";
}

export interface CaidaGameHandle {
  restart: () => void;
}

interface CaidaGameProps {
  paused: boolean;
  onHudChange: (state: CaidaHudState) => void;
}

const W = 800;
const H = 600;

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const BOARD_X = 40;
const BOARD_Y = 0;
const SIDEBAR_X = BOARD_X + COLS * BLOCK + 50; // 390

const COLORS = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9e9e9e", // N - tuerca
] as const;

const PIECES: (number[][] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

interface Piece {
  type: number;
  shape: number[][];
  x: number;
  y: number;
}

interface Engine {
  board: number[][];
  current: Piece;
  next: Piece;
  score: number;
  lines: number;
  level: number;
  dropInterval: number;
  dropAccum: number;
  gameOver: boolean;
}

interface Actions {
  moveLeft: () => void;
  moveRight: () => void;
  rotate: () => void;
  softDrop: () => void;
  hardDrop: () => void;
}

function createBoard(): number[][] {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = (PIECES[type] as number[][]).map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

function collide(board: number[][], shape: number[][], ox: number, oy: number) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape: number[][]) {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

const CaidaGame = forwardRef<CaidaGameHandle, CaidaGameProps>(
  function CaidaGame({ paused, onHudChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pausedRef = useRef(paused);
    const onHudChangeRef = useRef(onHudChange);
    const engineRef = useRef<Engine | null>(null);
    const initGameRef = useRef<() => void>(() => {});
    const actionsRef = useRef<Actions | null>(null);

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

      function reportHud(engine: Engine) {
        onHudChangeRef.current({
          score: engine.score,
          lives: 1,
          level: engine.level,
          status: engine.gameOver ? "gameover" : "playing",
        });
      }

      function initGame() {
        const engine: Engine = {
          board: createBoard(),
          current: randomPiece(),
          next: randomPiece(),
          score: 0,
          lines: 0,
          level: 1,
          dropInterval: 1000,
          dropAccum: 0,
          gameOver: false,
        };
        engineRef.current = engine;
        reportHud(engine);
      }
      initGameRef.current = initGame;

      function clearLines(engine: Engine) {
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (engine.board[r].every((v) => v !== 0)) {
            engine.board.splice(r, 1);
            engine.board.unshift(new Array(COLS).fill(0));
            cleared++;
            r++;
          }
        }
        if (cleared) {
          engine.lines += cleared;
          engine.score += (LINE_SCORES[cleared] || 0) * engine.level;
          engine.level = Math.floor(engine.lines / 10) + 1;
          engine.dropInterval = Math.max(100, 1000 - (engine.level - 1) * 90);
        }
      }

      function merge(engine: Engine) {
        const { current } = engine;
        for (let r = 0; r < current.shape.length; r++)
          for (let c = 0; c < current.shape[r].length; c++)
            if (current.shape[r][c])
              engine.board[current.y + r][current.x + c] = current.shape[r][c];
      }

      function spawn(engine: Engine) {
        engine.current = engine.next;
        engine.next = randomPiece();
        if (
          collide(
            engine.board,
            engine.current.shape,
            engine.current.x,
            engine.current.y,
          )
        ) {
          engine.gameOver = true;
        }
      }

      function lockPiece(engine: Engine) {
        merge(engine);
        clearLines(engine);
        spawn(engine);
      }

      function ghostY(engine: Engine) {
        let gy = engine.current.y;
        while (
          !collide(engine.board, engine.current.shape, engine.current.x, gy + 1)
        )
          gy++;
        return gy;
      }

      function withEngine(fn: (engine: Engine) => void) {
        return () => {
          const engine = engineRef.current;
          if (!engine || pausedRef.current || engine.gameOver) return;
          fn(engine);
        };
      }

      const actions: Actions = {
        moveLeft: withEngine((engine) => {
          if (
            !collide(
              engine.board,
              engine.current.shape,
              engine.current.x - 1,
              engine.current.y,
            )
          )
            engine.current.x -= 1;
        }),
        moveRight: withEngine((engine) => {
          if (
            !collide(
              engine.board,
              engine.current.shape,
              engine.current.x + 1,
              engine.current.y,
            )
          )
            engine.current.x += 1;
        }),
        rotate: withEngine((engine) => {
          const rotated = rotateCW(engine.current.shape);
          const kicks = [0, -1, 1, -2, 2];
          for (const kick of kicks) {
            if (
              !collide(
                engine.board,
                rotated,
                engine.current.x + kick,
                engine.current.y,
              )
            ) {
              engine.current.shape = rotated;
              engine.current.x += kick;
              return;
            }
          }
        }),
        softDrop: withEngine((engine) => {
          if (
            !collide(
              engine.board,
              engine.current.shape,
              engine.current.x,
              engine.current.y + 1,
            )
          ) {
            engine.current.y++;
            engine.score += 1;
          } else {
            lockPiece(engine);
          }
        }),
        hardDrop: withEngine((engine) => {
          const gy = ghostY(engine);
          engine.score += (gy - engine.current.y) * 2;
          engine.current.y = gy;
          lockPiece(engine);
        }),
      };
      actionsRef.current = actions;

      function onKeyDown(e: KeyboardEvent) {
        switch (e.code) {
          case "ArrowLeft":
            actions.moveLeft();
            break;
          case "ArrowRight":
            actions.moveRight();
            break;
          case "ArrowDown":
            actions.softDrop();
            break;
          case "ArrowUp":
          case "KeyX":
            actions.rotate();
            break;
          case "Space":
            e.preventDefault();
            actions.hardDrop();
            break;
        }
      }

      window.addEventListener("keydown", onKeyDown);

      function drawBlock(
        context: CanvasRenderingContext2D,
        x: number,
        y: number,
        colorIndex: number,
        size: number,
        alpha?: number,
      ) {
        if (!colorIndex) return;
        const color = COLORS[colorIndex];
        context.globalAlpha = alpha ?? 1;
        context.fillStyle = color as string;
        context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
        context.fillStyle = "rgba(255,255,255,0.12)";
        context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
        context.globalAlpha = 1;
      }

      function drawGrid() {
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 0.5;
        for (let c = 1; c < COLS; c++) {
          ctx.beginPath();
          ctx.moveTo(c * BLOCK, 0);
          ctx.lineTo(c * BLOCK, ROWS * BLOCK);
          ctx.stroke();
        }
        for (let r = 1; r < ROWS; r++) {
          ctx.beginPath();
          ctx.moveTo(0, r * BLOCK);
          ctx.lineTo(COLS * BLOCK, r * BLOCK);
          ctx.stroke();
        }
      }

      function drawBoard(engine: Engine) {
        ctx.save();
        ctx.translate(BOARD_X, BOARD_Y);

        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
        drawGrid();

        for (let r = 0; r < ROWS; r++)
          for (let c = 0; c < COLS; c++)
            drawBlock(ctx, c, r, engine.board[r][c], BLOCK);

        if (!engine.gameOver) {
          const gy = ghostY(engine);
          for (let r = 0; r < engine.current.shape.length; r++)
            for (let c = 0; c < engine.current.shape[r].length; c++)
              if (engine.current.shape[r][c])
                drawBlock(
                  ctx,
                  engine.current.x + c,
                  gy + r,
                  engine.current.shape[r][c],
                  BLOCK,
                  0.2,
                );

          for (let r = 0; r < engine.current.shape.length; r++)
            for (let c = 0; c < engine.current.shape[r].length; c++)
              drawBlock(
                ctx,
                engine.current.x + c,
                engine.current.y + r,
                engine.current.shape[r][c],
                BLOCK,
              );
        }

        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
        ctx.restore();
      }

      function drawSidebar(engine: Engine) {
        ctx.textAlign = "left";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px monospace";
        ctx.fillText("SCORE", SIDEBAR_X, 40);
        ctx.font = "20px monospace";
        ctx.fillText(engine.score.toLocaleString(), SIDEBAR_X, 66);

        ctx.font = "bold 14px monospace";
        ctx.fillText("LÍNEAS", SIDEBAR_X, 106);
        ctx.font = "20px monospace";
        ctx.fillText(String(engine.lines), SIDEBAR_X, 132);

        ctx.font = "bold 14px monospace";
        ctx.fillText("NIVEL", SIDEBAR_X, 172);
        ctx.font = "20px monospace";
        ctx.fillText(String(engine.level), SIDEBAR_X, 198);

        ctx.font = "bold 14px monospace";
        ctx.fillText("SIGUIENTE", SIDEBAR_X, 238);

        const NB = 26;
        const boxSize = 4 * NB;
        const boxX = SIDEBAR_X;
        const boxY = 252;
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.strokeRect(boxX, boxY, boxSize, boxSize);

        ctx.save();
        ctx.translate(boxX, boxY);
        const shape = engine.next.shape;
        const offX = Math.floor((4 - shape[0].length) / 2);
        const offY = Math.floor((4 - shape.length) / 2);
        for (let r = 0; r < shape.length; r++)
          for (let c = 0; c < shape[r].length; c++)
            drawBlock(ctx, offX + c, offY + r, shape[r][c], NB);
        ctx.restore();

        if (engine.gameOver) {
          ctx.font = "bold 16px monospace";
          ctx.fillStyle = "#e57373";
          ctx.fillText("GAME OVER", SIDEBAR_X, boxY + boxSize + 40);
        }
      }

      function draw(engine: Engine) {
        ctx.fillStyle = "#0a0a18";
        ctx.fillRect(0, 0, W, H);
        drawBoard(engine);
        drawSidebar(engine);
      }

      let rafId = 0;
      let lastTime: number | null = null;

      function loop(ts: number) {
        const engine = engineRef.current;
        if (engine) {
          if (pausedRef.current) {
            lastTime = null;
          } else {
            const dt = lastTime === null ? 0 : ts - lastTime;
            lastTime = ts;
            if (!engine.gameOver) {
              engine.dropAccum += dt;
              if (engine.dropAccum >= engine.dropInterval) {
                engine.dropAccum = 0;
                if (
                  !collide(
                    engine.board,
                    engine.current.shape,
                    engine.current.x,
                    engine.current.y + 1,
                  )
                ) {
                  engine.current.y++;
                } else {
                  lockPiece(engine);
                }
              }
            }
            draw(engine);
            reportHud(engine);
          }
        }
        rafId = requestAnimationFrame(loop);
      }

      initGame();
      rafId = requestAnimationFrame(loop);

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("keydown", onKeyDown);
      };
    }, []);

    useImperativeHandle(ref, () => ({
      restart: () => {
        initGameRef.current();
      },
    }));

    function touchAction(action: () => void) {
      return (e: ReactTouchEvent) => {
        e.preventDefault();
        action();
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
            <div className="touch-dpad" aria-label="Mover pieza">
              <button
                type="button"
                className="touch-dpad-btn touch-dpad-up"
                aria-label="Rotar"
                onTouchStart={touchAction(() => actionsRef.current?.rotate())}
              >
                <span className="touch-dpad-glyph">↻</span>
              </button>
              <button
                type="button"
                className="touch-dpad-btn touch-dpad-left"
                aria-label="Mover a la izquierda"
                onTouchStart={touchAction(() => actionsRef.current?.moveLeft())}
              >
                <svg className="touch-dpad-arrow" viewBox="0 0 24 24">
                  <path d="M16 4 L16 20 L4 12 Z" />
                </svg>
              </button>
              <button
                type="button"
                className="touch-dpad-btn touch-dpad-right"
                aria-label="Mover a la derecha"
                onTouchStart={touchAction(() =>
                  actionsRef.current?.moveRight(),
                )}
              >
                <svg className="touch-dpad-arrow" viewBox="0 0 24 24">
                  <path d="M8 4 L20 12 L8 20 Z" />
                </svg>
              </button>
              <button
                type="button"
                className="touch-dpad-btn touch-dpad-down"
                aria-label="Bajar"
                onTouchStart={touchAction(() => actionsRef.current?.softDrop())}
              >
                <svg className="touch-dpad-arrow" viewBox="0 0 24 24">
                  <path d="M4 8 L20 8 L12 20 Z" />
                </svg>
              </button>
              <div className="touch-dpad-hub" aria-hidden="true">
                <span className="touch-dpad-hub-gem"></span>
              </div>
            </div>
            <div className="touch-actions">
              <button
                type="button"
                className="touch-action-btn a"
                aria-label="Caída rápida"
                onTouchStart={touchAction(() => actionsRef.current?.hardDrop())}
              >
                <span className="touch-action-ring" aria-hidden="true"></span>
                <span className="touch-action-label">CAÍDA</span>
              </button>
            </div>
          </div>
        </div>
      </>
    );
  },
);

export default CaidaGame;
