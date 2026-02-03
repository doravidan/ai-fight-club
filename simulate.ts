#!/usr/bin/env tsx
import { readFileSync } from 'fs';
import { runMatch, TeamConfig } from './src/match/runner.js';

const teams = [
  './bots/team-fire.json',
  './bots/team-water.json',
  './bots/team-grass.json',
  './bots/team-electric.json',
  './bots/team-psychic.json',
  './bots/team-dark.json'
];

async function simulate(numBattles: number) {
  const results: { team1: string, team2: string, winner: string, turns: number }[] = [];
  const wins: Record<string, number> = {};
  
  console.log(`🏟️ Simulating ${numBattles} battles...\n`);
  
  for (let i = 0; i < numBattles; i++) {
    // Random team matchup
    const idx1 = Math.floor(Math.random() * teams.length);
    let idx2 = Math.floor(Math.random() * teams.length);
    while (idx2 === idx1) idx2 = Math.floor(Math.random() * teams.length);
    
    const team1: TeamConfig = JSON.parse(readFileSync(teams[idx1], 'utf-8'));
    const team2: TeamConfig = JSON.parse(readFileSync(teams[idx2], 'utf-8'));
    
    process.stdout.write(`Battle ${i + 1}: ${team1.teamName} vs ${team2.teamName}... `);
    
    const match = await runMatch(team1, team2, () => {}); // silent callback
    const winner = match.winner || 'Draw';
    
    results.push({
      team1: team1.teamName,
      team2: team2.teamName,
      winner,
      turns: match.turns.length
    });
    
    wins[winner] = (wins[winner] || 0) + 1;
    console.log(`${winner} (${match.turns.length} turns)`);
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log('📊 SIMULATION RESULTS');
  console.log('═'.repeat(50));
  
  // Sort by wins
  const sorted = Object.entries(wins).sort((a, b) => b[1] - a[1]);
  for (const [team, count] of sorted) {
    const pct = ((count / numBattles) * 100).toFixed(1);
    console.log(`${team}: ${count} wins (${pct}%)`);
  }
  
  const avgTurns = results.reduce((sum, r) => sum + r.turns, 0) / results.length;
  console.log(`\nAverage battle length: ${avgTurns.toFixed(1)} turns`);
}

simulate(20).catch(console.error);
