// LLM client for AI Fight Club v2

import type { Player, TurnResult, TurnAction } from '../engine/types.js';
import { generateFighterPrompt, parseResponse } from './prompt.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export interface LLMDecision {
  thinking: string;
  trashTalk: string;
  action: TurnAction;
  raw: string;
}

export async function getFighterDecision(
  player: Player,
  opponent: Player,
  turnHistory: TurnResult[],
  turnNumber: number,
  teamPersonality: string
): Promise<LLMDecision> {
  const prompt = generateFighterPrompt(player, opponent, turnHistory, turnNumber, teamPersonality);

  if (!OPENAI_API_KEY) {
    console.error('Warning: OPENAI_API_KEY not set, using random moves');
    return fallbackDecision(player);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a Pokemon-style battle coach in AI Fight Club. Make strategic decisions considering type advantages, energy costs, and team composition. Follow the format exactly.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || '';
    const parsed = parseResponse(text);

    return {
      ...parsed,
      raw: text,
    };
  } catch (error) {
    console.error(`Error getting decision for ${player.name}:`, error);
    return fallbackDecision(player);
  }
}

function fallbackDecision(player: Player): LLMDecision {
  const active = player.active;
  if (!active) {
    return {
      thinking: 'No active fighter!',
      trashTalk: '...',
      action: { type: 'attack', attackIndex: 0 },
      raw: 'ERROR',
    };
  }

  // Strategy 1: Switch if HP is critical and we have healthy bench
  const hpPercent = active.hp / active.maxHp;
  if (hpPercent < 0.25 && player.bench.length > 0 && player.energy >= active.retreatCost) {
    // Find healthiest bench fighter
    const healthiestIdx = player.bench.reduce((bestIdx, fighter, idx, arr) => 
      (fighter.hp / fighter.maxHp) > (arr[bestIdx].hp / arr[bestIdx].maxHp) ? idx : bestIdx, 0);
    
    if (player.bench[healthiestIdx].hp / player.bench[healthiestIdx].maxHp > 0.5) {
      return {
        thinking: `${active.name} is hurt! Switching to ${player.bench[healthiestIdx].name}`,
        trashTalk: "Fall back and regroup!",
        action: { type: 'retreat', benchIndex: healthiestIdx },
        raw: 'SMART_SWITCH',
      };
    }
  }

  // Strategy 2: Find attacks we can afford
  const affordableAttacks = active.attacks
    .map((atk, idx) => ({ ...atk, idx }))
    .filter(atk => (atk.energyCost || 0) <= player.energy);

  if (affordableAttacks.length > 0) {
    // Add some randomness: 70% best attack, 30% random affordable
    if (Math.random() < 0.3 && affordableAttacks.length > 1) {
      const randomIdx = Math.floor(Math.random() * affordableAttacks.length);
      const randomAttack = affordableAttacks[randomIdx];
      return {
        thinking: `Mixing it up with ${randomAttack.name}!`,
        trashTalk: getRandomTrashTalk(),
        action: { type: 'attack', attackIndex: randomAttack.idx },
        raw: 'SMART_RANDOM',
      };
    }
    
    // Pick strongest attack
    affordableAttacks.sort((a, b) => (b.damage || 0) - (a.damage || 0));
    const bestAttack = affordableAttacks[0];
    
    return {
      thinking: `Going for ${bestAttack.name} - maximum damage!`,
      trashTalk: getRandomTrashTalk(),
      action: { type: 'attack', attackIndex: bestAttack.idx },
      raw: 'SMART_FALLBACK',
    };
  }

  // No affordable attacks - use cheapest attack
  const cheapestIdx = active.attacks.reduce((minIdx, atk, idx, arr) => 
    (atk.energyCost || 0) < (arr[minIdx].energyCost || 0) ? idx : minIdx, 0);

  return {
    thinking: 'Conserving energy, using basic attack',
    trashTalk: getRandomTrashTalk(),
    action: { type: 'attack', attackIndex: cheapestIdx },
    raw: 'SMART_FALLBACK',
  };
}

function getRandomTrashTalk(): string {
  const lines = [
    "Is that all you got?",
    "Too easy!",
    "You call that an attack?",
    "My turn now!",
    "Prepare to lose!",
    "This ends here!",
    "You're going down!",
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}
