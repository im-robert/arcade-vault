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

export interface FroggerPalette {
  roadBackground: string;
  riverBackground: string;
  safeBackground: string;
  goalBackground: string;
  goalFilledBackground: string;
  goalBorder: string;
  goalFlag: string;
  carColors: string[];
  carWheel: string;
  truckBody: string;
  truckAccent: string;
  truckWheel: string;
  log: string;
  logGrain: string;
  turtle: string;
  turtleSpot: string;
  turtleSubmerged: string;
  frog: string;
  frogLeg: string;
  hud: string;
  hudGlow: string;
  timeBarGood: string;
  timeBarWarn: string;
  timeBarBad: string;
  overlay: string;
  overlayText: string;
}

export const FROGGER_SKINS: Record<GameSkin, FroggerPalette> = {
  neon: {
    roadBackground: "#08010f",
    riverBackground: "#03123a",
    safeBackground: "#031a24",
    goalBackground: "#04241a",
    goalFilledBackground: "#031712",
    goalBorder: "#00ffe0",
    goalFlag: "#39ff6a",
    carColors: ["#ff2b6d", "#faff00", "#00e0ff"],
    carWheel: "#000000",
    truckBody: "#a3a3ff",
    truckAccent: "#6a2bff",
    truckWheel: "#000000",
    log: "#ff9d2b",
    logGrain: "#c96a00",
    turtle: "#00ffb0",
    turtleSpot: "#00b37e",
    turtleSubmerged: "rgba(0, 255, 176, 0.35)",
    frog: "#39ff6a",
    frogLeg: "#00ffb0",
    hud: "#fff",
    hudGlow: "rgba(0, 255, 255, 0.5)",
    timeBarGood: "#39ff6a",
    timeBarWarn: "#faff00",
    timeBarBad: "#ff2b6d",
    overlay: "rgba(0, 0, 0, 0.6)",
    overlayText: "#fff",
  },
  retro: {
    roadBackground: "#1a140e",
    riverBackground: "#0e2a30",
    safeBackground: "#241b0a",
    goalBackground: "#1a2712",
    goalFilledBackground: "#121c0d",
    goalBorder: "#d1a54a",
    goalFlag: "#e0a83c",
    carColors: ["#c9622f", "#d9a441", "#4a8a94"],
    carWheel: "#241a12",
    truckBody: "#8a7a52",
    truckAccent: "#5a4a2f",
    truckWheel: "#241a12",
    log: "#7a4a26",
    logGrain: "#4a2e16",
    turtle: "#6a9456",
    turtleSpot: "#3d5c34",
    turtleSubmerged: "rgba(122, 190, 196, 0.35)",
    frog: "#c9d95a",
    frogLeg: "#8fae42",
    hud: "#e0a83c",
    hudGlow: "transparent",
    timeBarGood: "#e0a83c",
    timeBarWarn: "#c9822a",
    timeBarBad: "#8a3a1c",
    overlay: "rgba(10, 8, 4, 0.78)",
    overlayText: "#e0a83c",
  },
  clasico: {
    roadBackground: "#111111",
    riverBackground: "#02182e",
    safeBackground: "#0a2b12",
    goalBackground: "#124a20",
    goalFilledBackground: "#123a1c",
    goalBorder: "#d4af37",
    goalFlag: "#39ff6a",
    carColors: ["#ff3b3b", "#ffd23b", "#3b8bff"],
    carWheel: "#111111",
    truckBody: "#8a8a8a",
    truckAccent: "#5a5a5a",
    truckWheel: "#111111",
    log: "#7a4a24",
    logGrain: "#5a3418",
    turtle: "#2f9e4f",
    turtleSpot: "#1f7a38",
    turtleSubmerged: "rgba(60, 160, 90, 0.35)",
    frog: "#39ff6a",
    frogLeg: "#2ecc59",
    hud: "#ffffff",
    hudGlow: "transparent",
    timeBarGood: "#39ff6a",
    timeBarWarn: "#ffd23b",
    timeBarBad: "#ff3b3b",
    overlay: "rgba(0,0,0,0.55)",
    overlayText: "#ffffff",
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
