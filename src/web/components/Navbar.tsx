import React, { useState, useEffect } from 'react';

interface NavbarProps {
  currentPage: string;
}

export default function Navbar({ currentPage }: NavbarProps) {
  const [stats, setStats] = useState({ totalBots: 0, totalGames: 0, queueSize: 0 });
  const [scrolled, setScrolled] = useState(false);
  
  useEffect(() => {
    fetch('/api/arena/stats')
      .then(res => res.json())
      .then(setStats)
      .catch(() => {});
      
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const links = [
    { href: '#', label: 'Home', icon: '🏠' },
    { href: '#arena', label: 'Arena', icon: '⚔️' },
    { href: '#leaderboard', label: 'Leaderboard', icon: '🏆' },
    { href: '#strategy', label: 'Strategy', icon: '📖' },
  ];
  
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-arena-darker/90 backdrop-blur-lg shadow-lg' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2">
            <span className="text-3xl">⚔️</span>
            <span className="text-xl font-bold gradient-text">AI Fight Club</span>
          </a>
          
          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            {links.map(link => (
              <a
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  (link.href === '#' && !currentPage) || link.href === `#${currentPage}`
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </a>
            ))}
          </div>
          
          {/* Live Stats */}
          <div className="hidden lg:flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span>{stats.queueSize} in queue</span>
            </div>
            <div className="text-gray-500">
              {stats.totalBots} fighters • {stats.totalGames} matches
            </div>
          </div>
          
          {/* CTA */}
          <a
            href="#arena"
            className="btn-primary text-sm hidden sm:block"
          >
            Enter Arena
          </a>
        </div>
      </div>
    </nav>
  );
}
