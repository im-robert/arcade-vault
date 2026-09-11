export type GameSkin = "neon" | "retro" | "clasico";

export const SKIN_LABELS: Record<GameSkin, string> = {
  neon: "Neón",
  retro: "Retro",
  clasico: "Clásico",
};

export const SKIN_KEY = "av_skin";

export function getStoredSkin(): GameSkin {
  if (typeof window === "undefined") return "clasico";
  const raw = window.localStorage.getItem(SKIN_KEY);
  if (raw === "neon" || raw === "retro" || raw === "clasico") return raw;
  return "clasico";
}

export function setStoredSkin(skin: GameSkin): void {
  window.localStorage.setItem(SKIN_KEY, skin);
}

export interface AsteroidsPalette {
  background: string;
  ship: string;
  shipGlow: string;
  thruster: string;
  asteroid: string;
  asteroidGlow: string;
  bullet: string;
  bulletGlow: string;
  particle: string;
  powerUp: string;
  powerUpGlow: string;
  hud: string;
  hudGlow: string;
}

export interface SnakePalette {
  background: string;
  grid: string;
  snakeHead: string;
  snakeHeadGlow: string;
  snakeBody: string;
  snakeBodyGlow: string;
  hud: string;
  hudGlow: string;
  overlay: string;
  overlayText: string;
}

export const SNAKE_SKINS: Record<GameSkin, SnakePalette> = {
  neon: {
    background: "#05010c",
    grid: "rgba(0, 255, 255, 0.08)",
    snakeHead: "#39ff6a",
    snakeHeadGlow: "rgba(57, 255, 106, 0.85)",
    snakeBody: "#1fae42",
    snakeBodyGlow: "rgba(31, 174, 66, 0.6)",
    hud: "#fff",
    hudGlow: "rgba(0, 255, 255, 0.5)",
    overlay: "rgba(0, 0, 0, 0.6)",
    overlayText: "#fff",
  },
  retro: {
    background: "#0a0600",
    grid: "rgba(255, 176, 0, 0.08)",
    snakeHead: "#ffb000",
    snakeHeadGlow: "transparent",
    snakeBody: "#a86a00",
    snakeBodyGlow: "transparent",
    hud: "#ffb000",
    hudGlow: "transparent",
    overlay: "rgba(10, 6, 0, 0.75)",
    overlayText: "#ffb000",
  },
  clasico: {
    background: "#000000",
    grid: "rgba(255, 255, 255, 0.05)",
    snakeHead: "#ffffff",
    snakeHeadGlow: "transparent",
    snakeBody: "#9a9a9a",
    snakeBodyGlow: "transparent",
    hud: "#ffffff",
    hudGlow: "transparent",
    overlay: "rgba(0, 0, 0, 0.6)",
    overlayText: "#ffffff",
  },
};

export type ArkanoidBlockColor =
  "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";

export interface ArkanoidPalette {
  background: string;
  useSprites: boolean;
  paddle: string;
  paddleGlow: string;
  ball: string;
  ballGlow: string;
  blocks: Record<ArkanoidBlockColor, string>;
  text: string;
  textGlow: string;
}

export const ARKANOID_SKINS: Record<GameSkin, ArkanoidPalette> = {
  neon: {
    background: "#000000",
    useSprites: true,
    paddle: "#0ff",
    paddleGlow: "rgba(0, 255, 255, 0.85)",
    ball: "#faff00",
    ballGlow: "rgba(250, 255, 0, 0.9)",
    blocks: {
      red: "#ff2b4d",
      yellow: "#faff00",
      cyan: "#0ff",
      magenta: "#ff2bd6",
      hotpink: "#ff5bd6",
      green: "#33ff5c",
      gray: "#8a8a8a",
    },
    text: "#fff",
    textGlow: "rgba(0, 255, 255, 0.5)",
  },
  retro: {
    background: "#120b02",
    useSprites: false,
    paddle: "#ffb000",
    paddleGlow: "rgba(255, 176, 0, 0.55)",
    ball: "#ffd873",
    ballGlow: "rgba(255, 216, 115, 0.6)",
    blocks: {
      red: "#e8542a",
      yellow: "#f2c14e",
      cyan: "#3f9d70",
      magenta: "#c9484f",
      hotpink: "#e0954f",
      green: "#5a8f4f",
      gray: "#8a6a3f",
    },
    text: "#ffb000",
    textGlow: "rgba(255, 176, 0, 0.35)",
  },
  clasico: {
    background: "#050505",
    useSprites: false,
    paddle: "#f2f2f2",
    paddleGlow: "transparent",
    ball: "#f2f2f2",
    ballGlow: "transparent",
    blocks: {
      red: "#e8241c",
      yellow: "#f6d31a",
      cyan: "#2196d8",
      magenta: "#9c3fd8",
      hotpink: "#ff6fae",
      green: "#2fae4e",
      gray: "#b7b7b7",
    },
    text: "#f2f2f2",
    textGlow: "transparent",
  },
};

export const ASTEROIDS_SKINS: Record<GameSkin, AsteroidsPalette> = {
  neon: {
    background: "#05010c",
    ship: "#0ff",
    shipGlow: "rgba(0, 255, 255, 0.85)",
    thruster: "rgba(255, 130, 0, 0.9)",
    asteroid: "#ff2bd6",
    asteroidGlow: "rgba(255, 43, 214, 0.7)",
    bullet: "#faff00",
    bulletGlow: "rgba(250, 255, 0, 0.9)",
    particle: "#e0fbff",
    powerUp: "#0ff",
    powerUpGlow: "rgba(0, 255, 255, 0.8)",
    hud: "#fff",
    hudGlow: "rgba(0, 255, 255, 0.5)",
  },
  retro: {
    background: "#0a0600",
    ship: "#ffb000",
    shipGlow: "transparent",
    thruster: "#ff7a00",
    asteroid: "#33ff5c",
    asteroidGlow: "transparent",
    bullet: "#ffb000",
    bulletGlow: "transparent",
    particle: "#33ff5c",
    powerUp: "#ffb000",
    powerUpGlow: "transparent",
    hud: "#ffb000",
    hudGlow: "transparent",
  },
  clasico: {
    background: "#000000",
    ship: "#ffffff",
    shipGlow: "transparent",
    thruster: "rgba(255, 130, 0, 0.85)",
    asteroid: "#ffffff",
    asteroidGlow: "transparent",
    bullet: "#ffffff",
    bulletGlow: "transparent",
    particle: "#ffffff",
    powerUp: "#ffffff",
    powerUpGlow: "transparent",
    hud: "#ffffff",
    hudGlow: "transparent",
  },
};
