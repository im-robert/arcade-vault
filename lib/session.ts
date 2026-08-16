import { createClient } from "@/lib/supabase/client";

export interface AvUser {
  name: string;
}

const USER_KEY = "av_user";

export function getUser(): AvUser | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function setUser(user: AvUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser(): void {
  localStorage.removeItem(USER_KEY);
}

export async function saveScore(entry: {
  game: string;
  score: number;
  name: string;
}): Promise<void> {
  const supabase = createClient();
  await supabase.from("scores").insert({
    game_id: entry.game,
    player_name: entry.name,
    score: entry.score,
  });
}
