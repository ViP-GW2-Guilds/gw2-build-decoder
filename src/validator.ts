/**
 * Build validation against GW2 API
 */

import type { BuildCode, Profession } from './types.js';
import type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  SkillInfo,
  SpecializationInfo,
} from './validation-types.js';
import { ValidationErrorType } from './validation-types.js';

/**
 * Interface for accessing GW2 API metadata
 * This must be implemented by a package that has access to GW2 API
 */
export interface MetadataProvider {
  /**
   * Get skill information from GW2 API
   * @param skillId - The skill ID to look up
   * @returns Promise resolving to skill info, or null if not found
   */
  getSkillInfo(skillId: number): Promise<SkillInfo | null>;

  /**
   * Get specialization information from GW2 API
   * @param specId - The specialization ID to look up
   * @returns Promise resolving to specialization info, or null if not found
   */
  getSpecializationInfo(specId: number): Promise<SpecializationInfo | null>;

  /**
   * Get pet information from GW2 API (for Rangers)
   * @param petId - The pet ID to look up
   * @returns Promise resolving to pet info, or null if not found
   */
  getPetInfo?(petId: number): Promise<{ id: number; name: string } | null>;
}

/**
 * Validates decoded builds against GW2 API data
 *
 * This is an optional validation layer that verifies decoded skill IDs,
 * specialization IDs, and profession-specific data are valid according
 * to the official GW2 API.
 *
 * @example
 * ```typescript
 * const validator = new BuildValidator(paletteMapper);
 * const build = await decode(chatLink, paletteMapper);
 * const result = await validator.validate(build);
 *
 * if (!result.valid) {
 *   console.error('Invalid build:', result.errors);
 * }
 * ```
 */
export class BuildValidator {
  constructor(private metadataProvider: MetadataProvider) {}

  /**
   * Validate a complete build
   * @param build - The build to validate
   * @returns Promise resolving to validation result
   */
  async validate(build: BuildCode): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate skills
    const skillErrors = await this.validateSkills(build);
    errors.push(...skillErrors);

    // Validate specializations
    const specErrors = await this.validateSpecializations(build);
    errors.push(...specErrors);

    // Validate profession-specific data
    if (build.professionSpecific) {
      if (build.professionSpecific.type === 'ranger') {
        const petErrors = await this.validatePets(build.professionSpecific.pets);
        errors.push(...petErrors);
      }
      // TODO: Validate Revenant legends when API supports it
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate all skills in a build
   */
  private async validateSkills(build: BuildCode): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const professionName = this.getProfessionName(build.profession);

    // Check all terrestrial skills
    const terrestrialSkills = [
      { id: build.skills.heal, slot: 'heal' },
      { id: build.skills.utility1, slot: 'utility1' },
      { id: build.skills.utility2, slot: 'utility2' },
      { id: build.skills.utility3, slot: 'utility3' },
      { id: build.skills.elite, slot: 'elite' },
    ];

    // Check all aquatic skills
    const aquaticSkills = [
      { id: build.skills.aquaticHeal, slot: 'aquaticHeal' },
      { id: build.skills.aquaticUtility1, slot: 'aquaticUtility1' },
      { id: build.skills.aquaticUtility2, slot: 'aquaticUtility2' },
      { id: build.skills.aquaticUtility3, slot: 'aquaticUtility3' },
      { id: build.skills.aquaticElite, slot: 'aquaticElite' },
    ];

    for (const skill of [...terrestrialSkills, ...aquaticSkills]) {
      if (skill.id === 0) continue; // Skip empty slots

      const skillInfo = await this.metadataProvider.getSkillInfo(skill.id);

      if (!skillInfo) {
        errors.push({
          type: ValidationErrorType.INVALID_SKILL_ID,
          message: `Skill ID ${skill.id} does not exist in GW2 API`,
          context: { skillId: skill.id, slot: skill.slot },
        });
        continue;
      }

      // Verify skill can be used by this profession
      if (!skillInfo.professions.includes(professionName)) {
        errors.push({
          type: ValidationErrorType.SKILL_NOT_FOR_PROFESSION,
          message: `Skill "${skillInfo.name}" (${skill.id}) cannot be used by ${professionName}`,
          context: {
            skillId: skill.id,
            skillName: skillInfo.name,
            profession: professionName,
            validProfessions: skillInfo.professions,
          },
        });
      }
    }

    return errors;
  }

  /**
   * Validate specializations
   */
  private async validateSpecializations(
    build: BuildCode,
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const professionName = this.getProfessionName(build.profession);

    for (const spec of build.specializations) {
      const specInfo =
        await this.metadataProvider.getSpecializationInfo(spec.id);

      if (!specInfo) {
        errors.push({
          type: ValidationErrorType.INVALID_SPECIALIZATION_ID,
          message: `Specialization ID ${spec.id} does not exist in GW2 API`,
          context: { specializationId: spec.id },
        });
        continue;
      }

      // Verify specialization belongs to this profession
      if (specInfo.profession !== professionName) {
        errors.push({
          type: ValidationErrorType.SPECIALIZATION_NOT_FOR_PROFESSION,
          message: `Specialization "${specInfo.name}" (${spec.id}) belongs to ${specInfo.profession}, not ${professionName}`,
          context: {
            specializationId: spec.id,
            specializationName: specInfo.name,
            expectedProfession: professionName,
            actualProfession: specInfo.profession,
          },
        });
      }
    }

    return errors;
  }

  /**
   * Validate Ranger pets
   */
  private async validatePets(
    pets: [number, number],
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    if (!this.metadataProvider.getPetInfo) {
      // Pet validation not supported by this metadata provider
      return errors;
    }

    for (let i = 0; i < pets.length; i++) {
      const petId = pets[i];
      if (petId === 0) continue; // Empty pet slot is valid

      const petInfo = await this.metadataProvider.getPetInfo(petId);

      if (!petInfo) {
        errors.push({
          type: ValidationErrorType.INVALID_PET_ID,
          message: `Pet ID ${petId} does not exist in GW2 API`,
          context: { petId, petSlot: i },
        });
      }
    }

    return errors;
  }

  /**
   * Get profession name from ID
   */
  private getProfessionName(profession: Profession): string {
    const names: Record<number, string> = {
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
    return names[profession] || 'Unknown';
  }
}
