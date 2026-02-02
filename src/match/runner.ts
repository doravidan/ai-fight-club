// Match runner - orchestrates a full fight

import { createFighter, processTurn, checkWinner } from '../engine/combat.js';
import { getFighterDecision } from '../ai/llm.js';
import type { BotConfig, MatchState, TurnResult } from '../engine/types.js';

const MAX_TURNS = 20;

export type MatchEventType = 'start' | 'turn' | 'end';

export interface MatchEvent {
  type: MatchEventType;
  data: MatchState | TurnResult;
}

export type MatchEventCallback = (event: MatchEvent) => void;

export async function runMatch(
  bot1Config: BotConfig,
  bot2Config: BotConfig,
  onEvent?: MatchEventCallback
): Promise<MatchState> {
  const matchId = `match_${Date.now()}`;
  
  const fighter1 = createFighter('f1', bot1Config);
  const fighter2 = createFighter('f2', bot2Config);

  const matchState: MatchState = {
    id: matchId,
    fighter1,
    fighter2,
    turns: [],
    currentTurn: 0,
    status: 'pending',
    winner: null,
    startedAt: new Date(),
    finishedAt: null,
  };

  // Emit start event
  matchState.status = 'fighting';
  onEvent?.({ type: 'start', data: { ...matchState } });

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🥊 AI FIGHT CLUB - ${fighter1.name} vs ${fighter2.name}`);
  console.log(`${'═'.repeat(60)}\n`);

  // Main fight loop
  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    matchState.currentTurn = turn;
    
    console.log(`\n--- TURN ${turn} ---`);
    console.log(`${fighter1.name}: ${fighter1.hp} HP | ${fighter2.name}: ${fighter2.hp} HP\n`);

    // Get decisions from both fighters (in parallel)
    const [decision1, decision2] = await Promise.all([
      getFighterDecision(fighter1, fighter2, matchState.turns, turn),
      getFighterDecision(fighter2, fighter1, matchState.turns, turn),
    ]);

    console.log(`💭 ${fighter1.name} thinks: "${decision1.thinking}"`);
    console.log(`🗣️ ${fighter1.name}: "${decision1.trashTalk}"`);
    console.log(`⚔️ ${fighter1.name} chooses: ${decision1.move}\n`);

    console.log(`💭 ${fighter2.name} thinks: "${decision2.thinking}"`);
    console.log(`🗣️ ${fighter2.name}: "${decision2.trashTalk}"`);
    console.log(`⚔️ ${fighter2.name} chooses: ${decision2.move}\n`);

    // Process the turn
    const turnResult = processTurn(
      fighter1,
      fighter2,
      decision1.move,
      decision2.move,
      decision1.thinking,
      decision2.thinking,
      decision1.trashTalk,
      decision2.trashTalk,
      turn
    );

    matchState.turns.push(turnResult);

    console.log(`📊 Results:`);
    console.log(`   ${turnResult.fighter1.result.description}`);
    console.log(`   ${turnResult.fighter2.result.description}`);
    console.log(`   ${fighter1.name}: ${fighter1.hp} HP | ${fighter2.name}: ${fighter2.hp} HP`);

    // Emit turn event
    onEvent?.({ type: 'turn', data: turnResult });

    // Check for winner
    const winner = checkWinner(fighter1, fighter2);
    if (winner) {
      matchState.status = 'finished';
      matchState.winner = winner;
      matchState.finishedAt = new Date();

      console.log(`\n${'═'.repeat(60)}`);
      if (winner === 'DRAW') {
        console.log(`🤝 IT'S A DRAW!`);
      } else {
        console.log(`🏆 WINNER: ${winner}!`);
      }
      console.log(`${'═'.repeat(60)}\n`);

      onEvent?.({ type: 'end', data: { ...matchState } });
      return matchState;
    }
  }

  // Max turns reached - winner by HP
  matchState.status = 'finished';
  matchState.finishedAt = new Date();
  
  if (fighter1.hp > fighter2.hp) {
    matchState.winner = fighter1.name;
  } else if (fighter2.hp > fighter1.hp) {
    matchState.winner = fighter2.name;
  } else {
    matchState.winner = 'DRAW';
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⏰ TIME'S UP! Winner by HP: ${matchState.winner}`);
  console.log(`${'═'.repeat(60)}\n`);

  onEvent?.({ type: 'end', data: { ...matchState } });
  return matchState;
}
