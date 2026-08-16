import GamesBrowser from "@/components/GamesBrowser";
import { getGames } from "@/lib/games";

export default async function GamesPage() {
  const games = await getGames();

  return <GamesBrowser games={games} />;
}
