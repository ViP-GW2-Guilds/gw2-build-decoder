/**
 * Types for build validation against GW2 API
 */

export interface ValidationResult {
  /** Whether the build passed all validation checks */
  valid: boolean;
  /** Critical errors that make the build invalid */
  errors: ValidationError[];
  /** Warnings about potential issues */
  warnings: ValidationWarning[];
}

export interface ValidationError {
  /** Type of validation error */
  type: ValidationErrorType;
  /** Human-readable error message */
  message: string;
  /** Additional context (skill ID, spec ID, etc.) */
  context?: Record<string, unknown>;
}

export interface ValidationWarning {
  /** Type of validation warning */
  type: ValidationWarningType;
  /** Human-readable warning message */
  message: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

export enum ValidationErrorType {
  INVALID_SKILL_ID = 'INVALID_SKILL_ID',
  INVALID_SPECIALIZATION_ID = 'INVALID_SPECIALIZATION_ID',
  SPECIALIZATION_NOT_FOR_PROFESSION = 'SPECIALIZATION_NOT_FOR_PROFESSION',
  INVALID_PET_ID = 'INVALID_PET_ID',
  INVALID_LEGEND_ID = 'INVALID_LEGEND_ID',
  SKILL_NOT_FOR_PROFESSION = 'SKILL_NOT_FOR_PROFESSION',
}

export enum ValidationWarningType {
  DEPRECATED_SKILL = 'DEPRECATED_SKILL',
  SKILL_TYPE_MISMATCH = 'SKILL_TYPE_MISMATCH',
  MISSING_ELITE_SPECIALIZATION = 'MISSING_ELITE_SPECIALIZATION',
}

export interface SkillInfo {
  /** Skill ID */
  id: number;
  /** Skill name */
  name: string;
  /** Professions that can use this skill */
  professions: string[];
  /** Skill type (Heal, Utility, Elite, Weapon, etc.) */
  type: string;
  /** Skill slot */
  slot: string;
}

export interface SpecializationInfo {
  /** Specialization ID */
  id: number;
  /** Specialization name */
  name: string;
  /** Profession that owns this specialization */
  profession: string;
  /** Whether this is an elite specialization */
  elite: boolean;
}

export interface PetInfo {
  /** Pet ID */
  id: number;
  /** Pet name */
  name: string;
}
