/**
 * Tests for BuildValidator
 */

import { describe, it, expect, vi } from 'vitest';
import { BuildValidator } from '../src/validator.js';
import type { MetadataProvider } from '../src/validator.js';
import { Profession, TraitChoice } from '../src/types.js';
import type { BuildCode } from '../src/types.js';
import { ValidationErrorType } from '../src/validation-types.js';

describe('BuildValidator', () => {
  // Mock metadata provider
  const mockProvider: MetadataProvider = {
    getSkillInfo: vi.fn(async (skillId: number) => {
      const validSkills: Record<number, any> = {
        10100: {
          id: 10100,
          name: 'Test Heal',
          professions: ['Necromancer'],
          type: 'Heal',
          slot: 'Heal',
        },
        10200: {
          id: 10200,
          name: 'Test Utility',
          professions: ['Necromancer'],
          type: 'Utility',
          slot: 'Utility',
        },
        10300: {
          id: 10300,
          name: 'Guardian Skill',
          professions: ['Guardian'],
          type: 'Utility',
          slot: 'Utility',
        },
      };
      return validSkills[skillId] || null;
    }),
    getSpecializationInfo: vi.fn(async (specId: number) => {
      const validSpecs: Record<number, any> = {
        53: {
          id: 53,
          name: 'Spite',
          profession: 'Necromancer',
          elite: false,
        },
        50: {
          id: 50,
          name: 'Soul Reaping',
          profession: 'Necromancer',
          elite: false,
        },
        34: {
          id: 34,
          name: 'Reaper',
          profession: 'Necromancer',
          elite: true,
        },
        27: {
          id: 27,
          name: 'Dragonhunter',
          profession: 'Guardian',
          elite: true,
        },
      };
      return validSpecs[specId] || null;
    }),
    getPetInfo: vi.fn(async (petId: number) => {
      const validPets: Record<number, any> = {
        59: { id: 59, name: 'Moa' },
        17: { id: 17, name: 'Warthog' },
      };
      return validPets[petId] || null;
    }),
  };

  const validator = new BuildValidator(mockProvider);

  describe('Valid builds', () => {
    it('should validate a correct Necromancer build', async () => {
      const build: BuildCode = {
        profession: Profession.Necromancer,
        specializations: [
          { id: 53, traits: [TraitChoice.Top, TraitChoice.Top, TraitChoice.Top] },
          { id: 50, traits: [TraitChoice.Top, TraitChoice.Top, TraitChoice.Top] },
          { id: 34, traits: [TraitChoice.Top, TraitChoice.Top, TraitChoice.Top] },
        ],
        skills: {
          heal: 10100,
          utility1: 10200,
          utility2: 0,
          utility3: 0,
          elite: 0,
          aquaticHeal: 0,
          aquaticUtility1: 0,
          aquaticUtility2: 0,
          aquaticUtility3: 0,
          aquaticElite: 0,
        },
      };

      const result = await validator.validate(build);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a build with aquatic skills', async () => {
      const build: BuildCode = {
        profession: Profession.Necromancer,
        specializations: [
          { id: 53, traits: [TraitChoice.Top, TraitChoice.Top, TraitChoice.Top] },
        ],
        skills: {
          heal: 10100,
          utility1: 0,
          utility2: 0,
          utility3: 0,
          elite: 0,
          aquaticHeal: 10200,
          aquaticUtility1: 0,
          aquaticUtility2: 0,
          aquaticUtility3: 0,
          aquaticElite: 0,
        },
      };

      const result = await validator.validate(build);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate Ranger build with pets', async () => {
      const build: BuildCode = {
        profession: Profession.Ranger,
        specializations: [],
        skills: {
          heal: 0,
          utility1: 0,
          utility2: 0,
          utility3: 0,
          elite: 0,
          aquaticHeal: 0,
          aquaticUtility1: 0,
          aquaticUtility2: 0,
          aquaticUtility3: 0,
          aquaticElite: 0,
        },
        professionSpecific: {
          type: 'ranger',
          pets: [59, 17],
        },
      };

      const result = await validator.validate(build);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Invalid skills', () => {
    it('should detect non-existent skill ID', async () => {
      const build: BuildCode = {
        profession: Profession.Necromancer,
        specializations: [],
        skills: {
          heal: 999999, // Doesn't exist
          utility1: 0,
          utility2: 0,
          utility3: 0,
          elite: 0,
          aquaticHeal: 0,
          aquaticUtility1: 0,
          aquaticUtility2: 0,
          aquaticUtility3: 0,
          aquaticElite: 0,
        },
      };

      const result = await validator.validate(build);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe(ValidationErrorType.INVALID_SKILL_ID);
      expect(result.errors[0].context?.skillId).toBe(999999);
    });

    it('should detect skill from wrong profession', async () => {
      const build: BuildCode = {
        profession: Profession.Necromancer,
        specializations: [],
        skills: {
          heal: 10300, // Guardian skill, not Necromancer
          utility1: 0,
          utility2: 0,
          utility3: 0,
          elite: 0,
          aquaticHeal: 0,
          aquaticUtility1: 0,
          aquaticUtility2: 0,
          aquaticUtility3: 0,
          aquaticElite: 0,
        },
      };

      const result = await validator.validate(build);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe(
        ValidationErrorType.SKILL_NOT_FOR_PROFESSION,
      );
      expect(result.errors[0].message).toContain('Guardian Skill');
      expect(result.errors[0].message).toContain('Necromancer');
    });
  });

  describe('Invalid specializations', () => {
    it('should detect non-existent specialization ID', async () => {
      const build: BuildCode = {
        profession: Profession.Necromancer,
        specializations: [
          { id: 999, traits: [TraitChoice.Top, TraitChoice.Top, TraitChoice.Top] },
        ],
        skills: {
          heal: 0,
          utility1: 0,
          utility2: 0,
          utility3: 0,
          elite: 0,
          aquaticHeal: 0,
          aquaticUtility1: 0,
          aquaticUtility2: 0,
          aquaticUtility3: 0,
          aquaticElite: 0,
        },
      };

      const result = await validator.validate(build);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe(
        ValidationErrorType.INVALID_SPECIALIZATION_ID,
      );
      expect(result.errors[0].context?.specializationId).toBe(999);
    });

    it('should detect specialization from wrong profession', async () => {
      const build: BuildCode = {
        profession: Profession.Necromancer,
        specializations: [
          {
            id: 27, // Dragonhunter - Guardian spec, not Necromancer
            traits: [TraitChoice.Top, TraitChoice.Top, TraitChoice.Top],
          },
        ],
        skills: {
          heal: 0,
          utility1: 0,
          utility2: 0,
          utility3: 0,
          elite: 0,
          aquaticHeal: 0,
          aquaticUtility1: 0,
          aquaticUtility2: 0,
          aquaticUtility3: 0,
          aquaticElite: 0,
        },
      };

      const result = await validator.validate(build);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe(
        ValidationErrorType.SPECIALIZATION_NOT_FOR_PROFESSION,
      );
      expect(result.errors[0].message).toContain('Dragonhunter');
      expect(result.errors[0].message).toContain('Guardian');
      expect(result.errors[0].message).toContain('Necromancer');
    });
  });

  describe('Invalid pets', () => {
    it('should detect invalid pet ID', async () => {
      const build: BuildCode = {
        profession: Profession.Ranger,
        specializations: [],
        skills: {
          heal: 0,
          utility1: 0,
          utility2: 0,
          utility3: 0,
          elite: 0,
          aquaticHeal: 0,
          aquaticUtility1: 0,
          aquaticUtility2: 0,
          aquaticUtility3: 0,
          aquaticElite: 0,
        },
        professionSpecific: {
          type: 'ranger',
          pets: [999, 0],
        },
      };

      const result = await validator.validate(build);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe(ValidationErrorType.INVALID_PET_ID);
      expect(result.errors[0].context?.petId).toBe(999);
    });

    it('should allow empty pet slots (0)', async () => {
      const build: BuildCode = {
        profession: Profession.Ranger,
        specializations: [],
        skills: {
          heal: 0,
          utility1: 0,
          utility2: 0,
          utility3: 0,
          elite: 0,
          aquaticHeal: 0,
          aquaticUtility1: 0,
          aquaticUtility2: 0,
          aquaticUtility3: 0,
          aquaticElite: 0,
        },
        professionSpecific: {
          type: 'ranger',
          pets: [59, 0], // Second pet empty is valid
        },
      };

      const result = await validator.validate(build);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Multiple errors', () => {
    it('should collect all validation errors', async () => {
      const build: BuildCode = {
        profession: Profession.Necromancer,
        specializations: [
          { id: 999, traits: [TraitChoice.Top, TraitChoice.Top, TraitChoice.Top] }, // Invalid spec
          { id: 27, traits: [TraitChoice.Top, TraitChoice.Top, TraitChoice.Top] }, // Wrong profession
        ],
        skills: {
          heal: 888888, // Invalid skill
          utility1: 10300, // Wrong profession (Guardian)
          utility2: 0,
          utility3: 0,
          elite: 0,
          aquaticHeal: 0,
          aquaticUtility1: 0,
          aquaticUtility2: 0,
          aquaticUtility3: 0,
          aquaticElite: 0,
        },
      };

      const result = await validator.validate(build);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);

      // Should have at least one skill error and one spec error
      const skillErrors = result.errors.filter(
        e => e.type === ValidationErrorType.INVALID_SKILL_ID ||
             e.type === ValidationErrorType.SKILL_NOT_FOR_PROFESSION
      );
      const specErrors = result.errors.filter(
        e => e.type === ValidationErrorType.INVALID_SPECIALIZATION_ID ||
             e.type === ValidationErrorType.SPECIALIZATION_NOT_FOR_PROFESSION
      );

      expect(skillErrors.length).toBeGreaterThan(0);
      expect(specErrors.length).toBeGreaterThan(0);
    });
  });
});
