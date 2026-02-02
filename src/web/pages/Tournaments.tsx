import React, { useState, useEffect } from 'react';

interface Tournament {
  id: string;
  name: string;
  description: string;
  status: 'registration' | 'in_progress' | 'completed';
  maxParticipants: number;
  participants: string[];
  bracket: TournamentMatch[];
  prize?: string;
  createdAt: string;
  startsAt: string;
  completedAt?: string;
}

interface TournamentMatch {
  id: string;
  round: number;
  position: number;
  fighter1Id?: string;
  fighter2Id?: string;
  winnerId?: string;
  matchId?: string;
}

const statusConfig: Record<string, { color: string; icon: string; label: string }> = {
  registration: { color: 'bg-green-500/20 text-green-400 border-green-500/50', icon: '📝', label: 'Open' },
  in_progress: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', icon: '⚔️', label: 'In Progress' },
  completed: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/50', icon: '🏆', label: 'Completed' },
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Tournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  useEffect(() => {
    fetch('/api/tournaments')
      .then(r => r.json())
      .then(d => {
        setTournaments(d.tournaments || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredTournaments = filter === 'all'
    ? tournaments
    : tournaments.filter(t => t.status === filter);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black">🏆 Tournaments</h1>
          <p className="text-gray-400 mt-2">Compete in brackets for glory and prizes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'registration', 'in_progress', 'completed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f
                ? 'bg-yellow-500 text-black'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Tournament Detail Modal */}
      {selectedTournament && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">{selectedTournament.name}</h2>
              <button
                onClick={() => setSelectedTournament(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <p className="text-gray-400 mb-6">{selectedTournament.description}</p>
            
            {/* Bracket Display */}
            {selectedTournament.bracket.length > 0 ? (
              <div className="overflow-x-auto">
                <h3 className="text-lg font-bold mb-4">🎯 Bracket</h3>
                <div className="flex gap-8 min-w-max">
                  {/* Group matches by round */}
                  {Array.from(new Set(selectedTournament.bracket.map(m => m.round))).map(round => (
                    <div key={round} className="space-y-4">
                      <h4 className="text-sm text-gray-500 text-center mb-4">Round {round}</h4>
                      {selectedTournament.bracket
                        .filter(m => m.round === round)
                        .map(match => (
                          <div
                            key={match.id}
                            className="bg-gray-800 rounded-lg p-3 w-48 border border-gray-700"
                          >
                            <div className={`p-2 rounded ${match.winnerId === match.fighter1Id ? 'bg-green-500/20' : ''}`}>
                              {match.fighter1Id || 'TBD'}
                            </div>
                            <div className="text-center text-gray-500 text-xs my-1">vs</div>
                            <div className={`p-2 rounded ${match.winnerId === match.fighter2Id ? 'bg-green-500/20' : ''}`}>
                              {match.fighter2Id || 'TBD'}
                            </div>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-gray-800/50 rounded-xl">
                <p className="text-gray-400">Bracket not yet generated</p>
                <p className="text-sm text-gray-500 mt-2">
                  {selectedTournament.participants.length}/{selectedTournament.maxParticipants} participants
                </p>
              </div>
            )}
            
            {/* Participants */}
            <div className="mt-6">
              <h3 className="text-lg font-bold mb-4">👥 Participants ({selectedTournament.participants.length})</h3>
              <div className="flex flex-wrap gap-2">
                {selectedTournament.participants.map((p, i) => (
                  <span key={i} className="bg-gray-800 px-3 py-1 rounded-full text-sm">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-bounce text-4xl">🏆</div>
          <p className="mt-4 text-gray-500">Loading tournaments...</p>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="text-center py-20 bg-gray-900/50 rounded-xl">
          <p className="text-6xl mb-4">🏟️</p>
          <p className="text-gray-400">No tournaments yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredTournaments.map(tournament => {
            const config = statusConfig[tournament.status];
            return (
              <div
                key={tournament.id}
                onClick={() => setSelectedTournament(tournament)}
                className="bg-gray-900/50 rounded-xl p-6 border border-gray-800 hover:border-gray-600 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{tournament.name}</h3>
                    <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                      {tournament.description}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs border ${config.color}`}>
                    {config.icon} {config.label}
                  </span>
                </div>
                
                {tournament.prize && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                    <span className="text-yellow-400 font-bold">🎁 Prize: {tournament.prize}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400">
                      👥 {tournament.participants.length}/{tournament.maxParticipants}
                    </span>
                    <span className="text-gray-400">
                      📅 {formatDate(tournament.startsAt)}
                    </span>
                  </div>
                  {tournament.status === 'registration' && (
                    <button className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg text-sm font-bold">
                      Join
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
