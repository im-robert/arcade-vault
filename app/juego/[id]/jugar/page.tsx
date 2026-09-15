"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import type { Game } from "@/lib/games";
import { createClient } from "@/lib/supabase/client";
import { getUser, saveScore } from "@/lib/session";
import AsteroidsGame, {
  type AsteroidsGameHandle,
  type AsteroidsHudState,
} from "@/components/games/AsteroidsGame";
import CaidaGame, {
  type CaidaGameHandle,
  type CaidaHudState,
} from "@/components/games/CaidaGame";
import ArkanoidGame, {
  type ArkanoidGameHandle,
  type ArkanoidHudState,
} from "@/components/games/ArkanoidGame";
import SnakeGame, {
  type SnakeGameHandle,
  type SnakeHudState,
} from "@/components/games/SnakeGame";
import FroggerGame, {
  type FroggerGameHandle,
  type FroggerHudState,
} from "@/components/games/FroggerGame";
import {
  SKIN_LABELS,
  getStoredSkin,
  setStoredSkin,
  type GameSkin,
} from "@/lib/game-skins";

export default function GamePlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const isAsteroids = game?.id === "asteroids";
  const isCaida = game?.id === "caida";
  const isArkanoid = game?.id === "bloque-buster";
  const isSnake = game?.id === "serpentina";
  const isFrogger = game?.id === "ranaria";

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState("INVITADO");
  const [userId, setUserId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [skin, setSkin] = useState<GameSkin>("clasico");
  const asteroidsRef = useRef<AsteroidsGameHandle>(null);
  const caidaRef = useRef<CaidaGameHandle>(null);
  const arkanoidRef = useRef<ArkanoidGameHandle>(null);
  const snakeRef = useRef<SnakeGameHandle>(null);
  const froggerRef = useRef<FroggerGameHandle>(null);
  const initialsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    getUser().then((user) => {
      if (cancelled) return;
      setName(user ? user.name : "INVITADO");
      setUserId(user ? user.id : null);
    });
    setSkin(getStoredSkin());
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSkinChange = (next: GameSkin) => {
    setSkin(next);
    setStoredSkin(next);
  };

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("games")
      .select("id, title, short, long, cat, cover, color")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setGame(
          data
            ? {
                ...(data as Omit<Game, "best" | "plays">),
                best: 0,
                plays: "0",
              }
            : null,
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!loading && !game) notFound();
  if (!game) return null;

  const simulateGame = () => {
    setScore(Math.floor(1000 + Math.random() * 99000));
    setOver(true);
  };

  const handleAsteroidsHud = (hud: AsteroidsHudState) => {
    setScore(hud.score);
    setLives(hud.lives);
    setLevel(hud.level);
    if (hud.status === "gameover") setOver(true);
  };

  const handleCaidaHud = (hud: CaidaHudState) => {
    setScore(hud.score);
    setLives(hud.lives);
    setLevel(hud.level);
    if (hud.status === "gameover") setOver(true);
  };

  const handleArkanoidHud = (hud: ArkanoidHudState) => {
    setScore(hud.score);
    setLives(hud.lives);
    setLevel(hud.level);
    if (hud.status === "gameover") setOver(true);
  };

  const handleSnakeHud = (hud: SnakeHudState) => {
    setScore(hud.score);
    setLives(hud.lives);
    setLevel(hud.level);
    if (hud.status === "gameover") setOver(true);
  };

  const handleFroggerHud = (hud: FroggerHudState) => {
    setScore(hud.score);
    setLives(hud.lives);
    setLevel(hud.level);
    if (hud.status === "gameover") setOver(true);
  };

  const restart = () => {
    setScore(0);
    setLives(3);
    setLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    asteroidsRef.current?.restart();
    caidaRef.current?.restart();
    arkanoidRef.current?.restart();
    snakeRef.current?.restart();
    froggerRef.current?.restart();
  };

  const handleSaveScore = async () => {
    await saveScore({
      game: game.id,
      score,
      name,
      userId: userId ?? undefined,
    });
    setSaved(true);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          {(isAsteroids || isSnake || isArkanoid || isFrogger) && (
            <select
              aria-label="Skin visual"
              value={skin}
              onChange={(e) => handleSkinChange(e.target.value as GameSkin)}
              style={{
                background: "var(--bg-2)",
                border: "1px solid var(--line)",
                padding: "8px 10px",
                fontFamily: "var(--mono)",
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {(Object.keys(SKIN_LABELS) as GameSkin[]).map((key) => (
                <option key={key} value={key}>
                  {SKIN_LABELS[key]}
                </option>
              ))}
            </select>
          )}
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          {!isAsteroids &&
            !isCaida &&
            !isArkanoid &&
            !isSnake &&
            !isFrogger && (
              <button className="btn magenta" onClick={simulateGame}>
                SIMULAR PARTIDA
              </button>
            )}
          <button
            className="btn ghost"
            onClick={() => router.push(`/juego/${game.id}`)}
          >
            SALIR
          </button>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {isAsteroids ? (
            <AsteroidsGame
              ref={asteroidsRef}
              paused={paused}
              skin={skin}
              onHudChange={handleAsteroidsHud}
            />
          ) : isCaida ? (
            <CaidaGame
              ref={caidaRef}
              paused={paused}
              onHudChange={handleCaidaHud}
            />
          ) : isArkanoid ? (
            <ArkanoidGame
              ref={arkanoidRef}
              paused={paused}
              skin={skin}
              onHudChange={handleArkanoidHud}
            />
          ) : isSnake ? (
            <SnakeGame
              ref={snakeRef}
              paused={paused}
              skin={skin}
              onHudChange={handleSnakeHud}
            />
          ) : isFrogger ? (
            <FroggerGame
              ref={froggerRef}
              paused={paused}
              skin={skin}
              onHudChange={handleFroggerHud}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
        {isAsteroids && (
          <div className="crt-keys-hint">
            ← → ROTAR · ↑ PROPULSAR · ESPACIO DISPARAR
          </div>
        )}
        {isCaida && (
          <div className="crt-keys-hint">
            ← → MOVER · ↑ ROTAR · ↓ BAJAR · ESPACIO CAÍDA RÁPIDA
          </div>
        )}
        {isArkanoid && <div className="crt-keys-hint">← → MOVER PALETA</div>}
        {isSnake && (
          <div className="crt-keys-hint">← → ↑ ↓ MOVER LA SERPIENTE</div>
        )}
        {isFrogger && <div className="crt-keys-hint">← → ↑ ↓ SALTAR</div>}
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  ref={initialsInputRef}
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  onFocus={() =>
                    initialsInputRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    })
                  }
                  placeholder="TUS INICIALES"
                />
                <button className="btn yellow" onClick={handleSaveScore}>
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button
                className="btn magenta"
                onClick={() => router.push("/games")}
              >
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
