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
  // Default to first attack if enough energy, otherwise pass
  const attackIndex = player.energy >= (player.active?.attacks[0]?.energyCost || 1) ? 0 : 0;
  
  return {
    thinking: 'System error - falling back to instinct!',
    trashTalk: '...',
    action: { type: 'attack', attackIndex },
    raw: 'ERROR',
  };
}
