import React, { useState, useEffect } from 'react';

interface NavbarProps {
  currentPage: string;
}

export default function Navbar({ currentPage }: NavbarProps) {
  const [stats, setStats] = useState({ queueSize: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  
  useEffect(() => {
    fetch('/api/arena/stats')
      .then(res => res.json())
      .then(setStats)
      .catch(() => {});
  }, []);
  
  const mainLinks = [
    { href: '#', label: 'Home', icon: '🏠' },
    { href: '#play', label: 'Play', icon: '🎮' },
    { href: '#leaderboard', label: 'Leaderboard', icon: '🏆' },
    { href: '#challenges', label: 'Challenges', icon: '🥊' },
  ];
  
  const moreLinks = [
    { href: '#arena', label: 'Watch Battles', icon: '👀' },
    { href: '#activity', label: 'Activity', icon: '📰' },
    { href: '#trash-talk', label: 'Trash Talk', icon: '🎤' },
    { href: '#tournaments', label: 'Tournaments', icon: '🏅' },
    { href: '#achievements', label: 'Achievements', icon: '🎯' },
    { href: '#strategy', label: 'Strategy', icon: '📖' },
  ];
  
  const allLinks = [...mainLinks, ...moreLinks];
  
  const isActive = (href: string) => {
    if (href === '#' && !currentPage) return true;
    return href === `#${currentPage}`;
  };
  
  return (
    <nav className="navbar">
      <div className="container-main">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2">
            <span className="text-2xl">⚔️</span>
            <span className="text-lg font-bold gradient-text hide-mobile">AI Fight Club</span>
          </a>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {mainLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                className={`nav-link ${isActive(link.href) ? 'active' : ''}`}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </a>
            ))}
            
            {/* More Dropdown */}
            <div className="relative">
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                onBlur={() => setTimeout(() => setMoreOpen(false), 200)}
                className={`nav-link ${moreLinks.some(l => isActive(l.href)) ? 'active' : ''}`}
              >
                <span>✨</span>
                <span>More</span>
                <svg className={`w-4 h-4 transition-transform ${moreOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {moreOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl py-2 animate-fade-in">
                  {moreLinks.map(link => (
                    <a
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                        isActive(link.href)
                          ? 'text-[var(--accent)] bg-[var(--accent-muted)]'
                          : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      <span>{link.icon}</span>
                      <span>{link.label}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Live Badge */}
            <div className="badge badge-success">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              <span>{stats.queueSize} live</span>
            </div>
            
            {/* CTA */}
            <a href="#play" className="btn btn-primary text-sm py-2 px-4 hidden md:flex">
              🎮 Play Now
            </a>
            
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-[var(--text-secondary)] hover:text-white"
            >
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--bg-secondary)] max-h-[80vh] overflow-y-auto animate-fade-in">
          <div className="p-4 space-y-1">
            {allLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive(link.href)
                    ? 'text-[var(--accent)] bg-[var(--accent-muted)]'
                    : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)]'
                }`}
              >
                <span className="text-xl">{link.icon}</span>
                <span className="font-medium">{link.label}</span>
              </a>
            ))}
            
            <div className="pt-4 mt-4 border-t border-[var(--border)]">
              <a href="#play" onClick={() => setMenuOpen(false)} className="btn btn-primary w-full justify-center">
                🎮 Play Now
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
