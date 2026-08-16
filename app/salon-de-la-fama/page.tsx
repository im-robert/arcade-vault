import HallOfFameBoard from "@/components/HallOfFameBoard";
import { getGames } from "@/lib/games";
import { getLeaderboardByGame } from "@/lib/scores";

export default async function HallOfFamePage() {
  const games = await getGames();
  const initialGameId = games[0].id;
  const initialRows = await getLeaderboardByGame(initialGameId, 12);

  return (
    <HallOfFameBoard
      games={games}
      initialGameId={initialGameId}
      initialRows={initialRows}
    />
  );
}
