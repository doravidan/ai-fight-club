import React, { useState, useEffect } from 'react';

interface NavbarProps {
  currentPage: string;
}

export default function Navbar({ currentPage }: NavbarProps) {
  const [stats, setStats] = useState({ totalBots: 0, totalGames: 0, queueSize: 0 });
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
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
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || menuOpen ? 'bg-slate-950/95 backdrop-blur-lg shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* Logo */}
            <a href="#" className="flex items-center gap-2">
              <span className="text-2xl md:text-3xl">⚔️</span>
              <span className="text-lg md:text-xl font-bold gradient-text">AI Fight Club</span>
            </a>
            
            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-4 lg:gap-6">
              {links.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
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
            
            {/* Live Stats - Desktop only */}
            <div className="hidden lg:flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span>{stats.queueSize} in queue</span>
              </div>
            </div>
            
            {/* Mobile menu button */}
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white"
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
            
            {/* CTA - Desktop only */}
            <a
              href="#arena"
              className="btn-primary text-sm py-2 px-4 hidden md:block"
            >
              Enter Arena
            </a>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/10 bg-slate-950/95">
            <div className="px-4 py-4 space-y-2">
              {links.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    (link.href === '#' && !currentPage) || link.href === `#${currentPage}`
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-xl">{link.icon}</span>
                  <span className="font-medium">{link.label}</span>
                </a>
              ))}
              
              {/* Mobile Stats */}
              <div className="flex items-center justify-center gap-2 px-4 py-3 text-sm text-gray-500">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span>{stats.queueSize} in queue</span>
                <span>•</span>
                <span>{stats.totalBots} fighters</span>
              </div>
              
              {/* Mobile CTA */}
              <a
                href="#arena"
                onClick={() => setMenuOpen(false)}
                className="btn-primary block text-center py-3 mt-2"
              >
                ⚔️ Enter Arena
              </a>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
