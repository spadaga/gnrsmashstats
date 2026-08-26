import MatchForm from "../components/MatchForm";

export default function LogMatch({
  players,
  matches,
  actions,
  onNavigate,
  photoByName,
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <MatchForm
        players={players}
        matches={matches}
        photoByName={photoByName}
        onCancel={() => onNavigate("dashboard")}
        onAddMatch={async (match) => {
          await actions.addMatch(match);
          onNavigate("dashboard");
        }}
      />
    </div>
  );
}
