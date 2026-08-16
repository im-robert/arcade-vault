"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type TouchEvent as ReactTouchEvent,
} from "react";

export interface AsteroidsHudState {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover";
}

export interface AsteroidsGameHandle {
  restart: () => void;
}

interface AsteroidsGameProps {
  paused: boolean;
  onHudChange: (state: AsteroidsHudState) => void;
}

const W = 800;
const H = 600;

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap = (v: number, max: number) => ((v % max) + max) % max;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

// ── Constants ─────────────────────────────────────────────────────────────────
const POWERUP_DROP_CHANCE = 0.15;
const POWERUP_DURATION = 5;
const POWERUP_TTL = 12;
const TRIPLE_SPREAD = 0.18;

const RADII = [0, 16, 30, 50]; // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32]; // velocidad base por tamaño
const POINTS = [0, 100, 50, 20]; // puntos por tamaño

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl = 1.1;
  radius = 2;
  dead = false;

  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
class Asteroid {
  x: number;
  y: number;
  size: number;
  radius: number;
  dead = false;
  vx: number;
  vy: number;
  rotSpeed: number;
  rot: number;
  verts: [number, number][] = [];

  constructor(x: number, y: number, size = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split(): Asteroid[] {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── PowerUp ───────────────────────────────────────────────────────────────────
class PowerUp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius = 12;
  ttl = POWERUP_TTL;
  dead = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;
    const pulse = 0.85 + Math.sin(performance.now() / 150) * 0.15;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = "#0ff";
    ctx.lineWidth = 2;
    const r = this.radius * pulse;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.restore();
    ctx.fillStyle = "#0ff";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("3x", this.x, this.y);
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  x = 0;
  y = 0;
  angle = 0;
  vx = 0;
  vy = 0;
  radius = 12;
  thrusting = false;
  invincible = 0;
  shootCooldown = 0;
  dead = false;
  tripleShot = 0;

  constructor() {
    this.tripleShot = 0;
    this.reset();
  }

  reset() {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.radius = 12;
    this.thrusting = false;
    this.invincible = 3;
    this.shootCooldown = 0;
    this.dead = false;
  }

  update(dt: number, keys: Record<string, boolean>) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShot > 0) this.tripleShot -= dt;

    const ROT = 3.5; // rad/s
    const THRUST = 260; // px/s²
    const DRAG = 0.987;

    if (keys["ArrowLeft"]) this.angle -= ROT * dt;
    if (keys["ArrowRight"]) this.angle += ROT * dt;

    this.thrusting = !!keys["ArrowUp"];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShot > 0) {
      return [
        new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0)
      return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo(20, 0); // nariz
    ctx.lineTo(-12, -9); // ala izquierda
    ctx.lineTo(-7, 0); // muesca trasera
    ctx.lineTo(-12, 9); // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8, 4);
      ctx.strokeStyle = "rgba(255, 130, 0, 0.85)";
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

type EngineState = "playing" | "dead" | "gameover";

interface Engine {
  ship: Ship;
  bullets: Bullet[];
  asteroids: Asteroid[];
  particles: Particle[];
  powerUps: PowerUp[];
  score: number;
  lives: number;
  level: number;
  state: EngineState;
  deadTimer: number;
  powerUpSpawned: boolean;
  killsSinceSpawn: number;
}

const AsteroidsGame = forwardRef<AsteroidsGameHandle, AsteroidsGameProps>(
  function AsteroidsGame({ paused, onHudChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pausedRef = useRef(paused);
    const onHudChangeRef = useRef(onHudChange);
    const engineRef = useRef<Engine | null>(null);
    const initGameRef = useRef<() => void>(() => {});
    const keysRef = useRef<Record<string, boolean>>({});
    const justPressedRef = useRef<Record<string, boolean>>({});

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
      const justPressed = justPressedRef.current;

      function pressed(code: string) {
        const val = justPressed[code];
        justPressed[code] = false;
        return val;
      }

      function onKeyDown(e: KeyboardEvent) {
        if (!keys[e.code]) justPressed[e.code] = true;
        keys[e.code] = true;
      }
      function onKeyUp(e: KeyboardEvent) {
        keys[e.code] = false;
      }

      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);

      function spawnAsteroids(engine: Engine, count: number) {
        const SAFE_DIST = 130;
        for (let i = 0; i < count; i++) {
          let x, y;
          do {
            x = rand(0, W);
            y = rand(0, H);
          } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
          engine.asteroids.push(new Asteroid(x, y, 3));
        }
      }

      function initGame() {
        const engine: Engine = {
          ship: new Ship(),
          bullets: [],
          asteroids: [],
          particles: [],
          powerUps: [],
          powerUpSpawned: false,
          killsSinceSpawn: 0,
          score: 0,
          lives: 3,
          level: 1,
          state: "playing",
          deadTimer: 0,
        };
        spawnAsteroids(engine, 4);
        engineRef.current = engine;
        onHudChangeRef.current({
          score: engine.score,
          lives: engine.lives,
          level: engine.level,
          status: engine.state,
        });
      }
      initGameRef.current = initGame;

      function nextLevel(engine: Engine) {
        engine.level++;
        engine.bullets = [];
        engine.particles = [];
        engine.powerUps = [];
        engine.powerUpSpawned = false;
        engine.killsSinceSpawn = 0;
        engine.ship.reset();
        spawnAsteroids(engine, 3 + engine.level);
      }

      function explode(engine: Engine, x: number, y: number, count = 8) {
        for (let i = 0; i < count; i++)
          engine.particles.push(new Particle(x, y));
      }

      function killShip(engine: Engine) {
        explode(engine, engine.ship.x, engine.ship.y, 14);
        engine.ship.dead = true;
        engine.lives--;
        if (engine.lives <= 0) {
          engine.state = "gameover";
        } else {
          engine.state = "dead";
          engine.deadTimer = 2;
        }
      }

      function update(engine: Engine, dt: number) {
        if (engine.state === "gameover") {
          engine.particles.forEach((p) => p.update(dt));
          engine.particles = engine.particles.filter((p) => !p.dead);
          return;
        }

        if (engine.state === "dead") {
          engine.deadTimer -= dt;
          engine.particles.forEach((p) => p.update(dt));
          engine.particles = engine.particles.filter((p) => !p.dead);
          engine.asteroids.forEach((a) => a.update(dt));
          if (engine.deadTimer <= 0) {
            engine.state = "playing";
            engine.ship.reset();
          }
          return;
        }

        // Disparar
        if (pressed("Space")) {
          engine.bullets.push(...engine.ship.tryShoot());
        }

        engine.ship.update(dt, keys);
        engine.bullets.forEach((b) => b.update(dt));
        engine.asteroids.forEach((a) => a.update(dt));
        engine.particles.forEach((p) => p.update(dt));
        engine.powerUps.forEach((p) => p.update(dt));

        engine.bullets = engine.bullets.filter((b) => !b.dead);
        engine.particles = engine.particles.filter((p) => !p.dead);
        engine.powerUps = engine.powerUps.filter((p) => !p.dead);

        for (const p of engine.powerUps) {
          if (!p.dead && dist(engine.ship, p) < engine.ship.radius + p.radius) {
            p.dead = true;
            engine.ship.tripleShot = POWERUP_DURATION;
          }
        }

        // Bala vs asteroide
        const newAsteroids: Asteroid[] = [];
        for (const b of engine.bullets) {
          for (const a of engine.asteroids) {
            if (!a.dead && !b.dead && dist(b, a) < a.radius) {
              b.dead = true;
              a.dead = true;
              engine.score += POINTS[a.size];
              explode(engine, a.x, a.y, a.size * 5);
              newAsteroids.push(...a.split());
              if (!engine.powerUpSpawned) {
                engine.killsSinceSpawn++;
                const guaranteed = engine.killsSinceSpawn >= 5;
                if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
                  engine.powerUps.push(new PowerUp(a.x, a.y));
                  engine.powerUpSpawned = true;
                }
              }
            }
          }
        }
        engine.asteroids = engine.asteroids
          .filter((a) => !a.dead)
          .concat(newAsteroids);
        engine.bullets = engine.bullets.filter((b) => !b.dead);

        // Nave vs asteroide
        if (engine.ship.invincible <= 0) {
          for (const a of engine.asteroids) {
            if (dist(engine.ship, a) < engine.ship.radius + a.radius * 0.82) {
              killShip(engine);
              break;
            }
          }
        }

        // Nivel completado
        if (engine.asteroids.length === 0) nextLevel(engine);
      }

      function drawLifeIcon(x: number, y: number) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-Math.PI / 2);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.2;
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(-6, -5);
        ctx.lineTo(-3, 0);
        ctx.lineTo(-6, 5);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      function drawHUD(engine: Engine) {
        ctx.fillStyle = "#fff";
        ctx.font = "15px monospace";

        ctx.textAlign = "left";
        ctx.fillText(`SCORE  ${engine.score}`, 14, 26);

        ctx.textAlign = "center";
        ctx.fillText(`NIVEL ${engine.level}`, W / 2, 26);

        for (let i = 0; i < engine.lives; i++)
          drawLifeIcon(W - 16 - i * 22, 18);

        if (engine.ship.tripleShot > 0) {
          ctx.textAlign = "left";
          ctx.fillStyle = "#0ff";
          ctx.fillText(`3x  ${engine.ship.tripleShot.toFixed(1)}s`, 14, 46);
        }
      }

      function draw(engine: Engine) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);

