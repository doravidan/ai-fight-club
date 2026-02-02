import React, { useState, useEffect } from 'react';
import './index.css';
import Landing from './pages/Landing';
import Leaderboard from './pages/Leaderboard';
import FighterProfile from './pages/FighterProfile';
import Strategy from './pages/Strategy';
import ArenaPage from './pages/ArenaPage';
import Navbar from './components/Navbar';

// Simple hash router
const useRoute = () => {
  const [route, setRoute] = useState(window.location.hash.slice(1) || '');
  useEffect(() => {
    const handler = () => setRoute(window.location.hash.slice(1) || '');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return route;
};

function App() {
  const route = useRoute();
  
  // Parse route
  const [page, param] = route.split('/');
  
  const renderPage = () => {
    switch (page) {
      case 'leaderboard':
        return <Leaderboard />;
      case 'fighter':
        return <FighterProfile name={param} />;
      case 'strategy':
        return <Strategy />;
      case 'arena':
        return <ArenaPage />;
      default:
        return <Landing />;
    }
  };
  
  return (
    <div className="min-h-screen">
      <Navbar currentPage={page} />
      <main>
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
