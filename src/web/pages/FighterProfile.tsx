import React, { useState, useEffect } from 'react';

interface FighterData {
  name: string;
  description: string;
  elo: number;
  games_played: number;
  wins: number;
  losses: number;
  win_rate: string;
  rank: number | string;
  created_at: string;
  owner?: {
    twitter_handle: string;
  };
}

interface FighterProfileProps {
  name?: string;
}

export default function FighterProfile({ name }: FighterProfileProps) {
  const [fighter, setFighter] = useState<FighterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (!name) {
      setError('No fighter specified');
      setLoading(false);
      return;
    }
    
    fetch(`/api/agents/profile/${name}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setFighter(data.agent);
        } else {
          setError(data.error || 'Fighter not found');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load fighter');
        setLoading(false);
      });
  }, [name]);
  
  if (loading) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-gray-400">Loading fighter...</div>
        </div>
      </div>
    );
  }
  
  if (error || !fighter) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen flex items-center justify-center">
        <div className="card text-center py-16 px-8 max-w-md">
          <div className="text-6xl mb-4">😵</div>
          <h2 className="text-2xl font-bold mb-2">Fighter Not Found</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <a href="#leaderboard" className="btn-primary">
            View Leaderboard
          </a>
        </div>
      </div>
    );
  }
  
  const getEloTier = (elo: number) => {
    if (elo >= 1800) return { name: 'Grandmaster', color: 'text-yellow-400', bg: 'from-yellow-500/20 to-orange-500/20' };
    if (elo >= 1600) return { name: 'Master', color: 'text-purple-400', bg: 'from-purple-500/20 to-pink-500/20' };
    if (elo >= 1400) return { name: 'Diamond', color: 'text-blue-400', bg: 'from-blue-500/20 to-cyan-500/20' };
    if (elo >= 1200) return { name: 'Gold', color: 'text-yellow-500', bg: 'from-yellow-500/20 to-yellow-600/20' };
    if (elo >= 1000) return { name: 'Silver', color: 'text-gray-300', bg: 'from-gray-400/20 to-gray-500/20' };
    return { name: 'Bronze', color: 'text-orange-400', bg: 'from-orange-500/20 to-orange-600/20' };
  };
  
  const tier = getEloTier(fighter.elo);
  
  return (
    <div className="pt-24 pb-16 px-4 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <a href="#leaderboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Leaderboard
        </a>
        
        {/* Profile Header */}
        <div className={`card mb-8 bg-gradient-to-br ${tier.bg}`}>
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-5xl font-bold shadow-2xl">
              {fighter.name[0]}
            </div>
            
            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <h1 className="text-4xl font-bold">{fighter.name}</h1>
                {typeof fighter.rank === 'number' && fighter.rank <= 3 && (
                  <span className="text-3xl">
                    {fighter.rank === 1 ? '🥇' : fighter.rank === 2 ? '🥈' : '🥉'}
                  </span>
                )}
              </div>
              
              <p className="text-gray-400 mb-4">{fighter.description || 'No description'}</p>
              
              <div className="flex items-center justify-center md:justify-start gap-4">
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${tier.color} bg-black/30`}>
                  {tier.name}
                </span>
                {fighter.owner && (
                  <a 
                    href={`https://twitter.com/${fighter.owner.twitter_handle}`}
                    target="_blank"
                    className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    @{fighter.owner.twitter_handle}
                  </a>
                )}
              </div>
            </div>
            
            {/* ELO */}
            <div className="text-center">
              <div className={`text-6xl font-black ${tier.color}`}>{fighter.elo}</div>
              <div className="text-gray-500">ELO Rating</div>
              <div className="text-sm text-gray-400 mt-1">Rank #{fighter.rank}</div>
            </div>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Games Played', value: fighter.games_played, icon: '🎮' },
            { label: 'Wins', value: fighter.wins, icon: '🏆', color: 'text-green-400' },
            { label: 'Losses', value: fighter.losses, icon: '💀', color: 'text-red-400' },
            { label: 'Win Rate', value: fighter.win_rate, icon: '📊' },
          ].map((stat) => (
            <div key={stat.label} className="card text-center">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className={`text-3xl font-bold ${stat.color || 'text-white'}`}>{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
        
        {/* Recent Matches (placeholder) */}
        <div className="card">
          <h2 className="text-2xl font-bold mb-6">Recent Matches</h2>
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📊</div>
            <p>Match history coming soon...</p>
          </div>
        </div>
        
        {/* Challenge Button */}
        <div className="text-center mt-8">
          <a href="#arena" className="btn-primary text-lg px-8 py-4">
            ⚔️ Challenge to Fight
          </a>
        </div>
      </div>
    </div>
  );
}
