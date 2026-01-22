/**
 * Decoder for GW2 official build template chat links
 */

import { BinaryView } from './binary-view.js';
import {
  OFFICIAL_CODE_LENGTH,
  OFFICIAL_TYPE_INDICATOR,
  AQUATIC_OFFSET,
  SKILL_COUNT,
  BYTES_PER_SKILL,
} from './constants.js';
import { BuildCodeError, BuildCodeErrorCode } from './errors.js';
import type {
  BuildCode,
  DecodeOptions,
  PaletteMapper,
  Profession,
  Specialization,
  Skills,
  TraitChoice,
  ProfessionSpecificData,
} from './types.js';

/**
 * Decode a GW2 official build template chat link into a BuildCode object
 *
 * @param chatLink - The chat link string (with or without [& and ] wrapping)
 * @param paletteMapper - Implementation for converting palette indices to skill IDs
 * @param options - Decode options (aquatic flag)
 * @returns Promise resolving to the decoded BuildCode
 * @throws {BuildCodeError} If the chat link is invalid or malformed
 *
 * @example
 * ```typescript
 * const build = await decode('[&DQg1KTI...]', myMapper);
 * console.log(build.profession); // Profession.Necromancer
 * ```
 */
export async function decode(
  chatLink: string,
  paletteMapper: PaletteMapper,
  options: DecodeOptions = {},
): Promise<BuildCode> {
  // Strip [& prefix and ] suffix if present
  const base64 = chatLink.startsWith('[&')
    ? chatLink.slice(2, -1)
    : chatLink;

  // Decode base64 to binary buffer
  let buffer: ArrayBuffer;
  try {
    const nodeBuffer = Buffer.from(base64, 'base64');
    buffer = nodeBuffer.buffer.slice(
      nodeBuffer.byteOffset,
      nodeBuffer.byteOffset + nodeBuffer.byteLength,
    );
  } catch (error) {
    throw new BuildCodeError(
      `Failed to decode base64: ${error}`,
      BuildCodeErrorCode.BASE64_DECODE_FAILED,
      error,
    );
  }

  // Validate buffer length (min 44 bytes for base format, can be longer with weapons/variants)
  if (buffer.byteLength < OFFICIAL_CODE_LENGTH) {
    throw new BuildCodeError(
      `Invalid build code length: ${buffer.byteLength} (minimum ${OFFICIAL_CODE_LENGTH} bytes required)`,
      BuildCodeErrorCode.INVALID_LENGTH,
    );
  }

  const view = new BinaryView(buffer);

  // Validate type indicator
  const typeIndicator = view.readByte();
  if (typeIndicator !== OFFICIAL_TYPE_INDICATOR) {
    throw new BuildCodeError(
      `Invalid type indicator: 0x${typeIndicator.toString(16)} (expected 0x${OFFICIAL_TYPE_INDICATOR.toString(16)})`,
      BuildCodeErrorCode.INVALID_TYPE,
    );
  }

  // Read profession
  const profession = view.readByte() as Profession;
  if (profession < 1 || profession > 9) {
    throw new BuildCodeError(
      `Invalid profession: ${profession} (expected 1-9)`,
      BuildCodeErrorCode.INVALID_PROFESSION,
    );
  }

  // Read 3 specializations (6 bytes total)
  const specializations: Specialization[] = [];
  for (let i = 0; i < 3; i++) {
    const specId = view.readByte();
    const traitMix = view.readByte();

    if (specId !== 0) {
      const traits: [TraitChoice, TraitChoice, TraitChoice] = [
        (traitMix & 0b00000011) as TraitChoice, // Bits 0-1: Adept
        ((traitMix >> 2) & 0b00000011) as TraitChoice, // Bits 2-3: Master
        ((traitMix >> 4) & 0b00000011) as TraitChoice, // Bits 4-5: Grandmaster
      ];
      specializations.push({ id: specId, traits });
    }
  }

  // Calculate offsets for aquatic builds
  const offset = options.aquatic ? AQUATIC_OFFSET : 0;

  // Create a view for profession-specific data (starts at byte 28)
  const profSpecView = view.slice(SKILL_COUNT * BYTES_PER_SKILL);

  // Apply offset for skills section
  view.skip(offset);

  // Handle profession-specific logic
  let skills: Skills;
  let professionSpecific: ProfessionSpecificData | undefined;

  if (profession === 9) {
    // Revenant requires special handling
    const result = await decodeRevenant(
      view,
      profSpecView,
      paletteMapper,
      offset,
    );
    skills = result.skills;
    professionSpecific = result.professionSpecific;
  } else {
    // Standard skill decoding for all other professions
    skills = await decodeSkills(view, profession, paletteMapper);

    // Read profession-specific data
    if (profession === 4) {
      // Ranger: 2 pet IDs
      professionSpecific = decodeRangerData(profSpecView, offset);
    }
  }

  // Parse extended data (weapons and skill variants) if present (post-June 2023 format)
  let weapons: number[] | undefined;
  let skillVariants: number[] | undefined;

  if (buffer.byteLength > OFFICIAL_CODE_LENGTH) {
    // Create a view positioned at byte 44 to read extended data
    const extendedView = new BinaryView(buffer, OFFICIAL_CODE_LENGTH);

    // Read weapon array
    const weaponCount = extendedView.readByte();
    if (weaponCount > 0) {
      weapons = [];
      for (let i = 0; i < weaponCount; i++) {
        weapons.push(extendedView.readUInt16LE());
      }
    }

    // Read skill variant array
    const variantCount = extendedView.readByte();
    if (variantCount > 0) {
      skillVariants = [];
      for (let i = 0; i < variantCount; i++) {
        skillVariants.push(extendedView.readUInt32LE());
      }
    }
  }

  return {
    profession,
    specializations,
    skills,
    professionSpecific,
    weapons,
    skillVariants,
  };
}

