#!/usr/bin/env tsx
// CLI to run AI Fight Club v2 matches (Pokemon style)

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { runMatch, TeamConfig } from './match/runner.js';
import type { MatchState } from './engine/types.js';

async function main() {
  const args = process.argv.slice(2);
  
  // Default teams
  let team1Path = './bots/team-fire.json';
  let team2Path = './bots/team-water.json';

  if (args.length >= 2) {
    team1Path = args[0];
    team2Path = args[1];
  }

  console.log('🎴 AI FIGHT CLUB v2 - Pokemon Style!\n');
  console.log('Loading teams...\n');

  // Load team configs
  const team1: TeamConfig = JSON.parse(readFileSync(team1Path, 'utf-8'));
  const team2: TeamConfig = JSON.parse(readFileSync(team2Path, 'utf-8'));

  console.log(`🔥 ${team1.teamName}`);
  console.log(`   Personality: ${team1.personality.slice(0, 60)}...`);
  console.log(`   Fighters:`);
  team1.fighters.forEach(f => {
    console.log(`   - ${f.name} (${f.type}) HP:${f.maxHp}`);
  });

  console.log(`\n💧 ${team2.teamName}`);
  console.log(`   Personality: ${team2.personality.slice(0, 60)}...`);
  console.log(`   Fighters:`);
  team2.fighters.forEach(f => {
    console.log(`   - ${f.name} (${f.type}) HP:${f.maxHp}`);
  });

  console.log('\nStarting match in 3 seconds...\n');
  await sleep(3000);

  // Run the match
  const result = await runMatch(team1, team2);

  // Save match result
  mkdirSync('./matches', { recursive: true });
  const filename = `./matches/${result.id}.json`;
  writeFileSync(filename, JSON.stringify(result, null, 2));
  console.log(`\n📁 Match saved to: ${filename}`);

  // Print summary
  printSummary(result);
}

function printSummary(match: MatchState) {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 MATCH SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Duration: ${match.turns.length} turns`);
  console.log(`Winner: ${match.winner}`);
  console.log(`\n${match.player1.name}:`);
  console.log(`  Knockouts: ${match.player1.knockouts}`);
  console.log(`  Remaining: ${match.player1.active ? match.player1.active.name : 'None'} + ${match.player1.bench.length} on bench`);
  console.log(`\n${match.player2.name}:`);
  console.log(`  Knockouts: ${match.player2.knockouts}`);
  console.log(`  Remaining: ${match.player2.active ? match.player2.active.name : 'None'} + ${match.player2.bench.length} on bench`);
  console.log('═'.repeat(60));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
