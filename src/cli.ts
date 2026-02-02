#!/usr/bin/env tsx
// CLI to run AI Fight Club matches

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { runMatch } from './match/runner.js';
import type { BotConfig, MatchState } from './engine/types.js';

async function main() {
  const args = process.argv.slice(2);
  
  // Default bots
  let bot1Path = './bots/berserker.json';
  let bot2Path = './bots/calculator.json';

  if (args.length >= 2) {
    bot1Path = args[0];
    bot2Path = args[1];
  }

  console.log('🥊 AI FIGHT CLUB - Loading fighters...\n');

  // Load bot configs
  const bot1: BotConfig = JSON.parse(readFileSync(bot1Path, 'utf-8'));
  const bot2: BotConfig = JSON.parse(readFileSync(bot2Path, 'utf-8'));

  console.log(`Fighter 1: ${bot1.name}`);
  console.log(`  Personality: ${bot1.personality.slice(0, 80)}...`);
  console.log(`  Special: ${bot1.specialName}\n`);

  console.log(`Fighter 2: ${bot2.name}`);
  console.log(`  Personality: ${bot2.personality.slice(0, 80)}...`);
  console.log(`  Special: ${bot2.specialName}\n`);

  console.log('Starting match in 3 seconds...\n');
  await sleep(3000);

  // Run the match
  const result = await runMatch(bot1, bot2);

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
  console.log(`\n${match.fighter1.name}:`);
  console.log(`  Final HP: ${match.fighter1.hp}`);
  console.log(`  Moves used: ${countMoves(match, match.fighter1.name)}`);
  console.log(`\n${match.fighter2.name}:`);
  console.log(`  Final HP: ${match.fighter2.hp}`);
  console.log(`  Moves used: ${countMoves(match, match.fighter2.name)}`);
  console.log('═'.repeat(60));
}

function countMoves(match: MatchState, fighterName: string): string {
  const moves: Record<string, number> = {};
  for (const turn of match.turns) {
    const fighter = turn.fighter1.name === fighterName ? turn.fighter1 : turn.fighter2;
    moves[fighter.move] = (moves[fighter.move] || 0) + 1;
  }
  return Object.entries(moves)
    .map(([move, count]) => `${move}(${count})`)
    .join(', ');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
