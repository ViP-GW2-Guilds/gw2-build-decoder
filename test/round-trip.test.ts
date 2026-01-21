/**
 * Round-trip tests: encode(decode(x)) === x
 */

import { describe, it, expect } from 'vitest';
import { decode } from '../src/decoder.js';
import { encode } from '../src/encoder.js';
import { Profession, TraitChoice } from '../src/types.js';
import type { BuildCode } from '../src/types.js';
import { MockPaletteMapper } from './fixtures.js';

const mockMapper = new MockPaletteMapper();

describe('round-trip encoding/decoding', () => {
  it('should encode and decode a simple build', async () => {
    const original: BuildCode = {
      profession: Profession.Necromancer,
      specializations: [
        {
          id: 53,
          traits: [TraitChoice.Top, TraitChoice.Middle, TraitChoice.Middle],
        },
        {
          id: 50,
          traits: [TraitChoice.Top, TraitChoice.Top, TraitChoice.Middle],
        },
        {
          id: 34,
          traits: [TraitChoice.Middle, TraitChoice.Top, TraitChoice.Bottom],
        },
      ],
      skills: {
        heal: 10100,
        utility1: 10200,
        utility2: 10300,
        utility3: 10400,
        elite: 10500,
      },
    };

    const encoded = await encode(original, mockMapper);
    const decoded = await decode(encoded, mockMapper);

    expect(decoded).toEqual(original);
  });

  it('should encode and decode a Ranger build with pets', async () => {
    const original: BuildCode = {
      profession: Profession.Ranger,
      specializations: [
        {
          id: 30,
          traits: [TraitChoice.Top, TraitChoice.Middle, TraitChoice.Bottom],
        },
      ],
      skills: {
        heal: 11000,
        utility1: 12000,
        utility2: 13000,
        utility3: 14000,
        elite: 15000,
      },
      professionSpecific: {
        type: 'ranger',
        pets: [59, 17],
      },
    };

    const encoded = await encode(original, mockMapper);
    const decoded = await decode(encoded, mockMapper);

    expect(decoded).toEqual(original);
  });

  it('should encode and decode a Revenant build', async () => {
    const original: BuildCode = {
      profession: Profession.Revenant,
      specializations: [
        {
          id: 12,
          traits: [TraitChoice.Top, TraitChoice.Top, TraitChoice.Top],
        },
      ],
      skills: {
        heal: 11500,
        utility1: 12500,
        utility2: 13500,
        utility3: 14500,
        elite: 15500,
      },
      professionSpecific: {
        type: 'revenant',
        legends: [3, 5],
        inactiveSkills: [11001, 12002, 13003],
      },
    };

    const encoded = await encode(original, mockMapper);
    const decoded = await decode(encoded, mockMapper);

    expect(decoded).toEqual(original);
  });

  it('should handle builds with no specializations', async () => {
    const original: BuildCode = {
      profession: Profession.Guardian,
      specializations: [],
      skills: {
        heal: 0,
        utility1: 0,
        utility2: 0,
        utility3: 0,
        elite: 0,
      },
    };

    const encoded = await encode(original, mockMapper);
    const decoded = await decode(encoded, mockMapper);

    expect(decoded).toEqual(original);
  });

  it('should handle builds with partial specializations', async () => {
    const original: BuildCode = {
      profession: Profession.Warrior,
      specializations: [
        {
          id: 4,
          traits: [TraitChoice.Top, TraitChoice.None, TraitChoice.Bottom],
        },
      ],
      skills: {
        heal: 10100,
        utility1: 10200,
        utility2: 0,
        utility3: 0,
        elite: 10500,
      },
    };

    const encoded = await encode(original, mockMapper);
    const decoded = await decode(encoded, mockMapper);

    expect(decoded).toEqual(original);
  });

  it('should encode without chat link wrapper when requested', async () => {
    const build: BuildCode = {
      profession: Profession.Engineer,
      specializations: [],
      skills: {
        heal: 0,
        utility1: 0,
        utility2: 0,
        utility3: 0,
        elite: 0,
      },
    };

    const withWrapper = await encode(build, mockMapper, {
      wrapInChatLink: true,
    });
    const withoutWrapper = await encode(build, mockMapper, {
      wrapInChatLink: false,
    });

    expect(withWrapper).toMatch(/^\[&.*\]$/);
    expect(withoutWrapper).not.toMatch(/^\[&/);
    expect(withoutWrapper).not.toMatch(/\]$/);

    // Should decode the same
    const decoded1 = await decode(withWrapper, mockMapper);
    const decoded2 = await decode(withoutWrapper, mockMapper);
    expect(decoded1).toEqual(decoded2);
  });

  it('should handle aquatic builds round-trip', async () => {
    const original: BuildCode = {
      profession: Profession.Ranger,
      specializations: [
        {
          id: 30,
          traits: [TraitChoice.Top, TraitChoice.Middle, TraitChoice.Bottom],
        },
      ],
      skills: {
        heal: 11000,
        utility1: 12000,
        utility2: 13000,
        utility3: 14000,
        elite: 15000,
      },
      professionSpecific: {
        type: 'ranger',
        pets: [10, 20],
      },
    };

    const encoded = await encode(original, mockMapper, { aquatic: true });
    const decoded = await decode(encoded, mockMapper, { aquatic: true });

    expect(decoded).toEqual(original);
  });
});
