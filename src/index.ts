/**
 * GW2 Build Decoder - Decode and encode Guild Wars 2 official build template chat links
 *
 * @packageDocumentation
 */

// Core functions
export { decode } from './decoder.js';
export { encode } from './encoder.js';

// Types
export type {
  BuildCode,
  Specialization,
  Skills,
  PaletteMapper,
  DecodeOptions,
  EncodeOptions,
  ProfessionSpecificData,
  RangerData,
  RevenantData,
  EngineerData,
} from './types.js';

// Enums
export { Profession, TraitChoice, Legend } from './types.js';

// Errors
export { BuildCodeError, BuildCodeErrorCode } from './errors.js';

// Constants (optional, for advanced users)
export {
  OFFICIAL_CODE_LENGTH,
  OFFICIAL_TYPE_INDICATOR,
  PROFESSION_NAMES,
  LEGEND_NAMES,
} from './constants.js';
