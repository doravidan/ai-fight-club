// Prompt generation for LLM fighters

import type { Fighter, TurnResult, MoveType } from '../engine/types.js';

export function generateFighterPrompt(
  fighter: Fighter,
  opponent: Fighter,
  turnHistory: TurnResult[],
  turnNumber: number
): string {
  const lastTurns = turnHistory.slice(-3);
  const historyText = lastTurns.length > 0 
    ? lastTurns.map(t => {
        const isF1 = t.fighter1.name === fighter.name;
        const you = isF1 ? t.fighter1 : t.fighter2;
        const them = isF1 ? t.fighter2 : t.fighter1;
        return `Turn ${t.turn}: You used ${you.move} (${you.result.description}) | They used ${them.move} (${them.result.description})`;
      }).join('\n')
    : 'This is the first turn.';

  const opponentLastMove = lastTurns.length > 0
    ? (lastTurns[lastTurns.length - 1].fighter1.name === opponent.name 
        ? lastTurns[lastTurns.length - 1].fighter1.move 
        : lastTurns[lastTurns.length - 1].fighter2.move)
    : 'Unknown';

  return `# AI Fight Club - Turn ${turnNumber}

You are **${fighter.name}**, a fighter in AI Fight Club.

## Your Personality
${fighter.personality}

## Current Stats
- Your HP: ${fighter.hp}/${fighter.maxHp} ${getHpBar(fighter.hp, fighter.maxHp)}
- Your Energy: ${fighter.energy}/${fighter.maxEnergy}

## Opponent: ${opponent.name}
- Their HP: ${opponent.hp}/${opponent.maxHp} ${getHpBar(opponent.hp, opponent.maxHp)}
- Their Last Move: ${opponentLastMove}

## Available Moves
1. **ATTACK** - Deal ~${estimateDamage(fighter.attack, opponent.defense)} damage (Free)
2. **HEAVY_ATTACK** - Deal ~${estimateDamage(Math.floor(fighter.attack * 1.5), opponent.defense)} damage, but leaves you vulnerable (20 energy)
3. **DEFEND** - Block 50% of incoming damage this turn (Free)
4. **COUNTER** - If opponent attacks, deal double damage! (30 energy)
5. **HEAL** - Restore 20 HP (40 energy)
6. **SPECIAL** - "${fighter.specialName}" - ${fighter.specialDescription} (50 energy)

## Recent History
${historyText}

## Your Response
Think about your strategy (spectators will see this!), trash talk your opponent, then choose your move.

You MUST respond in this EXACT format:
THINKING: [Your strategic reasoning in 1-2 sentences]
TRASH_TALK: [A short taunt to your opponent, in character]
MOVE: [One of: ATTACK, HEAVY_ATTACK, DEFEND, COUNTER, HEAL, SPECIAL]

Remember: Stay in character! Your personality is key to entertaining the audience.`;
}

function getHpBar(current: number, max: number): string {
  const percentage = current / max;
  const filled = Math.round(percentage * 10);
  const empty = 10 - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

function estimateDamage(attack: number, defense: number): number {
  const reduction = defense / (defense + 20);
  return Math.floor(attack * (1 - reduction));
}

export function parseResponse(response: string): { thinking: string; trashTalk: string; move: MoveType } {
  const lines = response.split('\n');
  
  let thinking = '';
  let trashTalk = '';
  let move: MoveType = 'ATTACK';

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('THINKING:')) {
      thinking = trimmed.replace('THINKING:', '').trim();
    } else if (trimmed.startsWith('TRASH_TALK:')) {
      trashTalk = trimmed.replace('TRASH_TALK:', '').trim();
    } else if (trimmed.startsWith('MOVE:')) {
      const moveStr = trimmed.replace('MOVE:', '').trim().toUpperCase();
      if (isValidMove(moveStr)) {
        move = moveStr as MoveType;
      }
    }
  }

  // Fallback parsing if format wasn't followed exactly
  if (!thinking && !trashTalk) {
    // Try to extract any move mentioned
    const moveMatch = response.match(/\b(ATTACK|HEAVY_ATTACK|DEFEND|COUNTER|HEAL|SPECIAL)\b/i);
    if (moveMatch) {
      move = moveMatch[1].toUpperCase() as MoveType;
    }
    thinking = response.slice(0, 100);
  }

  return { thinking, trashTalk, move };
}

function isValidMove(move: string): move is MoveType {
  return ['ATTACK', 'HEAVY_ATTACK', 'DEFEND', 'COUNTER', 'HEAL', 'SPECIAL'].includes(move);
}
