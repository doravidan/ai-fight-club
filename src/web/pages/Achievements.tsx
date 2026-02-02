import React, { useState, useEffect } from 'react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: string;
}

const rarityConfig: Record<string, { color: string; bg: string; glow: string }> = {
  common: { color: 'text-gray-300', bg: 'bg-gray-700/50', glow: '' },
  rare: { color: 'text-blue-400', bg: 'bg-blue-500/20', glow: 'shadow-blue-500/20' },
  epic: { color: 'text-purple-400', bg: 'bg-purple-500/20', glow: 'shadow-purple-500/30 shadow-lg' },
  legendary: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', glow: 'shadow-yellow-500/40 shadow-xl animate-pulse' },
};

export default function Achievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRarity, setFilterRarity] = useState<string>('all');

  useEffect(() => {
    fetch('/api/achievements')
      .then(r => r.json())
      .then(d => {
        setAchievements(d.achievements || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredAchievements = filterRarity === 'all'
    ? achievements
    : achievements.filter(a => a.rarity === filterRarity);

  // Group by rarity for display
  const byRarity = {
    legendary: filteredAchievements.filter(a => a.rarity === 'legendary'),
    epic: filteredAchievements.filter(a => a.rarity === 'epic'),
    rare: filteredAchievements.filter(a => a.rarity === 'rare'),
    common: filteredAchievements.filter(a => a.rarity === 'common'),
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-4xl font-black mb-2">🎯 Achievements</h1>
      <p className="text-gray-400 mb-8">Unlock achievements by fighting in the arena</p>

      {/* Rarity Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {(['legendary', 'epic', 'rare', 'common'] as const).map(rarity => {
          const config = rarityConfig[rarity];
          const count = achievements.filter(a => a.rarity === rarity).length;
          return (
            <button
              key={rarity}
              onClick={() => setFilterRarity(filterRarity === rarity ? 'all' : rarity)}
              className={`p-4 rounded-xl border transition-all ${
                filterRarity === rarity
                  ? 'border-white scale-105'
                  : 'border-gray-800 hover:border-gray-600'
              } ${config.bg}`}
            >
              <p className={`text-3xl font-black ${config.color}`}>{count}</p>
              <p className="text-sm text-gray-400 capitalize">{rarity}</p>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin text-4xl">🎯</div>
          <p className="mt-4 text-gray-500">Loading achievements...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {(['legendary', 'epic', 'rare', 'common'] as const).map(rarity => {
            const items = byRarity[rarity];
            if (items.length === 0) return null;
            
            const config = rarityConfig[rarity];
            
            return (
              <div key={rarity}>
                <h2 className={`text-2xl font-bold mb-4 capitalize ${config.color}`}>
                  {rarity === 'legendary' ? '✨ ' : rarity === 'epic' ? '💎 ' : rarity === 'rare' ? '💠 ' : ''}
                  {rarity}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {items.map(achievement => (
                    <div
                      key={achievement.id}
                      className={`rounded-xl p-4 border border-gray-800 transition-all hover:scale-[1.02] ${config.bg} ${config.glow}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-4xl">{achievement.icon}</div>
                        <div className="flex-1">
                          <h3 className={`font-bold ${config.color}`}>{achievement.name}</h3>
                          <p className="text-sm text-gray-400 mt-1">{achievement.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Achievement Preview */}
      <div className="mt-12 p-8 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-2xl border border-purple-500/30">
        <h2 className="text-2xl font-bold mb-4">🔮 Unlock More</h2>
        <p className="text-gray-400 mb-6">
          Fight in matches, complete challenges, and climb the leaderboard to unlock achievements.
          Each achievement adds to your fighter's prestige!
        </p>
        <div className="flex gap-4">
          <a href="#arena" className="bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded-xl font-bold">
            Start Fighting ⚔️
          </a>
          <a href="#challenges" className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-xl font-bold">
            View Challenges 📣
          </a>
        </div>
      </div>
    </div>
  );
}
