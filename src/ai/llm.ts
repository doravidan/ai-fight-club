// LLM client for AI Fight Club
// Supports OpenAI GPT-4o

import type { Fighter, TurnResult, MoveType } from '../engine/types.js';
import { generateFighterPrompt, parseResponse } from './prompt.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export interface LLMDecision {
  thinking: string;
  trashTalk: string;
  move: MoveType;
  raw: string;
}

export async function getFighterDecision(
  fighter: Fighter,
  opponent: Fighter,
  turnHistory: TurnResult[],
  turnNumber: number
): Promise<LLMDecision> {
  const prompt = generateFighterPrompt(fighter, opponent, turnHistory, turnNumber);

  if (!OPENAI_API_KEY) {
    console.error('Warning: OPENAI_API_KEY not set, using random moves');
    return fallbackDecision(fighter.name);
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
            content: 'You are a fighter in AI Fight Club. Follow the format exactly.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.9,
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
    console.error(`Error getting decision for ${fighter.name}:`, error);
    return fallbackDecision(fighter.name);
  }
}

function fallbackDecision(name: string): LLMDecision {
  const moves: MoveType[] = ['ATTACK', 'DEFEND', 'HEAVY_ATTACK'];
  const randomMove = moves[Math.floor(Math.random() * moves.length)];
  
  return {
    thinking: 'System error - falling back to instinct!',
    trashTalk: '...',
    move: randomMove,
    raw: 'ERROR',
  };
}
