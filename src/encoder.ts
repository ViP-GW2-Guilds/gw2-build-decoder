/**
 * Encoder for GW2 official build template chat links
 */

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
  const buffer = Buffer.alloc(OFFICIAL_CODE_LENGTH);
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

  // 4. Write skills with aquatic offset
  const skillOffset = options.aquatic ? AQUATIC_OFFSET : 0;
  const skillPos = pos + skillOffset;

  const skillKeys: (keyof Skills)[] = [
    'heal',
    'utility1',
    'utility2',
    'utility3',
    'elite',
  ];

  for (let i = 0; i < SKILL_COUNT; i++) {
    const skillId = buildCode.skills[skillKeys[i]];
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

    // Write uint16 little-endian at the correct position
    buffer.writeUInt16LE(paletteIndex, skillPos + i * BYTES_PER_SKILL);
  }

  // Advance position past skills section
  pos += SKILL_COUNT * BYTES_PER_SKILL;

  // 5. Write profession-specific data (starting at byte 28)
  if (buildCode.professionSpecific) {
    const profSpec = buildCode.professionSpecific;

    if (profSpec.type === 'ranger') {
      // Ranger: 2 pet IDs
      if (options.aquatic) pos += AQUATIC_OFFSET;
      writeByte(profSpec.pets[0]);
      writeByte(profSpec.pets[1]);
    } else if (profSpec.type === 'revenant') {
      // Revenant: 2 legend IDs + 3 inactive utility skills
      if (options.aquatic) pos += AQUATIC_OFFSET;
      writeByte(profSpec.legends[0]);
      writeByte(profSpec.legends[1] ?? 0);

      // Position for inactive skills
      if (options.aquatic) {
        pos += 6;
      } else {
        pos += 2;
      }

      // Write inactive utility skills if present
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

  // 6. Base64 encode
  const base64 = buffer.toString('base64');

  // 7. Wrap in chat link format if requested (default: true)
  return options.wrapInChatLink !== false ? `[&${base64}]` : base64;
}
