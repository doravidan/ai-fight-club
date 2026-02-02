// Combat logic for AI Fight Club

import type { Fighter, MoveType, MoveResult, TurnResult, BotConfig } from './types.js';

// Create a new fighter from config
export function createFighter(id: string, config: BotConfig): Fighter {
  return {
    id,
    name: config.name,
    personality: config.personality,
    hp: 100,
    maxHp: 100,
    energy: 100,
    maxEnergy: 100,
    attack: config.stats?.attack ?? 15,
    defense: config.stats?.defense ?? 10,
    defenseModifier: 0,
    specialName: config.specialName,
    specialDescription: config.specialDescription,
  };
}

// Calculate damage with defense
function calculateDamage(baseDamage: number, defense: number, defenseModifier: number): number {
  const totalDefense = defense + defenseModifier;
  const reduction = totalDefense / (totalDefense + 20); // Diminishing returns
  const damage = Math.max(1, Math.floor(baseDamage * (1 - reduction)));
  return damage;
}

// Execute a single move
export function executeMove(
  attacker: Fighter,
  defender: Fighter,
  attackerMove: MoveType,
  defenderMove: MoveType
): MoveResult {
  let damage = 0;
  let healing = 0;
  let energyUsed = 0;
  let blocked = false;
  let countered = false;
  let description = '';

  // Check if attacker has enough energy
  const energyCosts: Record<MoveType, number> = {
    ATTACK: 0,
    HEAVY_ATTACK: 20,
    DEFEND: 0,
    COUNTER: 30,
    HEAL: 40,
    SPECIAL: 50,
  };

  const cost = energyCosts[attackerMove];
  if (attacker.energy < cost) {
    // Not enough energy, default to basic attack
    attackerMove = 'ATTACK';
    description = `${attacker.name} doesn't have enough energy! Falls back to basic attack. `;
  }

  energyUsed = energyCosts[attackerMove];

  switch (attackerMove) {
    case 'ATTACK':
      damage = calculateDamage(attacker.attack, defender.defense, defender.defenseModifier);
      description += `${attacker.name} attacks for ${damage} damage!`;
      break;

    case 'HEAVY_ATTACK':
      const heavyDamage = Math.floor(attacker.attack * 1.5);
      damage = calculateDamage(heavyDamage, defender.defense, defender.defenseModifier);
      attacker.defenseModifier = -5; // Vulnerable next turn
      description += `${attacker.name} unleashes a HEAVY ATTACK for ${damage} damage! (Left vulnerable)`;
      break;

    case 'DEFEND':
      attacker.defenseModifier = Math.floor(attacker.defense * 0.5);
      description += `${attacker.name} takes a defensive stance! (+${attacker.defenseModifier} defense)`;
      break;

    case 'COUNTER':
      // Counter only works if opponent attacks
      if (['ATTACK', 'HEAVY_ATTACK', 'SPECIAL'].includes(defenderMove)) {
        damage = calculateDamage(attacker.attack * 2, defender.defense, defender.defenseModifier);
        countered = true;
        description += `${attacker.name} COUNTERS for ${damage} damage!`;
      } else {
        description += `${attacker.name} attempts to counter but ${defender.name} didn't attack!`;
      }
      break;

    case 'HEAL':
      healing = 20;
      description += `${attacker.name} heals for ${healing} HP!`;
      break;

    case 'SPECIAL':
      damage = calculateDamage(attacker.attack * 2, defender.defense, defender.defenseModifier);
      description += `${attacker.name} uses ${attacker.specialName}! ${damage} damage!`;
      break;
  }

  // Check if defender is defending
  if (defenderMove === 'DEFEND' && damage > 0) {
    damage = Math.floor(damage * 0.5);
    blocked = true;
    description += ` (Blocked! Reduced to ${damage})`;
  }

  // Check if defender countered an attack
  if (defenderMove === 'COUNTER' && ['ATTACK', 'HEAVY_ATTACK', 'SPECIAL'].includes(attackerMove)) {
    countered = true;
  }

  return {
    damage,
    healing,
    energyUsed,
    blocked,
    countered,
    description,
  };
}

// Process a full turn (both fighters move)
export function processTurn(
  fighter1: Fighter,
  fighter2: Fighter,
  move1: MoveType,
  move2: MoveType,
  thinking1: string,
  thinking2: string,
  trash1: string,
  trash2: string,
  turnNumber: number
): TurnResult {
  // Store HP/Energy before
  const f1HpBefore = fighter1.hp;
  const f2HpBefore = fighter2.hp;
  const f1EnergyBefore = fighter1.energy;
  const f2EnergyBefore = fighter2.energy;

  // Reset defense modifiers from previous turn
  fighter1.defenseModifier = 0;
  fighter2.defenseModifier = 0;

  // Execute moves
  const result1 = executeMove(fighter1, fighter2, move1, move2);
  const result2 = executeMove(fighter2, fighter1, move2, move1);

  // Apply damage and healing
  fighter2.hp = Math.max(0, fighter2.hp - result1.damage);
  fighter1.hp = Math.max(0, fighter1.hp - result2.damage);
  
  fighter1.hp = Math.min(fighter1.maxHp, fighter1.hp + result1.healing);
  fighter2.hp = Math.min(fighter2.maxHp, fighter2.hp + result2.healing);

  // Deduct energy
  fighter1.energy = Math.max(0, fighter1.energy - result1.energyUsed);
  fighter2.energy = Math.max(0, fighter2.energy - result2.energyUsed);

  // Regenerate some energy
  fighter1.energy = Math.min(fighter1.maxEnergy, fighter1.energy + 10);
  fighter2.energy = Math.min(fighter2.maxEnergy, fighter2.energy + 10);

  return {
    turn: turnNumber,
    fighter1: {
      name: fighter1.name,
      move: move1,
      thinking: thinking1,
      trashTalk: trash1,
      result: result1,
      hpBefore: f1HpBefore,
      hpAfter: fighter1.hp,
      energyBefore: f1EnergyBefore,
      energyAfter: fighter1.energy,
    },
    fighter2: {
      name: fighter2.name,
      move: move2,
      thinking: thinking2,
      trashTalk: trash2,
      result: result2,
      hpBefore: f2HpBefore,
      hpAfter: fighter2.hp,
      energyBefore: f2EnergyBefore,
      energyAfter: fighter2.energy,
    },
  };
}

// Check if match is over
export function checkWinner(fighter1: Fighter, fighter2: Fighter): string | null {
  if (fighter1.hp <= 0 && fighter2.hp <= 0) {
    return 'DRAW';
  }
  if (fighter1.hp <= 0) {
    return fighter2.name;
  }
  if (fighter2.hp <= 0) {
    return fighter1.name;
  }
  return null;
}
