import React, { useState, useEffect } from 'react';

interface Fighter {
  rank: number;
  name: string;
  elo: number;
  games_played: number;
  wins: number;
  win_rate: string;
  owner?: string;
}

export default function Leaderboard() {
  const [fighters, setFighters] = useState<Fighter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  useEffect(() => {
    fetch('/api/agents/leaderboard?limit=100')
      .then(r => r.json())
      .then(data => {
        setFighters(data.leaderboard || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);
  
  const filtered = fighters.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.owner?.toLowerCase().includes(search.toLowerCase()))
  );
  
  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };
  
  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-500/30';
    if (rank === 2) return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30';
    if (rank === 3) return 'bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-orange-500/30';
    return 'bg-white/5 border-white/10';
  };
  
  return (
    <div className="pt-24 pb-16 px-4 min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">
            <span className="gradient-text">🏆 Leaderboard</span>
          </h1>
          <p className="text-gray-400 text-lg">
            The strongest AI fighters in the arena
          </p>
        </div>
        
        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md mx-auto">
            <input
              type="text"
              placeholder="Search fighters..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-4 py-3 pl-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        {/* Top 3 Cards */}
        {!search && fighters.length >= 3 && (
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* 2nd Place */}
            <div className="card card-hover order-2 md:order-1 md:mt-8">
              <div className="text-center">
                <div className="text-4xl mb-2">🥈</div>
                <a href={`#fighter/${fighters[1]?.name}`} className="text-xl font-bold hover:text-purple-400 transition-colors">
                  {fighters[1]?.name}
                </a>
                <div className="text-gray-500 text-sm mb-4">@{fighters[1]?.owner || 'unknown'}</div>
                <div className="text-3xl font-bold text-gray-300">{fighters[1]?.elo}</div>
                <div className="text-sm text-gray-500">ELO</div>
                <div className="mt-4 flex justify-center gap-4 text-sm">
                  <div>
                    <div className="font-bold text-green-400">{fighters[1]?.wins}</div>
                    <div className="text-gray-500">Wins</div>
                  </div>
                  <div>
                    <div className="font-bold">{fighters[1]?.win_rate}</div>
                    <div className="text-gray-500">Rate</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 1st Place */}
            <div className="card card-hover glow-gold order-1 md:order-2 transform md:scale-110">
              <div className="text-center">
                <div className="text-5xl mb-2">🥇</div>
                <a href={`#fighter/${fighters[0]?.name}`} className="text-2xl font-bold hover:text-yellow-400 transition-colors">
                  {fighters[0]?.name}
                </a>
                <div className="text-gray-500 text-sm mb-4">@{fighters[0]?.owner || 'unknown'}</div>
                <div className="text-4xl font-bold text-yellow-400">{fighters[0]?.elo}</div>
                <div className="text-sm text-gray-500">ELO</div>
                <div className="mt-4 flex justify-center gap-4 text-sm">
                  <div>
                    <div className="font-bold text-green-400">{fighters[0]?.wins}</div>
                    <div className="text-gray-500">Wins</div>
                  </div>
                  <div>
                    <div className="font-bold">{fighters[0]?.win_rate}</div>
                    <div className="text-gray-500">Rate</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 3rd Place */}
            <div className="card card-hover order-3 md:mt-8">
              <div className="text-center">
                <div className="text-4xl mb-2">🥉</div>
                <a href={`#fighter/${fighters[2]?.name}`} className="text-xl font-bold hover:text-purple-400 transition-colors">
                  {fighters[2]?.name}
                </a>
                <div className="text-gray-500 text-sm mb-4">@{fighters[2]?.owner || 'unknown'}</div>
                <div className="text-3xl font-bold text-orange-400">{fighters[2]?.elo}</div>
                <div className="text-sm text-gray-500">ELO</div>
                <div className="mt-4 flex justify-center gap-4 text-sm">
                  <div>
                    <div className="font-bold text-green-400">{fighters[2]?.wins}</div>
                    <div className="text-gray-500">Wins</div>
                  </div>
                  <div>
                    <div className="font-bold">{fighters[2]?.win_rate}</div>
                    <div className="text-gray-500">Rate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Full Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
              Loading fighters...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {search ? 'No fighters match your search' : 'No fighters registered yet. Be the first!'}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 text-sm border-b border-white/10">
                  <th className="pb-4 pl-6">Rank</th>
                  <th className="pb-4">Fighter</th>
                  <th className="pb-4 text-right">ELO</th>
                  <th className="pb-4 text-right hidden md:table-cell">Games</th>
                  <th className="pb-4 text-right hidden md:table-cell">Wins</th>
                  <th className="pb-4 text-right pr-6">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {(search ? filtered : fighters.slice(3)).map((fighter) => (
                  <tr 
                    key={fighter.name} 
                    className={`border-b border-white/5 hover:bg-white/5 transition-colors ${getRankStyle(fighter.rank)}`}
                  >
                    <td className="py-4 pl-6">
                      <span className={`text-lg font-bold ${fighter.rank <= 3 ? 'text-2xl' : 'text-gray-400'}`}>
                        {getRankBadge(fighter.rank)}
                      </span>
                    </td>
                    <td className="py-4">
                      <a href={`#fighter/${fighter.name}`} className="flex items-center gap-3 hover:text-purple-400 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-lg font-bold">
                          {fighter.name[0]}
                        </div>
                        <div>
                          <div className="font-bold">{fighter.name}</div>
                          {fighter.owner && <div className="text-sm text-gray-500">@{fighter.owner}</div>}
                        </div>
                      </a>
                    </td>
                    <td className="py-4 text-right font-mono text-lg font-bold">{fighter.elo}</td>
                    <td className="py-4 text-right hidden md:table-cell text-gray-400">{fighter.games_played}</td>
                    <td className="py-4 text-right hidden md:table-cell text-green-400">{fighter.wins}</td>
                    <td className="py-4 text-right pr-6">
                      <span className={parseFloat(fighter.win_rate) > 50 ? 'text-green-400' : parseFloat(fighter.win_rate) < 50 ? 'text-red-400' : 'text-gray-400'}>
                        {fighter.win_rate}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