/**
 * Decode skills using standard palette mapping
 *
 * GW2 build codes store 10 skill slots (5 terrestrial + 5 aquatic) in bytes 8-27.
 * Each slot is 2 bytes (uint16 little-endian palette index).
 * Order: heal, aquaticHeal, util1, util2, util3, aquaticUtil1, aquaticUtil2, aquaticUtil3, elite, aquaticElite
 */
async function decodeSkills(
  view: BinaryView,
  profession: Profession,
  paletteMapper: PaletteMapper,
): Promise<Skills> {
  const skills: Skills = {
    // Terrestrial
    heal: 0,
    utility1: 0,
    utility2: 0,
    utility3: 0,
    elite: 0,
    // Aquatic
    aquaticHeal: 0,
    aquaticUtility1: 0,
    aquaticUtility2: 0,
    aquaticUtility3: 0,
    aquaticElite: 0,
  };

  const skillKeys: (keyof Skills)[] = [
    'heal',
    'aquaticHeal',
    'utility1',
    'utility2',
    'utility3',
    'aquaticUtility1',
    'aquaticUtility2',
    'aquaticUtility3',
    'elite',
    'aquaticElite',
  ];

  for (const key of skillKeys) {
    const paletteIndex = view.readUInt16LE(); // 2 bytes per skill slot

    if (paletteIndex !== 0) {
      try {
        skills[key] = await paletteMapper.paletteToSkill(profession, paletteIndex);
      } catch (error) {
        throw new BuildCodeError(
          `Failed to map palette index ${paletteIndex} for profession ${profession}`,
          BuildCodeErrorCode.PALETTE_LOOKUP_FAILED,
          error,
        );
      }
    }
  }

  return skills;
}

/**
 * Decode Revenant build with legend-based palette mapping
 */
