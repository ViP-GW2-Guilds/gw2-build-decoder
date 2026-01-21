/**
 * Error codes for build code operations
 */
export enum BuildCodeErrorCode {
  /** Build code has invalid length (not 44 bytes) */
  INVALID_LENGTH = 'INVALID_LENGTH',
  /** Type indicator byte is not 0x0D */
  INVALID_TYPE = 'INVALID_TYPE',
  /** Profession ID is not valid (1-9) */
  INVALID_PROFESSION = 'INVALID_PROFESSION',
  /** Palette mapper failed to convert palette index to skill ID */
  PALETTE_LOOKUP_FAILED = 'PALETTE_LOOKUP_FAILED',
  /** Failed to decode base64 string */
  BASE64_DECODE_FAILED = 'BASE64_DECODE_FAILED',
}

/**
 * Custom error for build code operations
 */
export class BuildCodeError extends Error {
  /**
   * Create a new BuildCodeError
   * @param message - Human-readable error message
   * @param code - Error code for programmatic handling
   * @param cause - Optional underlying cause
   */
  constructor(
    message: string,
    public readonly code: BuildCodeErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'BuildCodeError';

    // Maintain proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BuildCodeError);
    }
  }
}
