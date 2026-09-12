"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type TouchEvent as ReactTouchEvent,
} from "react";
import {
  FROGGER_SKINS,
  type FroggerPalette,
  type GameSkin,
} from "@/lib/game-skins";

export interface FroggerHudState {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "gameover";
}

export interface FroggerGameHandle {
  restart: () => void;
}

interface FroggerGameProps {
  paused: boolean;
  skin: GameSkin;
  onHudChange: (state: FroggerHudState) => void;
}

const COLS = 16;
const ROWS = 14;
const CELL = 40;
const CANVAS_W = COLS * CELL; // 640
const CANVAS_H = ROWS * CELL; // 560

// Zonas (índice de fila, 0 = arriba)
const ROW_GOALS = 0;
const ROW_RIVER_TOP = 1;
const ROW_RIVER_BOT = 6;
const ROW_SAFE_MID = 7;
const ROW_ROAD_TOP = 8;
const ROW_ROAD_BOT = 12;
const ROW_START = 13;

const GOAL_COUNT = 5;
const GOAL_WIDTH = 2;
const goalStartCol = (i: number) => 1 + 3 * i;

const JUMP_MS = 120;
const LEVEL_SPEED_MUL = 1.15;
const BASE_TIME = 15;
const MIN_TIME = 6;
const TIME_DECAY_PER_LEVEL = 1.5;
const TURTLE_VISIBLE_S = 3;
const TURTLE_SUBMERGE_S = 1.5;
const TURTLE_CYCLE_S = TURTLE_VISIBLE_S + TURTLE_SUBMERGE_S;

type Direction = "up" | "down" | "left" | "right";

interface Entity {
  col: number; // posición fraccional en unidades de celda
  width: number; // celdas
  type: "car" | "truck" | "log" | "turtle";
  submerged?: boolean;
  submergeOffset?: number;
  colorIdx: number;
}

interface Lane {
  row: number;
  speed: number; // celdas / segundo
  dir: 1 | -1;
  kind: "road" | "river";
  entities: Entity[];
  submergeTimer: number;
}

interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number;
  fromCol: number;
  fromRow: number;
  targetCol: number;
  targetRow: number;
}

interface Engine {
  frog: Frog;
  lanes: Lane[];
  goalsFilled: boolean[];
  minRowReached: number;
  score: number;
  lives: number;
  level: number;
  timeMax: number;
  timeLeft: number;
  state: "playing" | "gameover";
  pendingDir: Direction | null;
}

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
const randInt = (min: number, max: number) =>
  Math.floor(min + Math.random() * (max - min + 1));

function isRoadRow(row: number) {
  return row >= ROW_ROAD_TOP && row <= ROW_ROAD_BOT;
}
function isRiverRow(row: number) {
  return row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT;
}
function goalIndexForCol(col: number) {
  for (let i = 0; i < GOAL_COUNT; i++) {
    const start = goalStartCol(i);
    if (col >= start && col < start + GOAL_WIDTH) return i;
  }
  return -1;
}
function overlaps(frogCol: number, entityCol: number, width: number) {
  return entityCol < frogCol + 1 && entityCol + width > frogCol;
}
function checkRoadCollision(frog: Frog, lanes: Lane[]) {
  for (const lane of lanes) {
    if (lane.kind !== "road" || lane.row !== frog.row) continue;
    for (const e of lane.entities) {
      if (overlaps(frog.col, e.col, e.width)) return true;
    }
  }
  return false;
}
function getSupport(frog: Frog, lane: Lane): Entity | null {
  for (const e of lane.entities) {
    if (!overlaps(frog.col, e.col, e.width)) continue;
    if (e.type === "turtle" && e.submerged) continue;
    return e;
  }
  return null;
}
function findLane(lanes: Lane[], row: number): Lane | undefined {
  return lanes.find((l) => l.row === row);
}

