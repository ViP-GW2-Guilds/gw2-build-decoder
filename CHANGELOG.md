# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2026-02-06

### Fixed
- **CRITICAL**: Fixed skill order in encoder and decoder (bug introduced in v1.0.0)
  - v1.0.0-1.0.2 had incorrect skill ordering causing utility2 to be missing in-game for ALL builds
  - Correct order pairs each terrestrial skill with its aquatic counterpart:
    `heal, aquaticHeal, util1, aquaticUtil1, util2, aquaticUtil2, util3, aquaticUtil3, elite, aquaticElite`
  - Previous incorrect order was: `heal, aquaticHeal, util1, util2, util3, aquaticUtil1, aquaticUtil2, aquaticUtil3, elite, aquaticElite`
  - Confirmed via in-game testing that generated codes now import correctly with all 3 utility skills
- Fixed Ranger pets not being encoded (encoder skipped extended data for Rangers)

### Changed
- Updated skill reading/writing order in both encoder and decoder for all professions
- Updated skill reading order in Revenant-specific decoder

## [1.0.2] - 2026-02-01

### Fixed
- **CORRECTION**: Engineer morph skills are NOT encoded in GW2 build templates
- Fixed crash when decoding Engineer builds with extended data
- Extended data for Engineer builds is now consumed correctly to prevent crashes
- Decoder now returns `undefined` for `professionSpecific` on Engineer builds (correct behavior)

### Changed
- Deprecated `EngineerData` type (kept for backwards compatibility but never returned)
- Updated documentation to clarify that morph skills are not stored in build codes
- Confirmed via in-game testing that morph skills are neither encoded nor populated from templates

### Removed
- Removed incorrect morph skill decoding logic from v1.0.1
- Removed test expecting Engineer morph skills (based on false assumptions)

## [1.0.1] - 2026-02-01 [YANKED]

**This release contained incorrect assumptions about Engineer build codes and has been superseded by v1.0.2.**

### Incorrect Claims (Corrected in v1.0.2)
- ~~Engineer Amalgam morph skills are decoded from extended data~~ - FALSE
- ~~Extended data contains morph skills instead of weapons~~ - FALSE
- Morph skills are NOT in build codes at all (confirmed via in-game testing)

## [1.0.0] - 2026-01-22

### Production Release

This is the first production-ready release with complete data preservation and validation capabilities.

**Highlights:**
- ✅ All 10 skill slots (terrestrial + aquatic) now preserved
- ✅ Zero data loss on round-trip encode/decode
- ✅ BuildValidator for verifying builds against GW2 API
- ✅ Support for modern extended build codes (50+ bytes)
- ✅ 27 tests passing, production-ready

**See MIGRATION.md for upgrade guide from v0.x**

### Added
- BuildValidator class for optional build validation against GW2 API
- Validation types (ValidationResult, ValidationError, ValidationWarning)
- MetadataProvider interface for API access
- Comprehensive validator test suite (10 tests)
- Support for all 10 skill slots (terrestrial + aquatic)
- TERRESTRIAL_SKILL_COUNT constant
- MIGRATION.md with detailed upgrade guide
- Complete CHANGELOG

### Changed
- **BREAKING:** Extended Skills interface with 5 aquatic skill fields
- **BREAKING:** SKILL_COUNT constant changed from 5 to 10
- **BREAKING:** BYTES_PER_SKILL constant changed from 4 to 2
- Fixed decoder binary reading - removed incorrect `skip(2)`
- Encoder now writes all 10 skill slots
- Updated all test fixtures to include aquatic skill fields
- Updated README with v1.0.0 features and validation examples

### Deprecated
- DecodeOptions.aquatic - no longer needed, all 10 slots always decoded

### Fixed
- **Critical:** Aquatic skills are no longer lost on round-trip encode/decode
- Binary structure interpretation error (was reading skills as 4 bytes each, correct is 2 bytes)
- Extended format encoder now writes both count bytes correctly

## [1.0.0-alpha.2] - 2026-01-22 (Pre-release)

### Added
- BuildValidator class for optional build validation against GW2 API
- Validation types (ValidationResult, ValidationError, ValidationWarning)
- MetadataProvider interface for API access
- Comprehensive validator test suite (10 tests)
- Exported validator and validation types from main package

### Changed
- Version bumped to 1.0.0-alpha.2 to include validator in alpha testing

## [1.0.0-alpha.1] - 2026-01-22

### Added
- **BREAKING:** Extended Skills interface with 5 aquatic skill fields (aquaticHeal, aquaticUtility1-3, aquaticElite)
- Test for round-trip encoding with different aquatic skills
- TERRESTRIAL_SKILL_COUNT constant

### Changed
- **BREAKING:** All 10 skill slots (5 terrestrial + 5 aquatic) now decoded and stored
- **BREAKING:** SKILL_COUNT constant changed from 5 to 10
- **BREAKING:** BYTES_PER_SKILL constant changed from 4 to 2
- Fixed decoder binary reading - removed incorrect `skip(2)` (each skill is 2 bytes, not 4)
- Encoder now writes all 10 skill slots
- Updated all test fixtures to include aquatic skill fields

### Deprecated
- DecodeOptions.aquatic - no longer needed, all 10 slots always decoded

### Fixed
- **Critical:** Aquatic skills are no longer lost on round-trip encode/decode
- Binary structure interpretation error (was reading skills as 4 bytes each, correct is 2 bytes)

## [0.3.2] - 2026-01-22

### Fixed
- Encoder now writes both weapon count and skill variant count bytes when extended data present
- Fixed 'Offset is outside the bounds' errors during round-trip operations

## [0.3.1] - 2026-01-22

### Added
- Encoder support for weapons and skillVariants arrays (extended format)
- Dynamic buffer sizing based on extended data

### Fixed
- Round-trip encoding now preserves weapon and skill variant data

## [0.3.0] - 2026-01-22

### Added
- Support for extended build code format (44+ bytes, introduced June 2023)
- Parse weapon array (dynamic length)
- Parse skill variant array (dynamic length)
- readUInt32LE() method to BinaryView for skill variant IDs
- Optional weapons and skillVariants fields to BuildCode interface

### Changed
- Length validation now accepts >= 44 bytes instead of exactly 44 bytes
- Backward compatible with 44-byte legacy format

## [0.2.0] - Earlier

Initial release with basic decode/encode functionality.

## Migration Guides

### Upgrading to v1.0.0

See [MIGRATION.md](./MIGRATION.md) for detailed migration instructions.

**Key Points:**
- Skills interface now has 10 fields instead of 5
- Existing code using `build.skills.heal` etc. continues to work
- If you create BuildCode objects, add 5 aquatic fields (or set to 0)
- No data loss on round-trip encode/decode
- Optional validation now available via BuildValidator

### Upgrading from v0.2.0 to v0.3.x

No breaking changes. Extended format support added.

## Breaking Changes Summary

### v1.0.0
- Skills interface extended with 5 aquatic skill fields
- SKILL_COUNT constant changed from 5 to 10
- BYTES_PER_SKILL constant changed from 4 to 2

### v0.3.0
- None (backward compatible additions only)
