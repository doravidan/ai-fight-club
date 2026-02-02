// Pokemon-style types for AI Fight Club v2

export type ElementType = 'fire' | 'water' | 'grass' | 'electric' | 'psychic' | 'fighting' | 'dark' | 'normal';

export interface Attack {
  name: string;
  energyCost: number;
  damage: number;
  effect?: 'burn' | 'paralyze' | 'heal' | 'energyBoost' | 'shield';
  effectValue?: number;
  description: string;
}

export interface FighterCard {
  id: string;
  name: string;
  type: ElementType;
  maxHp: number;
  hp: number;
  attacks: Attack[];
  weakness: ElementType;
  retreatCost: number;
  personality: string;
  catchphrase: string;
}

export interface Player {
  id: string;
  name: string;
  active: FighterCard | null;
  bench: FighterCard[];
  energy: number;
  knockouts: number; // Track KOs for win condition
}

export interface TurnAction {
  type: 'attack' | 'retreat' | 'pass';
  attackIndex?: number;
  benchIndex?: number;
}

export interface TurnResult {
  turn: number;
  player1: {
    name: string;
    fighter: string;
    action: TurnAction;
    thinking: string;
    trashTalk: string;
    damage: number;
    effectTriggered?: string;
  };
  player2: {
    name: string;
    fighter: string;
    action: TurnAction;
    thinking: string;
    trashTalk: string;
    damage: number;
    effectTriggered?: string;
  };
  events: string[];
}

export interface MatchState {
  id: string;
  player1: Player;
  player2: Player;
  turns: TurnResult[];
  currentTurn: number;
  status: 'pending' | 'fighting' | 'finished';
  winner: string | null;
  startedAt: Date;
  finishedAt: Date | null;
}

export interface LLMResponse {
  thinking: string;
  trashTalk: string;
  action: TurnAction;
}

// Type advantage chart: attacker type -> defender weakness = +20 damage
export const TYPE_CHART: Record<ElementType, ElementType> = {
  fire: 'grass',      // Fire is strong against Grass
  water: 'fire',      // Water is strong against Fire
  grass: 'water',     // Grass is strong against Water
  electric: 'water',  // Electric is strong against Water
  psychic: 'fighting', // Psychic is strong against Fighting
  fighting: 'dark',   // Fighting is strong against Dark
  dark: 'psychic',    // Dark is strong against Psychic
  normal: 'normal',   // Normal has no advantage
};

export const WEAKNESS_BONUS = 20;