function buildLanes(level: number): Lane[] {
  const mul = Math.pow(LEVEL_SPEED_MUL, level - 1);
  const lanes: Lane[] = [];

  const roadBaseSpeeds = [1.6, 2.2, 1.8, 3.2, 2.6];
  for (let i = 0; i < 5; i++) {
    const row = ROW_ROAD_TOP + i;
    const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
    const speed = roadBaseSpeeds[i] * mul;
    const entities: Entity[] = [];
    let col = -randInt(0, 3);
    while (col < COLS + 4) {
      const isTruck = Math.random() < 0.3;
      const width = isTruck ? 3 : 1 + randInt(0, 1);
      entities.push({
        col,
        width,
        type: isTruck ? "truck" : "car",
        colorIdx: randInt(0, 2),
      });
      col += width + 2 + Math.random() * 2;
    }
    lanes.push({ row, speed, dir, kind: "road", entities, submergeTimer: 0 });
  }

  const riverBaseSpeeds = [1.2, 1.8, 1.0, 2.4, 1.6, 2.0];
  for (let i = 0; i < 6; i++) {
    const row = ROW_RIVER_TOP + i;
    const dir: 1 | -1 = i % 2 === 0 ? -1 : 1;
    const speed = riverBaseSpeeds[i] * mul;
    const isTurtleLane = i % 3 === 2;
    const entities: Entity[] = [];
    let col = -randInt(0, 3);
    let idx = 0;
    while (col < COLS + 4) {
      if (isTurtleLane) {
        const width = 2 + randInt(0, 1);
        entities.push({
          col,
          width,
          type: "turtle",
          submerged: false,
          submergeOffset: idx * 1.5,
          colorIdx: 0,
        });
        col += width + 1.5 + Math.random();
      } else {
        const width = 2 + randInt(0, 2);
        entities.push({ col, width, type: "log", colorIdx: 0 });
        col += width + 1 + Math.random();
      }
      idx++;
    }
    lanes.push({
      row,
      speed,
      dir,
      kind: "river",
      entities,
      submergeTimer: Math.random() * TURTLE_CYCLE_S,
    });
  }

  return lanes;
}

