import HomeContent from "@/components/HomeContent";
import { getGames } from "@/lib/games";
import { getRecentScores, getTopPlayers } from "@/lib/scores";

export default async function HomePage() {
  const [games, recentScores, topPlayers] = await Promise.all([
    getGames(),
    getRecentScores(7),
    getTopPlayers(5),
  ]);

  return (
    <HomeContent
      games={games}
      recentScores={recentScores}
      topPlayers={topPlayers}
    />
  );
}
