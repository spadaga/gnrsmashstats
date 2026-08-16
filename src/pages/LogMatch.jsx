import MatchForm from '../components/MatchForm'

export default function LogMatch({ players, matches, actions, onNavigate, isSuperAdmin, photoByName }) {
  return (
    <div className="max-w-2xl mx-auto">
      <MatchForm
        players={players}
        matches={matches}
        isSuperAdmin={isSuperAdmin}
        photoByName={photoByName}
        onAddMatch={async (match) => {
          await actions.addMatch(match)
          onNavigate('dashboard')
        }}
      />
    </div>
  )
}
