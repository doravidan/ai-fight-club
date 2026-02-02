// Pokemon-style match runner for AI Fight Club v2

import { processTurn, checkWinner } from '../engine/combat.js';
import { getFighterDecision } from '../ai/llm.js';
import type { FighterCard, Player, MatchState, TurnResult } from '../engine/types.js';
import { addTrashTalk, addActivity, checkAndAwardAchievements } from '../store/index.js';

const MAX_TURNS = 30;

export type MatchEventType = 'start' | 'turn' | 'end';

export interface MatchEvent {
  type: MatchEventType;
  data: MatchState | TurnResult;
}

export type MatchEventCallback = (event: MatchEvent) => void;

export interface TeamConfig {
  teamName: string;
  personality: string;
  fighters: FighterCard[];
}

function createPlayer(id: string, team: TeamConfig): Player {
  const fighters = team.fighters.map(f => ({ ...f, hp: f.maxHp }));
  return {
    id,
    name: team.teamName,
    active: fighters[0],
    bench: fighters.slice(1),
    energy: 0,
    knockouts: 0,
  };
}

export async function runMatch(
  team1Config: TeamConfig,
  team2Config: TeamConfig,
  onEvent?: MatchEventCallback
): Promise<MatchState> {
  const matchId = `match_${Date.now()}`;
  
  const player1 = createPlayer('p1', team1Config);
  const player2 = createPlayer('p2', team2Config);

  const matchState: MatchState = {
    id: matchId,
    player1,
    player2,
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
  console.log(`🎴 AI FIGHT CLUB v2 - ${player1.name} vs ${player2.name}`);
  console.log(`${'═'.repeat(60)}\n`);

  // Main fight loop
  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    matchState.currentTurn = turn;
    
    // Check if both have active fighters
    if (!player1.active || !player2.active) {
      break;
    }
    
    console.log(`\n--- TURN ${turn} ---`);
    console.log(`${player1.name}: ${player1.active.name} (${player1.active.hp} HP) | Energy: ${player1.energy}`);
    console.log(`${player2.name}: ${player2.active.name} (${player2.active.hp} HP) | Energy: ${player2.energy}\n`);

    // Get decisions from both players (in parallel)
    const [decision1, decision2] = await Promise.all([
      getFighterDecision(player1, player2, matchState.turns, turn, team1Config.personality),
      getFighterDecision(player2, player1, matchState.turns, turn, team2Config.personality),
    ]);

    console.log(`💭 ${player1.name} thinks: "${decision1.thinking}"`);
    console.log(`🗣️ ${player1.active.name}: "${decision1.trashTalk}"`);
    console.log(`⚔️ Action: ${JSON.stringify(decision1.action)}\n`);

    console.log(`💭 ${player2.name} thinks: "${decision2.thinking}"`);
    console.log(`🗣️ ${player2.active.name}: "${decision2.trashTalk}"`);
    console.log(`⚔️ Action: ${JSON.stringify(decision2.action)}\n`);

    // Save trash talks to store
    if (decision1.trashTalk && decision1.trashTalk.length > 10) {
      try {
        addTrashTalk(matchId, 'p1', player1.active.name, decision1.trashTalk, turn);
      } catch (e) { /* ignore */ }
    }
    if (decision2.trashTalk && decision2.trashTalk.length > 10) {
      try {
        addTrashTalk(matchId, 'p2', player2.active.name, decision2.trashTalk, turn);
      } catch (e) { /* ignore */ }
    }

    // Process the turn
    const { result: turnResult, p1KO, p2KO } = processTurn(
      player1,
      player2,
      decision1.action,
      decision2.action,
      decision1.thinking,
      decision2.thinking,
      decision1.trashTalk,
      decision2.trashTalk,
      turn
    );

    matchState.turns.push(turnResult);

    console.log(`📊 Events:`);
    turnResult.events.forEach(e => console.log(`   ${e}`));

    // Emit turn event
    onEvent?.({ type: 'turn', data: turnResult });

    // Check for winner
    const winner = checkWinner(player1, player2);
    if (winner) {
      matchState.status = 'finished';
      matchState.winner = winner;
      matchState.finishedAt = new Date();

      console.log(`\n${'═'.repeat(60)}`);
      if (winner === 'DRAW') {
        console.log(`🤝 IT'S A DRAW!`);
      } else {
        console.log(`🏆 WINNER: ${winner}!`);
        console.log(`Final Score - ${player1.name}: ${player1.knockouts} KOs | ${player2.name}: ${player2.knockouts} KOs`);
        
        // Add activity event
        try {
          const winnerId = winner === player1.name ? 'p1' : 'p2';
          const loserId = winner === player1.name ? 'p2' : 'p1';
          const winnerName = winner === player1.name ? player1.name : player2.name;
          const loserName = winner === player1.name ? player2.name : player1.name;
          
          addActivity({
            type: 'match_result',
            actorId: winnerId,
            actorName: winnerName,
            targetId: loserId,
            targetName: loserName,
            data: { matchId, won: true, turns: turn },
          });
        } catch (e) { /* ignore */ }
      }
      console.log(`${'═'.repeat(60)}\n`);

      onEvent?.({ type: 'end', data: { ...matchState } });
      return matchState;
    }
  }

  // Max turns reached
  matchState.status = 'finished';
  matchState.finishedAt = new Date();
  
  if (player1.knockouts > player2.knockouts) {
    matchState.winner = player1.name;
  } else if (player2.knockouts > player1.knockouts) {
    matchState.winner = player2.name;
  } else {
    matchState.winner = 'DRAW';
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`⏰ TIME'S UP! Winner by KOs: ${matchState.winner}`);
  console.log(`${'═'.repeat(60)}\n`);

  onEvent?.({ type: 'end', data: { ...matchState } });
  return matchState;
}
