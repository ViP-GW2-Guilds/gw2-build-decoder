/**
 * Constants for GW2 build code encoding/decoding
 */

/** Official build code type indicator (first byte) */
export const OFFICIAL_TYPE_INDICATOR = 0x0d;

/** Total byte length of official build codes */
export const OFFICIAL_CODE_LENGTH = 44;

/** Offset applied for aquatic (underwater) builds */
export const AQUATIC_OFFSET = 2;

/** Number of specialization slots */
export const SPECIALIZATION_COUNT = 3;

/** Number of skill slots (heal + 3 utilities + elite) */
export const SKILL_COUNT = 5;

/** Bytes per skill entry (uint16 palette index + 2 padding) */
export const BYTES_PER_SKILL = 4;

/** Mechanist elite specialization ID */
export const MECHANIST_SPEC_ID = 70;

/**
 * Profession names for display
 */
export const PROFESSION_NAMES: Record<number, string> = {
  1: 'Guardian',
  2: 'Warrior',
  3: 'Engineer',
  4: 'Ranger',
  5: 'Thief',
  6: 'Elementalist',
  7: 'Mesmer',
  8: 'Necromancer',
  9: 'Revenant',
};

/**
 * Legend names for display
 */
export const LEGEND_NAMES: Record<number, string> = {
  1: 'Legendary Assassin Stance (Shiro)',
  2: 'Legendary Dragon Stance (Glint)',
  3: 'Legendary Demon Stance (Mallyx)',
  4: 'Legendary Dwarf Stance (Jalis)',
  5: 'Legendary Centaur Stance (Ventari)',
  6: 'Legendary Renegade Stance (Kalla)',
  7: 'Legendary Alliance Stance (Vindicator)',
};
