import { createClient } from "@/lib/supabase/server";
import type { Game, GameCategory, GameColor } from "@/lib/game-types";

export type { Game, GameCategory, GameColor };
export { CATS } from "@/lib/game-types";

interface GameRow {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: string;
  cover: string;
  color: string;
}

interface ScoreAggRow {
  game_id: string;
  score: number;
}

function formatPlays(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return String(count);
}

function buildGame(row: GameRow, scores: ScoreAggRow[]): Game {
  const gameScores = scores.filter((s) => s.game_id === row.id);
  const best = gameScores.reduce((max, s) => Math.max(max, s.score), 0);
  const plays = formatPlays(gameScores.length);

  return {
    id: row.id,
    title: row.title,
    short: row.short,
    long: row.long,
    cat: row.cat as GameCategory,
    cover: row.cover,
    color: row.color as GameColor,
    best,
    plays,
  };
}

export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();

  const [{ data: games }, { data: scores }] = await Promise.all([
    supabase.from("games").select("id, title, short, long, cat, cover, color"),
    supabase.from("scores").select("game_id, score"),
  ]);

  return ((games as GameRow[]) || []).map((row) =>
    buildGame(row, (scores as ScoreAggRow[]) || []),
  );
}

export async function getGame(id: string): Promise<Game | null> {
  const supabase = await createClient();

  const [{ data: game }, { data: scores }] = await Promise.all([
    supabase
      .from("games")
      .select("id, title, short, long, cat, cover, color")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("scores").select("game_id, score").eq("game_id", id),
  ]);

  if (!game) return null;

  return buildGame(game as GameRow, (scores as ScoreAggRow[]) || []);
}
