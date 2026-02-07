/**
 * Encoder for GW2 official build template chat links
 */

import {
  OFFICIAL_CODE_LENGTH,
  OFFICIAL_TYPE_INDICATOR,
} from './constants.js';
import { BuildCodeError, BuildCodeErrorCode } from './errors.js';
import type {
  BuildCode,
  EncodeOptions,
  PaletteMapper,
  Skills,
} from './types.js';

/**
 * Encode a BuildCode object into a GW2 official build template chat link
 *
 * @param buildCode - The build configuration to encode
 * @param paletteMapper - Implementation for converting skill IDs to palette indices
 * @param options - Encode options (aquatic flag, chat link wrapping)
 * @returns Promise resolving to the encoded chat link string
 * @throws {BuildCodeError} If encoding fails
 *
 * @example
 * ```typescript
 * const chatLink = await encode(build, myMapper);
 * console.log(chatLink); // [&DQg1KTI...]
 * ```
 */
export async function encode(
  buildCode: BuildCode,
  paletteMapper: PaletteMapper,
  options: EncodeOptions = {},
): Promise<string> {
  // Calculate total buffer size (base 44 bytes + extended data)
  let totalSize = OFFICIAL_CODE_LENGTH;
  const hasExtendedData =
    (buildCode.weapons && buildCode.weapons.length > 0) ||
    (buildCode.skillVariants && buildCode.skillVariants.length > 0);

  if (hasExtendedData) {
    // Weapon count byte + weapons
    totalSize += 1; // weapon count byte
    if (buildCode.weapons && buildCode.weapons.length > 0) {
      totalSize += buildCode.weapons.length * 2;
    }

    // Skill variant count byte + variants
    totalSize += 1; // skill variant count byte
    if (buildCode.skillVariants && buildCode.skillVariants.length > 0) {
      totalSize += buildCode.skillVariants.length * 4;
    }
  }

  const buffer = Buffer.alloc(totalSize);
  let pos = 0;

  // Helper to write a single byte
  const writeByte = (value: number) => {
    buffer[pos++] = value;
  };

  // 1. Write type indicator
  writeByte(OFFICIAL_TYPE_INDICATOR);

  // 2. Write profession
  writeByte(buildCode.profession);

  // 3. Write specializations (pad to 3)
  for (let i = 0; i < 3; i++) {
    const spec = buildCode.specializations[i];
    if (spec) {
      writeByte(spec.id);
      // Pack trait choices into a single byte
      const traitMix =
        spec.traits[0] | (spec.traits[1] << 2) | (spec.traits[2] << 4);
      writeByte(traitMix);
    } else {
      writeByte(0);
      writeByte(0);
    }
  }

  // 4. Write all 10 skill slots (5 terrestrial + 5 aquatic)
  // GW2 pairs each terrestrial skill with its aquatic counterpart
  // Format: heal, aquaticHeal, util1, aquaticUtil1, util2, aquaticUtil2, util3, aquaticUtil3, elite, aquaticElite
  // Each skill is 2 bytes (uint16 palette index)
  const skillKeys: (keyof Skills)[] = [
    'heal',
    'aquaticHeal',
    'utility1',
    'aquaticUtility1',
    'utility2',
    'aquaticUtility2',
    'utility3',
    'aquaticUtility3',
    'elite',
    'aquaticElite',
  ];

  for (const key of skillKeys) {
    const skillId = (buildCode.skills[key] ?? 0) as number; // Support old BuildCode without aquatic fields
    let paletteIndex = 0;

    if (skillId !== 0) {
      try {
        paletteIndex = await paletteMapper.skillToPalette(
          buildCode.profession,
          skillId,
        );
      } catch (error) {
        throw new BuildCodeError(
          `Failed to map skill ID ${skillId} to palette index for profession ${buildCode.profession}`,
          BuildCodeErrorCode.PALETTE_LOOKUP_FAILED,
          error,
        );
      }
    }

    buffer.writeUInt16LE(paletteIndex, pos);
    pos += 2;
  }

  // Note: options.aquatic is now deprecated - all 10 slots are always written

  // 5. Write profession-specific data (starting at byte 28)
  // Position should now be at byte 28 after writing all 10 skill slots
  if (buildCode.professionSpecific) {
    const profSpec = buildCode.professionSpecific;

    if (profSpec.type === 'ranger') {
      // Ranger: 2 pet IDs at bytes 28-29
      writeByte(profSpec.pets[0]);
      writeByte(profSpec.pets[1]);
    } else if (profSpec.type === 'revenant') {
      // Revenant: 2 legend IDs at bytes 28-29, then inactive skills at bytes 32-37
      writeByte(profSpec.legends[0]);
      writeByte(profSpec.legends[1] ?? 0);

      // Skip 2 bytes gap (bytes 30-31)
      pos += 2;

      // Write inactive utility skills if present (bytes 32-37)
      if (profSpec.inactiveSkills) {
        for (let i = 0; i < 3; i++) {
          const skillId = profSpec.inactiveSkills[i];
          let paletteIndex = 0;

          if (skillId !== 0) {
            try {
              paletteIndex = await paletteMapper.skillToPalette(9, skillId);
            } catch (error) {
              throw new BuildCodeError(
                `Failed to map Revenant inactive skill ID ${skillId} to palette index`,
                BuildCodeErrorCode.PALETTE_LOOKUP_FAILED,
                error,
              );
            }
          }

          buffer.writeUInt16LE(paletteIndex, pos);
          pos += 2;
        }
      }
    }
    // Engineer toolbelt skills are NOT part of official 44-byte format
  }

  // 6. Write extended data (weapons and skill variants) if present
  // Position should be at byte 44 after base format
  pos = OFFICIAL_CODE_LENGTH;

  if (hasExtendedData) {
    // Write weapon count (always write the count byte if we have extended data)
    const weaponCount = buildCode.weapons?.length ?? 0;
    buffer[pos++] = weaponCount;

    // Write weapon IDs if any
    if (buildCode.weapons && buildCode.weapons.length > 0) {
      for (const weaponId of buildCode.weapons) {
        buffer.writeUInt16LE(weaponId, pos);
        pos += 2;
      }
    }

    // Write skill variant count (always write the count byte if we have extended data)
    const variantCount = buildCode.skillVariants?.length ?? 0;
    buffer[pos++] = variantCount;

    // Write skill variant IDs if any
    if (buildCode.skillVariants && buildCode.skillVariants.length > 0) {
      for (const skillId of buildCode.skillVariants) {
        buffer.writeUInt32LE(skillId, pos);
        pos += 4;
      }
    }
  }

  // 7. Base64 encode (only the bytes we actually used)
  const actualBuffer = buffer.slice(0, totalSize);
  const base64 = actualBuffer.toString('base64');

  // 8. Wrap in chat link format if requested (default: true)
  return options.wrapInChatLink !== false ? `[&${base64}]` : base64;
}
