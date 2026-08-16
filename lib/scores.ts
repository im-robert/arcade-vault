import { createClient } from "@/lib/supabase/server";

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

interface ScoreQueryRow {
  player_name: string;
  score: number;
  created_at: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${mon}/${d.getFullYear()}`;
}

function toScoreRows(rows: ScoreQueryRow[]): ScoreRow[] {
  return rows.map((r, i) => ({
    rank: i + 1,
    name: r.player_name,
    score: r.score,
    date: formatDate(r.created_at),
  }));
}

export async function getTopScores(
  gameId: string,
  limit = 10,
): Promise<ScoreRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scores")
    .select("player_name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);

  return toScoreRows((data as ScoreQueryRow[]) || []);
}

export async function getLeaderboardByGame(
  gameId: string,
  limit = 12,
): Promise<ScoreRow[]> {
  return getTopScores(gameId, limit);
}

export interface RecentScoreEntry {
  player: string;
  gameTitle: string;
  score: number;
  color: string;
  timeAgo: string;
}

function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  return `hace ${diffD} d`;
}

export async function getRecentScores(limit = 7): Promise<RecentScoreEntry[]> {
  const supabase = await createClient();

  const { data: scores } = await supabase
    .from("scores")
    .select("player_name, score, created_at, game_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (scores as (ScoreQueryRow & { game_id: string })[]) || [];
  if (rows.length === 0) return [];

  const gameIds = Array.from(new Set(rows.map((r) => r.game_id)));
  const { data: games } = await supabase
    .from("games")
    .select("id, title, color")
    .in("id", gameIds);

  const gameById = new Map(
    ((games as { id: string; title: string; color: string }[]) || []).map(
      (g) => [g.id, g],
    ),
  );

  return rows.map((r) => {
    const game = gameById.get(r.game_id);
    return {
      player: r.player_name,
      gameTitle: game?.title ?? r.game_id,
      score: r.score,
      color: game?.color ?? "cyan",
      timeAgo: formatTimeAgo(r.created_at),
    };
  });
}

export interface TopPlayerEntry {
  rank: number;
  player: string;
  totalScore: number;
}

export async function getTopPlayers(limit = 5): Promise<TopPlayerEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("scores").select("player_name, score");

  const totals = new Map<string, number>();
  for (const row of (data as { player_name: string; score: number }[]) || []) {
    totals.set(row.player_name, (totals.get(row.player_name) || 0) + row.score);
  }

  return Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([player, totalScore], i) => ({
      rank: i + 1,
      player,
      totalScore,
    }));
}
