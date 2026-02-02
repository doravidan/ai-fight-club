// Core types for AI Fight Club

export type MoveType = 'ATTACK' | 'HEAVY_ATTACK' | 'DEFEND' | 'COUNTER' | 'HEAL' | 'SPECIAL';

export interface Fighter {
  id: string;
  name: string;
  personality: string;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  attack: number;
  defense: number;
  defenseModifier: number; // Temporary defense boost
  specialName: string;
  specialDescription: string;
}

export interface Move {
  type: MoveType;
  name: string;
  description: string;
  energyCost: number;
  execute: (attacker: Fighter, defender: Fighter, defenderMove: MoveType) => MoveResult;
}

export interface MoveResult {
  damage: number;
  healing: number;
  energyUsed: number;
  blocked: boolean;
  countered: boolean;
  description: string;
}

export interface TurnResult {
  turn: number;
  fighter1: {
    name: string;
    move: MoveType;
    thinking: string;
    trashTalk: string;
    result: MoveResult;
    hpBefore: number;
    hpAfter: number;
    energyBefore: number;
    energyAfter: number;
  };
  fighter2: {
    name: string;
    move: MoveType;
    thinking: string;
    trashTalk: string;
    result: MoveResult;
    hpBefore: number;
    hpAfter: number;
    energyBefore: number;
    energyAfter: number;
  };
}

export interface MatchState {
  id: string;
  fighter1: Fighter;
  fighter2: Fighter;
  turns: TurnResult[];
  currentTurn: number;
  status: 'pending' | 'fighting' | 'finished';
  winner: string | null;
  startedAt: Date;
  finishedAt: Date | null;
}

export interface BotConfig {
  name: string;
  personality: string;
  specialName: string;
  specialDescription: string;
  stats?: {
    attack?: number;
    defense?: number;
  };
}

export interface LLMResponse {
  thinking: string;
  trashTalk: string;
  move: MoveType;
}
