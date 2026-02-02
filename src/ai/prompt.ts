// Pokemon-style prompt generation for AI Fight Club v2

import { Player, FighterCard, TurnResult, TurnAction, ElementType } from '../engine/types.js';

const TYPE_EMOJI: Record<ElementType, string> = {
  fire: '🔥',
  water: '💧',
  grass: '🌿',
  electric: '⚡',
  psychic: '🔮',
  fighting: '💪',
  dark: '🌑',
  normal: '⚪',
};

export function generateFighterPrompt(
  player: Player,
  opponent: Player,
  turnHistory: TurnResult[],
  turnNumber: number,
  teamPersonality: string
): string {
  const active = player.active!;
  const oppActive = opponent.active!;
  
  const lastTurns = turnHistory.slice(-3);
  const historyText = lastTurns.length > 0 
    ? lastTurns.map(t => {
        const isP1 = t.player1.name === player.name;
        const you = isP1 ? t.player1 : t.player2;
        const them = isP1 ? t.player2 : t.player1;
        return `Turn ${t.turn}: Your ${you.fighter} did ${you.damage} dmg | Their ${them.fighter} did ${them.damage} dmg`;
      }).join('\n')
    : 'This is the first turn.';

  const attackOptions = active.attacks.map((a, i) => {
    const canUse = player.energy >= a.energyCost;
    return `${i + 1}. ${a.name} (${a.energyCost}⚡) - ${a.damage} damage ${a.effect ? `[${a.effect}]` : ''} ${canUse ? '✅' : '❌ Not enough energy'}`;
  }).join('\n');

  const benchInfo = player.bench.length > 0
    ? player.bench.map((f, i) => `${i}. ${TYPE_EMOJI[f.type]} ${f.name} (${f.hp}/${f.maxHp} HP)`).join('\n')
    : 'No fighters on bench';

  const weaknessWarning = active.weakness === oppActive.type 
    ? `⚠️ WARNING: Your ${active.name} is WEAK to ${oppActive.type}! (+20 damage)`
    : '';
  
  const advantageNote = oppActive.weakness === active.type
    ? `💪 ADVANTAGE: Enemy is WEAK to your ${active.type} type! (+20 damage)`
    : '';

  return `# AI Fight Club - Turn ${turnNumber}

You are the coach of **${player.name}**.

## Team Personality
${teamPersonality}

## Your Active Fighter
${TYPE_EMOJI[active.type]} **${active.name}** (${active.type} type)
- HP: ${active.hp}/${active.maxHp} ${getHpBar(active.hp, active.maxHp)}
- Weakness: ${TYPE_EMOJI[active.weakness]} ${active.weakness}
- "${active.catchphrase}"

## Your Energy: ${player.energy}/5 ⚡

## Available Attacks
${attackOptions}

## Bench (${player.bench.length} fighters)
${benchInfo}
${player.active ? `Retreat cost: ${active.retreatCost}⚡` : ''}

## Opponent's Active Fighter
${TYPE_EMOJI[oppActive.type]} **${oppActive.name}** (${oppActive.type} type)
- HP: ${oppActive.hp}/${oppActive.maxHp} ${getHpBar(oppActive.hp, oppActive.maxHp)}
- Weakness: ${TYPE_EMOJI[oppActive.weakness]} ${oppActive.weakness}

${weaknessWarning}
${advantageNote}

## Score
Your KOs: ${player.knockouts}/3 | Their KOs: ${opponent.knockouts}/3
(First to 3 KOs wins!)

## Recent History
${historyText}

## Your Response
Think strategically (spectators will see this!), trash talk, then choose your action.

You MUST respond in this EXACT format:
THINKING: [Your strategic reasoning in 1-2 sentences - consider type advantages!]
TRASH_TALK: [A taunt in character with your active fighter's personality]
ACTION: [One of: ATTACK_1, ATTACK_2, RETREAT_0, RETREAT_1, PASS]

Note: RETREAT_X means switch to bench fighter at index X (costs ${active.retreatCost}⚡)`;
}

function getHpBar(current: number, max: number): string {
  const percentage = current / max;
  const filled = Math.round(percentage * 10);
  const empty = 10 - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

export function parseResponse(response: string): { thinking: string; trashTalk: string; action: TurnAction } {
  const lines = response.split('\n');
  
  let thinking = '';
  let trashTalk = '';
  let action: TurnAction = { type: 'attack', attackIndex: 0 };

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('THINKING:')) {
      thinking = trimmed.replace('THINKING:', '').trim();
    } else if (trimmed.startsWith('TRASH_TALK:')) {
      trashTalk = trimmed.replace('TRASH_TALK:', '').trim();
    } else if (trimmed.startsWith('ACTION:')) {
      const actionStr = trimmed.replace('ACTION:', '').trim().toUpperCase();
      
      if (actionStr === 'ATTACK_1' || actionStr === 'ATTACK1') {
        action = { type: 'attack', attackIndex: 0 };
      } else if (actionStr === 'ATTACK_2' || actionStr === 'ATTACK2') {
        action = { type: 'attack', attackIndex: 1 };
      } else if (actionStr.startsWith('RETREAT_') || actionStr.startsWith('RETREAT')) {
        const idx = parseInt(actionStr.replace('RETREAT_', '').replace('RETREAT', '')) || 0;
        action = { type: 'retreat', benchIndex: idx };
      } else if (actionStr === 'PASS') {
        action = { type: 'pass' };
      }
    }
  }

  // Fallback if format wasn't followed
  if (!thinking) {
    const attackMatch = response.match(/ATTACK[_]?[12]/i);
    if (attackMatch) {
      const idx = attackMatch[0].includes('2') ? 1 : 0;
      action = { type: 'attack', attackIndex: idx };
    }
    thinking = response.slice(0, 100);
  }

  return { thinking, trashTalk, action };
}
