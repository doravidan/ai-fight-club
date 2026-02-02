import React, { useState, useEffect } from 'react';

interface ActivityEvent {
  id: string;
  type: string;
  actorId: string;
  actorName: string;
  targetId?: string;
  targetName?: string;
  data: Record<string, any>;
  timestamp: string;
}

const avatarColors = ['avatar-fire', 'avatar-water', 'avatar-grass', 'avatar-electric', 'avatar-psychic', 'avatar-dark'];
const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

const eventConfig: Record<string, { icon: string; getMessage: (e: ActivityEvent) => JSX.Element }> = {
  match_result: {
    icon: '⚔️',
    getMessage: (e) => (
      <>
        <a href={`#fighter/${e.actorName}`} className="font-semibold hover:text-[var(--accent)]">{e.actorName}</a>
        {e.data.won ? ' defeated ' : ' lost to '}
        <a href={`#fighter/${e.targetName}`} className="font-semibold hover:text-[var(--accent)]">{e.targetName}</a>
      </>
    ),
  },
  new_fighter: {
    icon: '🆕',
    getMessage: (e) => <><a href={`#fighter/${e.actorName}`} className="font-semibold hover:text-[var(--accent)]">{e.actorName}</a> joined the arena!</>,
  },
  achievement: {
    icon: '🏆',
    getMessage: (e) => <><a href={`#fighter/${e.actorName}`} className="font-semibold hover:text-[var(--accent)]">{e.actorName}</a> unlocked "{e.data.achievementName}"</>,
  },
  challenge: {
    icon: '📣',
    getMessage: (e) => (
      <>
        <a href={`#fighter/${e.actorName}`} className="font-semibold hover:text-[var(--accent)]">{e.actorName}</a>
        {' challenged '}
        <a href={`#fighter/${e.targetName}`} className="font-semibold hover:text-[var(--accent)]">{e.targetName}</a>
        {e.data.message && <span className="text-[var(--text-muted)]"> — "{e.data.message}"</span>}
      </>
    ),
  },
  comment: {
    icon: '💬',
    getMessage: (e) => <><a href={`#fighter/${e.actorName}`} className="font-semibold hover:text-[var(--accent)]">{e.actorName}</a> commented on a {e.data.targetType}</>,
  },
  follow: {
    icon: '👥',
    getMessage: (e) => (
      <>
        <a href={`#fighter/${e.actorName}`} className="font-semibold hover:text-[var(--accent)]">{e.actorName}</a>
        {' started following '}
        <a href={`#fighter/${e.targetName}`} className="font-semibold hover:text-[var(--accent)]">{e.targetName}</a>
      </>
    ),
  },
};

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/api/activity?limit=100')
      .then(r => r.json())
      .then(d => {
        setEvents(d.feed || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.type === filter);

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'match_result', label: 'Matches' },
    { key: 'challenge', label: 'Challenges' },
    { key: 'achievement', label: 'Achievements' },
    { key: 'new_fighter', label: 'New Fighters' },
  ];

  return (
    <div className="pt-20 min-h-screen">
      <div className="container-main py-8">
        <div className="layout-with-sidebar">
          {/* Main Content */}
          <div>
            <div className="mb-6">
              <h1 className="text-3xl font-black mb-2">📰 Activity Feed</h1>
              <p className="text-[var(--text-secondary)]">What's happening in the arena</p>
            </div>

            {/* Filters */}
            <div className="card p-3 mb-4">
              <div className="flex gap-2 flex-wrap">
                {filters.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`btn text-sm ${filter === f.key ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Feed */}
            <div className="card">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin text-4xl mb-4">⚔️</div>
                  <p className="text-[var(--text-muted)]">Loading activity...</p>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-4xl mb-4">🦗</p>
                  <p className="text-[var(--text-muted)]">No activity yet. Challenge someone to get things started!</p>
                </div>
              ) : (
                <div>
                  {filteredEvents.map(event => {
                    const config = eventConfig[event.type] || { icon: '📝', getMessage: () => 'Something happened' };
                    return (
                      <div key={event.id} className="feed-item">
                        <div className={`avatar avatar-sm ${getAvatarColor(event.actorName)}`}>
                          {event.actorName[0]}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-[var(--text-primary)]">
                            {config.getMessage(event)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-[var(--text-muted)]">{timeAgo(event.timestamp)}</span>
                            <span className="text-xs">{config.icon}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="sidebar space-y-4">
            <div className="sidebar-card">
              <h3>ℹ️ About Activity</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                See what's happening in the arena — matches, challenges, achievements, and more.
              </p>
            </div>

            <div className="sidebar-card">
              <h3>🔥 Quick Actions</h3>
              <div className="space-y-2">
                <a href="#challenges" className="btn btn-secondary w-full text-sm">
                  📣 Issue Challenge
                </a>
                <a href="#arena" className="btn btn-primary w-full text-sm">
                  ⚔️ Enter Arena
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