const FroggerGame = forwardRef<FroggerGameHandle, FroggerGameProps>(
  function FroggerGame({ paused, skin, onHudChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pausedRef = useRef(paused);
    const onHudChangeRef = useRef(onHudChange);
    const skinRef = useRef<GameSkin>(skin);
    const engineRef = useRef<Engine | null>(null);
    const initGameRef = useRef<() => void>(() => {});

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

      function makeFrogAtStart(): Frog {
        const col = Math.floor(COLS / 2);
        return {
          col,
          row: ROW_START,
          animating: false,
          animT: 0,
          fromCol: col,
          fromRow: ROW_START,
          targetCol: col,
          targetRow: ROW_START,
        };
      }

      function initGame() {
        const level = 1;
        const engine: Engine = {
          frog: makeFrogAtStart(),
          lanes: buildLanes(level),
          goalsFilled: new Array(GOAL_COUNT).fill(false),
          minRowReached: ROW_START,
          score: 0,
          lives: 3,
          level,
          timeMax: BASE_TIME,
          timeLeft: BASE_TIME,
          state: "playing",
          pendingDir: null,
        };
        engineRef.current = engine;
        onHudChangeRef.current({
          score: engine.score,
          lives: engine.lives,
          level: engine.level,
          status: "playing",
        });
      }
      initGameRef.current = initGame;

      function resetFrogPosition(engine: Engine) {
        engine.frog = makeFrogAtStart();
        engine.timeLeft = engine.timeMax;
      }

      function killFrog(engine: Engine) {
        engine.lives -= 1;
        if (engine.lives <= 0) {
          engine.lives = 0;
          engine.state = "gameover";
          return;
        }
        resetFrogPosition(engine);
      }

      function completeRound(engine: Engine) {
        engine.level += 1;
        engine.goalsFilled = new Array(GOAL_COUNT).fill(false);
        engine.lanes = buildLanes(engine.level);
        engine.timeMax = Math.max(
          MIN_TIME,
          BASE_TIME - (engine.level - 1) * TIME_DECAY_PER_LEVEL,
        );
        engine.minRowReached = ROW_START;
        resetFrogPosition(engine);
      }

      function resolveLanding(engine: Engine) {
        const frog = engine.frog;

        if (frog.row < engine.minRowReached) {
          engine.score += 10 * (engine.minRowReached - frog.row);
          engine.minRowReached = frog.row;
        }

        if (isRoadRow(frog.row) && checkRoadCollision(frog, engine.lanes)) {
          killFrog(engine);
          return;
        }

        if (frog.row === ROW_GOALS) {
          const idx = goalIndexForCol(frog.col);
          if (idx === -1 || engine.goalsFilled[idx]) {
            killFrog(engine);
            return;
          }
          engine.goalsFilled[idx] = true;
          engine.score += 50 + Math.floor(engine.timeLeft) * 10;
          if (engine.goalsFilled.every(Boolean)) {
            engine.score += 200;
            completeRound(engine);
            return;
          }
          resetFrogPosition(engine);
          return;
        }

        if (isRiverRow(frog.row)) {
          const lane = findLane(engine.lanes, frog.row);
          const support = lane ? getSupport(frog, lane) : null;
          if (!support) killFrog(engine);
        }
      }

      function startJump(engine: Engine, dir: Direction) {
        const frog = engine.frog;
        // Los saltos verticales conservan la columna fraccional exacta del
        // salto anterior (p. ej. mientras el sapo viaja sobre un tronco):
        // redondearla aquí provocaba un "salto" lateral visible al saltar
        // arriba/abajo estando montado en un tronco/tortuga en movimiento.
        // Solo los saltos horizontales alinean la columna a la cuadrícula.
        let targetCol = frog.col;
        let targetRow = frog.row;
        if (dir === "up") targetRow -= 1;
        else if (dir === "down") targetRow += 1;
        else if (dir === "left") targetCol = Math.round(frog.col) - 1;
        else if (dir === "right") targetCol = Math.round(frog.col) + 1;
        targetCol = clamp(targetCol, 0, COLS - 1);
        targetRow = clamp(targetRow, 0, ROWS - 1);
        if (targetCol === frog.col && targetRow === frog.row) return;
        frog.fromCol = frog.col;
        frog.fromRow = frog.row;
        frog.targetCol = targetCol;
        frog.targetRow = targetRow;
        frog.animating = true;
        frog.animT = 0;
      }

      function onKeyDown(e: KeyboardEvent) {
        const engine = engineRef.current;
        if (!engine || engine.state !== "playing") return;
        if (e.key === "ArrowUp") engine.pendingDir = "up";
        else if (e.key === "ArrowDown") engine.pendingDir = "down";
        else if (e.key === "ArrowLeft") engine.pendingDir = "left";
        else if (e.key === "ArrowRight") engine.pendingDir = "right";
      }

      window.addEventListener("keydown", onKeyDown);

      function update(engine: Engine, dt: number) {
        if (engine.state !== "playing") return;

        for (const lane of engine.lanes) {
          for (const e of lane.entities) {
            e.col += lane.speed * lane.dir * dt;
            if (lane.dir === 1 && e.col > COLS + 4) e.col = -e.width;
            else if (lane.dir === -1 && e.col + e.width < -4) e.col = COLS;
          }
          if (lane.kind === "river") {
            lane.submergeTimer += dt;
            for (const e of lane.entities) {
              if (e.type !== "turtle") continue;
              const phase =
                (lane.submergeTimer + (e.submergeOffset ?? 0)) % TURTLE_CYCLE_S;
              e.submerged = phase >= TURTLE_VISIBLE_S;
            }
          }
        }

        const frog = engine.frog;

        if (frog.animating) {
          frog.animT += dt * 1000;
          if (frog.animT >= JUMP_MS) {
            frog.animating = false;
            frog.animT = JUMP_MS;
            frog.col = frog.targetCol;
            frog.row = frog.targetRow;
            resolveLanding(engine);
          }
        } else if (engine.state === "playing") {
          if (engine.pendingDir) {
            const dir = engine.pendingDir;
            engine.pendingDir = null;
            startJump(engine, dir);
          } else if (isRiverRow(frog.row)) {
            const lane = findLane(engine.lanes, frog.row);
            const support = lane ? getSupport(frog, lane) : null;
            if (!support) {
              killFrog(engine);
            } else if (lane) {
              frog.col += lane.speed * lane.dir * dt;
              if (frog.col < 0 || frog.col + 1 > COLS) killFrog(engine);
            }
          } else if (
            isRoadRow(frog.row) &&
            checkRoadCollision(frog, engine.lanes)
          ) {
            killFrog(engine);
          }
        }

        if (engine.state === "playing") {
          engine.timeLeft -= dt;
          if (engine.timeLeft <= 0) {
            engine.timeLeft = 0;
            killFrog(engine);
          }
        }
      }

      function rowBackground(row: number, pal: FroggerPalette) {
        if (row === ROW_GOALS) return pal.goalBackground;
        if (isRiverRow(row)) return pal.riverBackground;
        if (row === ROW_SAFE_MID || row === ROW_START)
          return pal.safeBackground;
        return pal.roadBackground;
      }

      function drawEntity(
        e: Entity,
        row: number,
        pal: FroggerPalette,
        glow: boolean,
      ) {
        const x = e.col * CELL;
        const w = e.width * CELL;
        const y0 = row * CELL;
        if (e.type === "car") {
          ctx.fillStyle = pal.carColors[e.colorIdx % pal.carColors.length];
          if (glow) {
            ctx.shadowColor = ctx.fillStyle as string;
            ctx.shadowBlur = 12;
          }
          ctx.fillRect(x + 3, y0 + 8, w - 6, CELL - 16);
          ctx.shadowBlur = 0;
          ctx.fillStyle = pal.carWheel;
          const wheelY = y0 + CELL - 10;
          ctx.beginPath();
          ctx.arc(x + 8, wheelY, 5, 0, Math.PI * 2);
          ctx.arc(x + w - 8, wheelY, 5, 0, Math.PI * 2);
          ctx.fill();
        } else if (e.type === "truck") {
          ctx.fillStyle = pal.truckBody;
          if (glow) {
            ctx.shadowColor = pal.truckAccent;
            ctx.shadowBlur = 12;
          }
          ctx.fillRect(x + 2, y0 + 6, w - 4, CELL - 12);
          ctx.shadowBlur = 0;
          ctx.fillStyle = pal.truckAccent;
          ctx.fillRect(x + 2, y0 + 6, CELL * 0.6, CELL - 12);
          ctx.fillStyle = pal.truckWheel;
          const wheelY = y0 + CELL - 8;
          ctx.beginPath();
          ctx.arc(x + 10, wheelY, 6, 0, Math.PI * 2);
          ctx.arc(x + w - 10, wheelY, 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (e.type === "log") {
          ctx.fillStyle = pal.log;
          if (glow) {
            ctx.shadowColor = pal.log;
            ctx.shadowBlur = 10;
          }
          ctx.fillRect(x + 2, y0 + 10, w - 4, CELL - 20);
          ctx.shadowBlur = 0;
          ctx.strokeStyle = pal.logGrain;
          ctx.lineWidth = 1;
          for (let lx = x + 8; lx < x + w - 4; lx += 10) {
            ctx.beginPath();
            ctx.moveTo(lx, y0 + 10);
            ctx.lineTo(lx, y0 + CELL - 10);
            ctx.stroke();
          }
        } else if (e.type === "turtle") {
          if (e.submerged) {
            ctx.strokeStyle = pal.turtleSubmerged;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 4, y0 + 12, w - 8, CELL - 24);
          } else {
            ctx.fillStyle = pal.turtle;
            if (glow) {
              ctx.shadowColor = pal.turtle;
              ctx.shadowBlur = 10;
            }
            for (let i = 0; i < e.width; i++) {
              ctx.beginPath();
              ctx.ellipse(
                x + i * CELL + CELL / 2,
                y0 + CELL / 2,
                CELL / 2 - 4,
                CELL / 2 - 10,
                0,
                0,
                Math.PI * 2,
              );
              ctx.fill();
            }
            ctx.shadowBlur = 0;
            ctx.fillStyle = pal.turtleSpot;
            for (let i = 0; i < e.width; i++) {
              ctx.beginPath();
              ctx.arc(
                x + i * CELL + CELL / 2,
                y0 + CELL / 2,
                4,
                0,
                Math.PI * 2,
              );
              ctx.fill();
            }
          }
        }
      }

      function drawFrog(frog: Frog, pal: FroggerPalette, glow: boolean) {
        let vc = frog.col;
        let vr = frog.row;
        let liftT = 0;
        if (frog.animating) {
          const t = clamp(frog.animT / JUMP_MS, 0, 1);
          vc = frog.fromCol + (frog.targetCol - frog.fromCol) * t;
          vr = frog.fromRow + (frog.targetRow - frog.fromRow) * t;
          liftT = t;
        }
        const cx = vc * CELL + CELL / 2;
        const cy = vr * CELL + CELL / 2;
        const lift = Math.sin(liftT * Math.PI) * 8;

        ctx.save();
        ctx.translate(cx, cy - lift);
        if (frog.animating) {
          ctx.strokeStyle = pal.frogLeg;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-10, 8);
          ctx.lineTo(-18, 16);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(10, 8);
          ctx.lineTo(18, 16);
          ctx.stroke();
        }
        ctx.fillStyle = pal.frog;
        if (glow) {
          ctx.shadowColor = pal.frog;
          ctx.shadowBlur = 16;
        }
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(-5, -6, 4, 0, Math.PI * 2);
        ctx.arc(5, -6, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(-5, -6, 2, 0, Math.PI * 2);
        ctx.arc(5, -6, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      function drawGoals(engine: Engine, pal: FroggerPalette, glow: boolean) {
        for (let i = 0; i < GOAL_COUNT; i++) {
          const startCol = goalStartCol(i);
          const x = startCol * CELL;
          const y = ROW_GOALS * CELL;
          const w = GOAL_WIDTH * CELL;
          ctx.fillStyle = engine.goalsFilled[i]
            ? pal.goalFilledBackground
            : pal.goalBackground;
          ctx.fillRect(x, y, w, CELL);
          ctx.strokeStyle = pal.goalBorder;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, w - 2, CELL - 2);
          if (engine.goalsFilled[i]) {
            ctx.fillStyle = pal.goalFlag;
            if (glow) {
              ctx.shadowColor = pal.goalFlag;
              ctx.shadowBlur = 10;
            }
            ctx.beginPath();
            ctx.ellipse(x + w / 2, y + CELL / 2, 12, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      function drawHud(engine: Engine, pal: FroggerPalette, glow: boolean) {
        const timeRatio =
          engine.timeMax > 0 ? engine.timeLeft / engine.timeMax : 0;
        const barColor =
          timeRatio > 0.5
            ? pal.timeBarGood
            : timeRatio > 0.2
              ? pal.timeBarWarn
              : pal.timeBarBad;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, CANVAS_W, 6);
        ctx.fillStyle = barColor;
        ctx.fillRect(0, 0, CANVAS_W * clamp(timeRatio, 0, 1), 6);

        ctx.save();
        if (glow) {
          ctx.shadowColor = pal.hudGlow;
          ctx.shadowBlur = 8;
        }
        ctx.font = "bold 16px monospace";
        ctx.textBaseline = "top";
        ctx.fillStyle = pal.hud;
        ctx.textAlign = "left";
        ctx.fillText(`SCORE ${engine.score}`, 10, 10);
        ctx.textAlign = "center";
        ctx.fillText(`NIVEL ${engine.level}`, CANVAS_W / 2, 10);
        ctx.textAlign = "right";
        const lives = "●".repeat(Math.max(0, engine.lives));
        ctx.fillStyle = pal.frog;
        ctx.fillText(lives || "—", CANVAS_W - 10, 10);
        ctx.restore();
      }

      function draw(engine: Engine) {
        const skinKey = skinRef.current;
        const pal = FROGGER_SKINS[skinKey];
        const glow = skinKey === "neon";
        for (let r = 0; r < ROWS; r++) {
          ctx.fillStyle = rowBackground(r, pal);
          ctx.fillRect(0, r * CELL, CANVAS_W, CELL);
        }
        drawGoals(engine, pal, glow);
        for (const lane of engine.lanes) {
          for (const e of lane.entities) drawEntity(e, lane.row, pal, glow);
        }
        drawFrog(engine.frog, pal, glow);
        drawHud(engine, pal, glow);

        if (engine.state === "gameover") {
          ctx.fillStyle = pal.overlay;
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
          ctx.fillStyle = pal.overlayText;
          ctx.font = "bold 32px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2);
        }
      }

      let rafId = 0;
      let lastTime: number | null = null;
      let lastHudScore = -1;
      let lastHudLives = -1;
      let lastHudLevel = -1;
      let lastHudStatus: FroggerHudState["status"] | null = null;

      function loop(ts: number) {
        const engine = engineRef.current;
        if (engine) {
          const dt =
            lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
          lastTime = ts;
          if (!pausedRef.current) {
            update(engine, dt);
          }
          draw(engine);
          const status: FroggerHudState["status"] =
            engine.state === "gameover" ? "gameover" : "playing";
          if (
            engine.score !== lastHudScore ||
            engine.lives !== lastHudLives ||
            engine.level !== lastHudLevel ||
            status !== lastHudStatus
          ) {
            lastHudScore = engine.score;
            lastHudLives = engine.lives;
            lastHudLevel = engine.level;
            lastHudStatus = status;
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
      };
    }, []);

    useImperativeHandle(ref, () => ({
      restart: () => {
        initGameRef.current();
      },
    }));

    function pressDir(dir: Direction) {
      const engine = engineRef.current;
      if (!engine || engine.state !== "playing") return;
      engine.pendingDir = dir;
    }

    function touchHandlers(dir: Direction) {
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
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
        <div className="touch-controls">
          <div className="touch-controls-panel">
            <div className="touch-dpad" aria-label="Direccional">
              <button
                type="button"
                className="touch-dpad-btn touch-dpad-up"
                aria-label="Saltar arriba"
                {...touchHandlers("up")}
              >
                <svg className="touch-dpad-arrow" viewBox="0 0 24 24">
                  <path d="M12 4 L20 16 L4 16 Z" />
                </svg>
              </button>
              <button
                type="button"
                className="touch-dpad-btn touch-dpad-left"
                aria-label="Saltar a la izquierda"
                {...touchHandlers("left")}
              >
                <svg className="touch-dpad-arrow" viewBox="0 0 24 24">
                  <path d="M16 4 L16 20 L4 12 Z" />
                </svg>
              </button>
              <button
                type="button"
                className="touch-dpad-btn touch-dpad-right"
                aria-label="Saltar a la derecha"
                {...touchHandlers("right")}
              >
                <svg className="touch-dpad-arrow" viewBox="0 0 24 24">
                  <path d="M8 4 L20 12 L8 20 Z" />
                </svg>
              </button>
              <button
                type="button"
                className="touch-dpad-btn touch-dpad-down"
                aria-label="Saltar abajo"
                {...touchHandlers("down")}
              >
                <svg className="touch-dpad-arrow" viewBox="0 0 24 24">
                  <path d="M4 8 L20 8 L12 20 Z" />
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

export default FroggerGame;