        engine.particles.forEach((p) => p.draw(ctx));
        engine.asteroids.forEach((a) => a.draw(ctx));
        engine.powerUps.forEach((p) => p.draw(ctx));
        engine.bullets.forEach((b) => b.draw(ctx));
        engine.ship.draw(ctx);

        drawHUD(engine);
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
              lives: engine.lives,
              level: engine.level,
              status: engine.state,
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

    function pressKey(code: string) {
      const keys = keysRef.current;
      const justPressed = justPressedRef.current;
      if (!keys[code]) justPressed[code] = true;
      keys[code] = true;
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
          width={800}
          height={600}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
        <div className="touch-controls">
          <button
            type="button"
            className="touch-btn"
            aria-label="Rotar a la izquierda"
            {...touchHandlers("ArrowLeft")}
          >
            ◀
          </button>
          <button
            type="button"
            className="touch-btn"
            aria-label="Rotar a la derecha"
            {...touchHandlers("ArrowRight")}
          >
            ▶
          </button>
          <button
            type="button"
            className="touch-btn"
            aria-label="Propulsar"
            {...touchHandlers("ArrowUp")}
          >
            ▲
          </button>
          <button
            type="button"
            className="touch-btn fire"
            aria-label="Disparar"
            {...touchHandlers("Space")}
          >
            FUEGO
          </button>
        </div>
      </>
    );
  },
);

export default AsteroidsGame;
