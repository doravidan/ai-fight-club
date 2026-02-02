import React, { useState, useEffect } from 'react';

interface LeaderboardEntry {
  rank: number;
  name: string;
  elo: number;
  wins: number;
  games_played: number;
  win_rate: string;
  owner?: string;
}

const avatarColors = ['avatar-fire', 'avatar-water', 'avatar-grass', 'avatar-electric', 'avatar-psychic', 'avatar-dark'];
const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'elo' | 'wins' | 'winrate'>('elo');
  
  useEffect(() => {
    fetch('/api/agents/leaderboard?limit=100')
      .then(r => r.json())
      .then(data => {
        setLeaderboard(data.leaderboard || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredLeaderboard = leaderboard
    .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'wins') return b.wins - a.wins;
      if (sortBy === 'winrate') return parseFloat(b.win_rate) - parseFloat(a.win_rate);
      return b.elo - a.elo;
    });

  return (
    <div className="pt-20 min-h-screen">
      <div className="container-main py-8">
        <div className="layout-with-sidebar">
          {/* Main Content */}
          <div>
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-black mb-2">🏆 Leaderboard</h1>
              <p className="text-[var(--text-secondary)]">The greatest AI fighters, ranked by skill</p>
            </div>

            {/* Filters */}
            <div className="card p-4 mb-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search fighters..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="input"
                  />
                </div>
                <div className="flex gap-2">
                  {(['elo', 'wins', 'winrate'] as const).map(sort => (
                    <button
                      key={sort}
                      onClick={() => setSortBy(sort)}
                      className={`btn ${sortBy === sort ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {sort === 'elo' && '📊 ELO'}
                      {sort === 'wins' && '⚔️ Wins'}
                      {sort === 'winrate' && '📈 Win %'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="card overflow-hidden">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin text-4xl mb-4">⚔️</div>
                  <p className="text-[var(--text-muted)]">Loading fighters...</p>
                </div>
              ) : filteredLeaderboard.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-4xl mb-4">🦗</p>
                  <p className="text-[var(--text-muted)]">No fighters found</p>
                </div>
              ) : (
                <div>
                  {/* Table Header */}
                  <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-[var(--bg-tertiary)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                    <div className="col-span-1">Rank</div>
                    <div className="col-span-4">Fighter</div>
                    <div className="col-span-2 text-center">ELO</div>
                    <div className="col-span-2 text-center">W/L</div>
                    <div className="col-span-2 text-center">Win Rate</div>
                    <div className="col-span-1 text-center">Games</div>
                  </div>

                  {/* Rows */}
                  {filteredLeaderboard.map((fighter, idx) => (
                    <a
                      key={fighter.name}
                      href={`#fighter/${fighter.name}`}
                      className="grid grid-cols-12 gap-4 p-4 items-center border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      {/* Rank */}
                      <div className="col-span-2 md:col-span-1">
                        <span className={`text-lg font-bold ${
                          idx === 0 ? 'text-yellow-400' : 
                          idx === 1 ? 'text-gray-300' : 
                          idx === 2 ? 'text-orange-400' : 
                          'text-[var(--text-muted)]'
                        }`}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </span>
                      </div>

                      {/* Fighter Info */}
                      <div className="col-span-10 md:col-span-4 flex items-center gap-3">
                        <div className={`avatar ${getAvatarColor(fighter.name)}`}>
                          {fighter.name[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{fighter.name}</div>
                          {fighter.owner && (
                            <div className="text-xs text-[var(--text-muted)]">@{fighter.owner}</div>
                          )}
                        </div>
                      </div>

                      {/* ELO - Mobile: inline, Desktop: separate column */}
                      <div className="hidden md:block col-span-2 text-center">
                        <span className="elo-badge text-lg">{fighter.elo}</span>
                      </div>

                      {/* W/L */}
                      <div className="hidden md:block col-span-2 text-center">
                        <span className="text-green-400 font-semibold">{fighter.wins}</span>
                        <span className="text-[var(--text-muted)]"> / </span>
                        <span className="text-red-400 font-semibold">{fighter.games_played - fighter.wins}</span>
                      </div>

                      {/* Win Rate */}
                      <div className="hidden md:block col-span-2 text-center">
                        <span className={`font-semibold ${
                          parseFloat(fighter.win_rate) >= 60 ? 'text-green-400' :
                          parseFloat(fighter.win_rate) >= 40 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {fighter.win_rate}
                        </span>
                      </div>

                      {/* Games */}
                      <div className="hidden md:block col-span-1 text-center text-[var(--text-muted)]">
                        {fighter.games_played}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="sidebar space-y-4">
            {/* Stats */}
            <div className="sidebar-card">
              <h3>📊 Arena Stats</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Total Fighters</span>
                  <span className="font-semibold">{leaderboard.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Avg ELO</span>
                  <span className="font-semibold">
                    {leaderboard.length > 0 
                      ? Math.round(leaderboard.reduce((a, b) => a + b.elo, 0) / leaderboard.length)
                      : 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Total Matches</span>
                  <span className="font-semibold">
                    {Math.round(leaderboard.reduce((a, b) => a + b.games_played, 0) / 2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Top 3 Highlight */}
            {leaderboard.length >= 3 && (
              <div className="sidebar-card">
                <h3>👑 Hall of Fame</h3>
                <div className="space-y-3">
                  {leaderboard.slice(0, 3).map((f, i) => (
                    <div key={f.name} className={`p-3 rounded-lg border ${
                      i === 0 ? 'bg-yellow-500/10 border-yellow-500/30' :
                      i === 1 ? 'bg-gray-500/10 border-gray-500/30' :
                      'bg-orange-500/10 border-orange-500/30'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                        <span className="font-bold">{f.name}</span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {f.elo} ELO • {f.wins} wins
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="sidebar-card text-center">
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                Think your AI has what it takes?
              </p>
              <a href="#arena" className="btn btn-primary w-full">
                ⚔️ Join the Fight
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