async function decodeRevenant(
  view: BinaryView,
  profSpecView: BinaryView,
  paletteMapper: PaletteMapper,
  offset: number,
): Promise<{ skills: Skills; professionSpecific: ProfessionSpecificData }> {
  profSpecView.skip(offset);

  const legend1Byte = profSpecView.peekByte(0);
  const legend2Byte = profSpecView.peekByte(1);

  let skills: Skills;
  let legend1: number;
  let legend2: number | undefined;
  let inactiveSkills: [number, number, number] | undefined;

  if (legend1Byte !== 0) {
    // First legend is set - decode skills with legend-based palette
    legend1 = legend1Byte;

    skills = {
      // Terrestrial
      heal: 0,
      utility1: 0,
      utility2: 0,
      utility3: 0,
      elite: 0,
      // Aquatic
      aquaticHeal: 0,
      aquaticUtility1: 0,
      aquaticUtility2: 0,
      aquaticUtility3: 0,
      aquaticElite: 0,
    };

    const skillKeys: (keyof Skills)[] = [
      'heal',
      'aquaticHeal',
      'utility1',
      'utility2',
      'utility3',
      'aquaticUtility1',
      'aquaticUtility2',
      'aquaticUtility3',
      'elite',
      'aquaticElite',
    ];

    for (const key of skillKeys) {
      const paletteIndex = view.readUInt16LE(); // 2 bytes per skill slot

      if (paletteIndex !== 0) {
        try {
          // For Revenant, palette mapping is legend-specific
          // The PaletteMapper implementation must handle this
          skills[key] = await paletteMapper.paletteToSkill(9, paletteIndex);
        } catch (error) {
          throw new BuildCodeError(
            `Failed to map Revenant palette index ${paletteIndex}`,
            BuildCodeErrorCode.PALETTE_LOOKUP_FAILED,
            error,
          );
        }
      }
    }
  } else {
    // No legend set - use standard palette mapping
    skills = await decodeSkills(view, 9, paletteMapper);
    legend1 = 0;
  }

  // Check for second legend
  if (legend2Byte !== 0) {
    legend2 = legend2Byte;

    // Read inactive utility skills for second legend
    // Need to skip: offset + 2 legend bytes + gap (2 or 6 bytes)
    const revSkillOffset = offset ? 6 : 2;
    const altSkillView = profSpecView.slice(offset + 2 + revSkillOffset);

    const altSkills: [number, number, number] = [
      await paletteMapper.paletteToSkill(9, altSkillView.readUInt16LE()),
      await paletteMapper.paletteToSkill(9, altSkillView.readUInt16LE()),
      await paletteMapper.paletteToSkill(9, altSkillView.readUInt16LE()),
    ];

    // Check if we need to flip legends (if legend1 was empty but legend2 is set)
    if (legend1Byte === 0) {
      // Flip: make legend2 the active legend
      legend1 = legend2;
      legend2 = undefined;
      inactiveSkills = [skills.utility1, skills.utility2, skills.utility3];
      // Update active skills with alt skills
      if (altSkills[0] !== 0) skills.utility1 = altSkills[0];
      if (altSkills[1] !== 0) skills.utility2 = altSkills[1];
      if (altSkills[2] !== 0) skills.utility3 = altSkills[2];
    } else {
      // Normal case: both legends set
      if (altSkills[0] !== 0 || altSkills[1] !== 0 || altSkills[2] !== 0) {
        inactiveSkills = altSkills;
      }
    }
  }

  const professionSpecific: ProfessionSpecificData = {
    type: 'revenant',
    legends: legend2 !== undefined ? [legend1, legend2] : [legend1],
    inactiveSkills,
  };

  return { skills, professionSpecific };
}

/**
 * Decode Ranger-specific data (pets)
 */
function decodeRangerData(
  view: BinaryView,
  offset: number,
): ProfessionSpecificData | undefined {
  view.skip(offset);

  const pet1 = view.peekByte(0);
  const pet2 = view.peekByte(1);

  if (pet1 === 0 && pet2 === 0) {
    return undefined;
  }

  return {
    type: 'ranger',
    pets: [pet1, pet2],
  };
}
