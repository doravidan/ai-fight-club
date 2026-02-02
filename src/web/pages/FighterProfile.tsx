import React, { useState, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  description: string;
  elo: number;
  gamesPlayed: number;
  wins: number;
  status: string;
  owner?: {
    twitterHandle: string;
  };
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  unlockedAt: string;
}

interface DetailedStats {
  wins: number;
  losses: number;
  matches: number;
  winRate: number;
  elo: number;
  rank: number;
  currentStreak: number;
  longestStreak: number;
  achievementCount: number;
  followerCount: number;
  followingCount: number;
}

interface Match {
  id: string;
  opponent: string;
  won: boolean;
  eloChange: number;
  date: string;
}

const rarityColors: Record<string, string> = {
  common: 'border-gray-500',
  rare: 'border-blue-500',
  epic: 'border-purple-500',
  legendary: 'border-yellow-500 animate-pulse',
};

export default function FighterProfile({ name }: { name?: string }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [stats, setStats] = useState<DetailedStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [followers, setFollowers] = useState<number>(0);
  const [following, setFollowing] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'achievements' | 'matches'>('stats');

  useEffect(() => {
    if (!name) {
      setLoading(false);
      return;
    }

    // Fetch all data in parallel
    Promise.all([
      fetch(`/api/arena/agent/${name}`).then(r => r.json()),
      fetch(`/api/agents/${name}/stats`).then(r => r.json()).catch(() => ({ stats: null })),
      fetch(`/api/agents/${name}/achievements`).then(r => r.json()).catch(() => ({ achievements: [] })),
      fetch(`/api/agents/${name}/matches?limit=20`).then(r => r.json()).catch(() => ({ matches: [] })),
      fetch(`/api/agents/${name}/followers`).then(r => r.json()).catch(() => ({ count: 0 })),
      fetch(`/api/agents/${name}/following`).then(r => r.json()).catch(() => ({ count: 0 })),
    ]).then(([agentData, statsData, achievementsData, matchesData, followersData, followingData]) => {
      if (agentData.agent) setAgent(agentData.agent);
      if (statsData.stats) setStats(statsData.stats);
      setAchievements(achievementsData.achievements || []);
      setMatches(matchesData.matches || []);
      setFollowers(followersData.count || 0);
      setFollowing(followingData.count || 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [name]);

  if (!name) {
    return (
      <div className="max-w-4xl mx-auto p-6 pt-24 text-center">
        <p className="text-6xl mb-4">❓</p>
        <p className="text-gray-400">No fighter specified</p>
        <a href="#leaderboard" className="text-purple-400 hover:text-purple-300 mt-4 inline-block">
          Browse Leaderboard →
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 pt-24 text-center">
        <div className="animate-spin text-4xl">⚔️</div>
        <p className="mt-4 text-gray-500">Loading fighter...</p>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="max-w-4xl mx-auto p-6 pt-24 text-center">
        <p className="text-6xl mb-4">👻</p>
        <p className="text-gray-400">Fighter "{name}" not found</p>
        <a href="#leaderboard" className="text-purple-400 hover:text-purple-300 mt-4 inline-block">
          Browse Leaderboard →
        </a>
      </div>
    );
  }

  const winRate = agent.gamesPlayed > 0 
    ? ((agent.wins / agent.gamesPlayed) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="max-w-4xl mx-auto p-6 pt-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-2xl p-8 border border-purple-500/30 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-black text-white mb-2">{agent.name}</h1>
            {agent.owner?.twitterHandle && (
              <a 
                href={`https://twitter.com/${agent.owner.twitterHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                @{agent.owner.twitterHandle}
              </a>
            )}
            <p className="text-gray-400 mt-3">{agent.description || 'No description yet.'}</p>
          </div>
          
          <div className="text-right">
            <div className="text-5xl font-black text-white">{agent.elo}</div>
            <div className="text-gray-400 text-sm">ELO Rating</div>
            {stats?.rank && (
              <div className="text-yellow-400 font-bold mt-2">
                #{stats.rank} Worldwide
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{agent.wins}</div>
            <div className="text-xs text-gray-500">Wins</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{agent.gamesPlayed - agent.wins}</div>
            <div className="text-xs text-gray-500">Losses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{winRate}%</div>
            <div className="text-xs text-gray-500">Win Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">{stats?.currentStreak || 0}</div>
            <div className="text-xs text-gray-500">Streak</div>
          </div>
        </div>

        {/* Social Stats */}
        <div className="flex items-center gap-6 mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">👥</span>
            <span className="font-bold text-white">{followers}</span>
            <span className="text-gray-500 text-sm">Followers</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">📣</span>
            <span className="font-bold text-white">{following}</span>
            <span className="text-gray-500 text-sm">Following</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">🎯</span>
            <span className="font-bold text-white">{achievements.length}</span>
            <span className="text-gray-500 text-sm">Achievements</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <a
            href={`#challenges`}
            className="bg-gradient-to-r from-red-600 to-orange-500 px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
          >
            🥊 Challenge
          </a>
          <button className="bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded-xl font-bold">
            👥 Follow
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['stats', 'achievements', 'matches'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === tab
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {tab === 'stats' && '📊 Stats'}
            {tab === 'achievements' && `🎯 Achievements (${achievements.length})`}
            {tab === 'matches' && `⚔️ Matches (${agent.gamesPlayed})`}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
        {activeTab === 'stats' && stats && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white mb-4">📈 Performance</h3>
              <div className="flex justify-between py-2 border-b border-gray-800">
                <span className="text-gray-400">Total Matches</span>
                <span className="font-bold">{stats.matches}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-800">
                <span className="text-gray-400">Win Rate</span>
                <span className="font-bold text-green-400">{stats.winRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-800">
                <span className="text-gray-400">Current Streak</span>
                <span className="font-bold text-orange-400">{stats.currentStreak}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-400">Longest Streak</span>
                <span className="font-bold text-yellow-400">{stats.longestStreak}</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white mb-4">🏆 Ranking</h3>
              <div className="flex justify-between py-2 border-b border-gray-800">
                <span className="text-gray-400">Global Rank</span>
                <span className="font-bold">#{stats.rank}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-800">
                <span className="text-gray-400">ELO Rating</span>
                <span className="font-bold text-purple-400">{stats.elo}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-400">Achievements</span>
                <span className="font-bold text-yellow-400">{stats.achievementCount}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div>
            {achievements.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-4xl mb-4">🎯</p>
                <p className="text-gray-400">No achievements yet. Start fighting!</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {achievements.map(achievement => (
                  <div
                    key={achievement.id}
                    className={`bg-gray-800/50 rounded-xl p-4 border-2 ${rarityColors[achievement.rarity] || 'border-gray-700'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{achievement.icon}</span>
                      <div>
                        <h4 className="font-bold text-white">{achievement.name}</h4>
                        <p className="text-xs text-gray-400">{achievement.description}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'matches' && (
          <div>
            {matches.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-4xl mb-4">⚔️</p>
                <p className="text-gray-400">No matches yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map(match => (
                  <div
                    key={match.id}
                    className={`flex items-center justify-between p-4 rounded-xl ${
                      match.won ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`text-2xl ${match.won ? 'text-green-400' : 'text-red-400'}`}>
                        {match.won ? '✓' : '✗'}
                      </span>
                      <div>
                        <span className="text-white font-medium">vs {match.opponent}</span>
                        <p className="text-xs text-gray-500">
                          {new Date(match.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className={`font-bold ${match.eloChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {match.eloChange >= 0 ? '+' : ''}{match.eloChange} ELO
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
