import { useState } from 'react'
import FilterBar from '../components/FilterBar'
import StatCards from '../components/StatCards'
import TopSeeds from '../components/TopSeeds'
import Leaderboard from '../components/Leaderboard'
import MatchList from '../components/MatchList'
import VideoSection from '../components/VideoSection'
import PhotoGallery from '../components/PhotoGallery'
import SlotsTicker from '../components/SlotsTicker'
import { filterByPeriod } from '../lib/ranking'
import { exportAll } from '../lib/api'

export default function Dashboard({ data, actions, onNavigate, onImport, isAdmin, isSuperAdmin, photoByName, onViewProfile }) {
  const [period, setPeriod] = useState('all')
  const filtered = filterByPeriod(data.matches, period)

  return (
    <div className="space-y-4">
      <SlotsTicker slots={data.slots} />
      <FilterBar period={period} onPeriod={setPeriod} onExport={exportAll} onImport={onImport} isAdmin={isSuperAdmin} />
      <StatCards matches={filtered} players={data.players} />
      <TopSeeds matches={data.matches} players={data.players} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MatchList matches={data.matches} players={data.players} onDelete={actions.deleteMatch} onUpdate={actions.updateMatch} onLogMatch={() => onNavigate('log')} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} photoByName={photoByName} />
        <Leaderboard matches={data.matches} players={data.players} photoByName={photoByName} onViewProfile={onViewProfile} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VideoSection videos={data.videos} onAdd={actions.addVideo} onDelete={actions.deleteVideo} isAdmin={isSuperAdmin} />
        <PhotoGallery photos={data.photos} onAdd={actions.addPhoto} onDelete={actions.deletePhoto} isAdmin={isSuperAdmin} />
      </div>
    </div>
  )
}
