import HallOfFameBoard from "@/components/HallOfFameBoard";
import { getGames } from "@/lib/games";
import { getLeaderboardByGame } from "@/lib/scores";

export default async function HallOfFamePage() {
  const games = await getGames();

  if (games.length === 0) {
    return (
      <div
        className="fade-in"
        style={{ padding: "80px 24px", textAlign: "center" }}
      >
        <h1 className="pixel neon-yellow" style={{ fontSize: 22 }}>
          SALÓN DE LA FAMA NO DISPONIBLE
        </h1>
        <p className="mono" style={{ color: "var(--ink-dim)", marginTop: 12 }}>
          No se pudo cargar el catálogo de juegos. Intenta de nuevo más tarde.
        </p>
      </div>
    );
  }

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
