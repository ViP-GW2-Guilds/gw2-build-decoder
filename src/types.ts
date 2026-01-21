/**
 * Guild Wars 2 Build Template Types
 */

/**
 * Represents a complete GW2 build configuration
 */
export interface BuildCode {
  /** Character profession */
  profession: Profession;
  /** Specialization choices (up to 3) */
  specializations: Specialization[];
  /** Equipped skills */
  skills: Skills;
  /** Profession-specific data (pets, legends, toolbelt skills) */
  professionSpecific?: ProfessionSpecificData;
}

/**
 * GW2 Profession enumeration
 */
export enum Profession {
  Guardian = 1,
  Warrior = 2,
  Engineer = 3,
  Ranger = 4,
  Thief = 5,
  Elementalist = 6,
  Mesmer = 7,
  Necromancer = 8,
  Revenant = 9,
}

/**
 * Specialization with trait choices
 */
export interface Specialization {
  /** Specialization ID */
  id: number;
  /** Three trait choices (Adept, Master, Grandmaster) */
  traits: [TraitChoice, TraitChoice, TraitChoice];
}

/**
 * Trait line position choice
 */
export enum TraitChoice {
  None = 0,
  Top = 1,
  Middle = 2,
  Bottom = 3,
}

/**
 * Build skill configuration (5 skills: heal, 3 utilities, elite)
 */
export interface Skills {
  /** Heal skill ID */
  heal: number;
  /** First utility skill ID */
  utility1: number;
  /** Second utility skill ID */
  utility2: number;
  /** Third utility skill ID */
  utility3: number;
  /** Elite skill ID */
  elite: number;
}

/**
 * Profession-specific data union type
 */
export type ProfessionSpecificData =
  | RangerData
  | RevenantData
  | EngineerData;

/**
 * Ranger-specific data (terrestrial pets)
 */
export interface RangerData {
  type: 'ranger';
  /** Two pet IDs */
  pets: [number, number];
}

/**
 * Revenant legend enumeration
 */
export enum Legend {
  /** Legendary Assassin Stance (Shiro) */
  Shiro = 1,
  /** Legendary Dragon Stance (Glint) */
  Glint = 2,
  /** Legendary Demon Stance (Mallyx) */
  Mallyx = 3,
  /** Legendary Dwarf Stance (Jalis) */
  Jalis = 4,
  /** Legendary Centaur Stance (Ventari) */
  Ventari = 5,
  /** Legendary Renegade Stance (Kalla) */
  Kalla = 6,
  /** Legendary Alliance Stance (Archemorus + Saint Viktor) */
  Vindicator = 7,
}

/**
 * Revenant-specific data (legends and inactive skills)
 */
export interface RevenantData {
  type: 'revenant';
  /** Two legend choices */
  legends: [number, number?];
  /** Utility skills for the inactive legend (optional) */
  inactiveSkills?: [number, number, number];
}

/**
 * Engineer-specific data (toolbelt skills for Mechanist)
 */
export interface EngineerData {
  type: 'engineer';
  /** Three toolbelt skill IDs (F2-F4) */
  toolbeltSkills: [number, number, number];
}

/**
 * Interface for skill palette mapping (implemented by external package)
 *
 * Official GW2 build codes store skills as palette indices, not skill IDs.
 * Each profession has a unique mapping between palette indices and skill IDs.
 *
 * This interface must be implemented by a companion package or custom implementation.
 *
 * @see https://api.guildwars2.com/v2/professions for official palette data
 */
export interface PaletteMapper {
  /**
   * Convert a palette index to a skill ID
   * @param profession - The character profession
   * @param paletteIndex - The palette index from the build code
   * @returns Promise resolving to the corresponding skill ID
   */
  paletteToSkill(profession: Profession, paletteIndex: number): Promise<number>;

  /**
   * Convert a skill ID to a palette index
   * @param profession - The character profession
   * @param skillId - The skill ID to encode
   * @returns Promise resolving to the corresponding palette index
   */
  skillToPalette(profession: Profession, skillId: number): Promise<number>;
}

/**
 * Options for decoding a build code
 */
export interface DecodeOptions {
  /** Whether this is an aquatic (underwater) build */
  aquatic?: boolean;
}

/**
 * Options for encoding a build code
 */
export interface EncodeOptions {
  /** Whether this is an aquatic (underwater) build */
  aquatic?: boolean;
  /** Whether to wrap the result in chat link format [&...] (default: true) */
  wrapInChatLink?: boolean;
}
