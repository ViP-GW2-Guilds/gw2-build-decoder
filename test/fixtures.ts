/**
 * Test fixtures with official GW2 build codes
 */

import type { Profession, TraitChoice } from '../src/types.js';

/**
 * Official build codes from GW2 game client
 * Source: HsBuildCodes/tests/common/codes.ini [Ingame] section
 */
export const OFFICIAL_CODES = {
  /** Full Necromancer build with Spite/Soul Reaping/Reaper specs */
  fullNecro: {
    chatLink:
      '[&DQg1KTIlIjbBEgAAgQB1AUABgQB1AUABlQCVAAAAAAAAAAAAAAAAAAAAAAA=]',
    profession: 8 as Profession, // Necromancer
    specializations: [
      {
        id: 53, // Spite
        traits: [1, 2, 2] as [TraitChoice, TraitChoice, TraitChoice], // Top, Middle, Middle
      },
      {
        id: 50, // Soul Reaping
        traits: [1, 1, 2] as [TraitChoice, TraitChoice, TraitChoice], // Top, Top, Middle
      },
      {
        id: 34, // Reaper
        traits: [2, 1, 3] as [TraitChoice, TraitChoice, TraitChoice], // Middle, Top, Bottom
      },
    ],
  },

  /** Alternative Necromancer build encoding */
  fullNecro2: {
    chatLink:
      '[&DQg1KTIlIjbBEgAAgQAAAEABAAB1AQAAlQAAAAAAAAAAAAAAAAAAAAAAAAA=]',
    profession: 8 as Profession,
    specializations: [
      {
        id: 53,
        traits: [1, 2, 2] as [TraitChoice, TraitChoice, TraitChoice],
      },
      {
        id: 50,
        traits: [1, 1, 2] as [TraitChoice, TraitChoice, TraitChoice],
      },
      {
        id: 34,
        traits: [2, 1, 3] as [TraitChoice, TraitChoice, TraitChoice],
      },
    ],
  },

  /** Partial Revenant build (legend-based palette mapping) */
  partialRevenant: {
    chatLink:
      '[&DQkAAAAARQDcEdwRAAAAACsSAADUEQAAAAAAAAQCAwDUESsSAAAAAAAAAAA=]',
    profession: 9 as Profession, // Revenant
  },

  /** Full Revenant build with two legends */
  revenant: {
    chatLink:
      '[&DQkMKwMZRRncEQAABhIAACsSAADUEQAAyhEAAAcBAAAGEisS1BEAAAAAAAA=]',
    profession: 9 as Profession,
  },

  /** Ranger build with pets */
  rangerPets: {
    chatLink:
      '[&DQQeFSAVNxUAAAAAAAAAAAAAAAAAAAAAAAAAADsRAAAAAAAAAAAAAAAAAAA=]',
    profession: 4 as Profession, // Ranger
    specializations: [
      {
        id: 30, // Skirmishing
        traits: [1, 1, 2] as [TraitChoice, TraitChoice, TraitChoice],
      },
      {
        id: 21, // Nature Magic
        traits: [1, 3, 1] as [TraitChoice, TraitChoice, TraitChoice],
      },
      {
        id: 55, // Soulbeast
        traits: [1, 1, 1] as [TraitChoice, TraitChoice, TraitChoice],
      },
    ],
    professionSpecific: {
      type: 'ranger' as const,
      pets: [59, 17], // Pet IDs
    },
  },

  /** Engineer Mechanist build (no toolbelt skills in official format) */
  amalgam: {
    chatLink:
      '[&DQMGFyY7SwAoAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADNQBXAFUAAA==]',
    profession: 3 as Profession, // Engineer
  },
} as const;

/**
 * Mock palette mapper for deterministic tests
 * Uses simple offset for testing without external data
 * Formula ensures perfect round-trip: skillId = paletteIndex + offset
 */
export class MockPaletteMapper {
  private readonly OFFSET = 10000;

  async paletteToSkill(profession: Profession, paletteIndex: number): Promise<number> {
    // Simple deterministic mapping: add offset to palette index
    if (paletteIndex === 0) return 0;
    return paletteIndex + this.OFFSET;
  }

  async skillToPalette(profession: Profession, skillId: number): Promise<number> {
    // Reverse mapping: subtract offset from skill ID
    if (skillId === 0) return 0;
    return skillId - this.OFFSET;
  }
}
