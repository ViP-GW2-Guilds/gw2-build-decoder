/**
 * Unit tests for decoder
 */

import { describe, it, expect } from 'vitest';
import { decode } from '../src/decoder.js';
import { BuildCodeError, BuildCodeErrorCode } from '../src/errors.js';
import { Profession } from '../src/types.js';
import { OFFICIAL_CODES, MockPaletteMapper } from './fixtures.js';

const mockMapper = new MockPaletteMapper();

describe('decode', () => {
  it('should decode a full Necromancer build', async () => {
    const build = await decode(OFFICIAL_CODES.fullNecro.chatLink, mockMapper);

    expect(build.profession).toBe(Profession.Necromancer);
    expect(build.specializations).toHaveLength(3);

    // Spite specialization
    expect(build.specializations[0].id).toBe(53);
    expect(build.specializations[0].traits).toEqual([1, 2, 2]);

    // Soul Reaping specialization
    expect(build.specializations[1].id).toBe(50);
    expect(build.specializations[1].traits).toEqual([1, 1, 2]);

    // Reaper specialization
    expect(build.specializations[2].id).toBe(34);
    expect(build.specializations[2].traits).toEqual([2, 1, 3]);

    // Skills should be decoded (non-zero)
    expect(build.skills.heal).toBeGreaterThan(0);
    expect(build.skills.utility1).toBeGreaterThan(0);
    expect(build.skills.utility2).toBeGreaterThan(0);
    expect(build.skills.utility3).toBeGreaterThan(0);
    expect(build.skills.elite).toBeGreaterThan(0);
  });

  it('should decode a Ranger build with pets', async () => {
    const build = await decode(OFFICIAL_CODES.rangerPets.chatLink, mockMapper);

    expect(build.profession).toBe(Profession.Ranger);
    expect(build.specializations).toHaveLength(3);

    // Check profession-specific data
    expect(build.professionSpecific).toBeDefined();
    expect(build.professionSpecific?.type).toBe('ranger');

    if (build.professionSpecific?.type === 'ranger') {
      expect(build.professionSpecific.pets).toEqual([59, 17]);
    }
  });

  it('should decode a Revenant build', async () => {
    const build = await decode(OFFICIAL_CODES.revenant.chatLink, mockMapper);

    expect(build.profession).toBe(Profession.Revenant);
    expect(build.professionSpecific).toBeDefined();
    expect(build.professionSpecific?.type).toBe('revenant');
  });

  it('should accept chat links with or without [& wrapper', async () => {
    const fullLink = OFFICIAL_CODES.fullNecro.chatLink;
    const base64Only = fullLink.slice(2, -1);

    const build1 = await decode(fullLink, mockMapper);
    const build2 = await decode(base64Only, mockMapper);

    expect(build1).toEqual(build2);
  });

  it('should throw error for invalid length', async () => {
    const invalidLink = '[&DQg1KTI=]'; // Too short

    await expect(decode(invalidLink, mockMapper)).rejects.toThrow(
      BuildCodeError,
    );
    await expect(decode(invalidLink, mockMapper)).rejects.toMatchObject({
      code: BuildCodeErrorCode.INVALID_LENGTH,
    });
  });

  it('should throw error for invalid type indicator', async () => {
    // Create a buffer with wrong type indicator
    const buffer = Buffer.alloc(44);
    buffer[0] = 0xff; // Wrong type (should be 0x0D)
    buffer[1] = 8; // Necromancer
    const base64 = buffer.toString('base64');
    const chatLink = `[&${base64}]`;

    await expect(decode(chatLink, mockMapper)).rejects.toThrow(
      BuildCodeError,
    );
    await expect(decode(chatLink, mockMapper)).rejects.toMatchObject({
      code: BuildCodeErrorCode.INVALID_TYPE,
    });
  });

  it('should throw error for invalid profession', async () => {
    const buffer = Buffer.alloc(44);
    buffer[0] = 0x0d; // Correct type
    buffer[1] = 99; // Invalid profession (should be 1-9)
    const base64 = buffer.toString('base64');
    const chatLink = `[&${base64}]`;

    await expect(decode(chatLink, mockMapper)).rejects.toThrow(
      BuildCodeError,
    );
    await expect(decode(chatLink, mockMapper)).rejects.toMatchObject({
      code: BuildCodeErrorCode.INVALID_PROFESSION,
    });
  });

  it('should handle builds with empty specialization slots', async () => {
    const buffer = Buffer.alloc(44);
    buffer[0] = 0x0d;
    buffer[1] = 8; // Necromancer
    // Leave all specialization bytes as 0
    const base64 = buffer.toString('base64');
    const chatLink = `[&${base64}]`;

    const build = await decode(chatLink, mockMapper);

    expect(build.profession).toBe(Profession.Necromancer);
    expect(build.specializations).toHaveLength(0);
  });

  it('should handle builds with empty skill slots', async () => {
    const buffer = Buffer.alloc(44);
    buffer[0] = 0x0d;
    buffer[1] = 8; // Necromancer
    // Leave all skill palette indices as 0
    const base64 = buffer.toString('base64');
    const chatLink = `[&${base64}]`;

    const build = await decode(chatLink, mockMapper);

    expect(build.skills.heal).toBe(0);
    expect(build.skills.utility1).toBe(0);
    expect(build.skills.utility2).toBe(0);
    expect(build.skills.utility3).toBe(0);
    expect(build.skills.elite).toBe(0);
  });

  it('should decode aquatic builds with offset', async () => {
    const build = await decode(OFFICIAL_CODES.fullNecro.chatLink, mockMapper, {
      aquatic: true,
    });

    expect(build.profession).toBe(Profession.Necromancer);
    // Aquatic offset affects skill and profession-specific data positions
  });

  it('should decode Engineer Amalgam build with morph skills', async () => {
    const build = await decode(
      OFFICIAL_CODES.amalgamWithMorphSkills.chatLink,
      mockMapper,
    );

    expect(build.profession).toBe(Profession.Engineer);

    // Check profession-specific data
    expect(build.professionSpecific).toBeDefined();
    expect(build.professionSpecific?.type).toBe('engineer');

    if (build.professionSpecific?.type === 'engineer') {
      // Extended data contains palette indices [90, 54, 51]
      // MockPaletteMapper adds offset of 10000
      expect(build.professionSpecific.toolbeltSkills).toEqual([10090, 10054, 10051]);
    }

    // Should not have weapons array (Engineer uses extended data for morph skills)
    expect(build.weapons).toBeUndefined();
  });
});
