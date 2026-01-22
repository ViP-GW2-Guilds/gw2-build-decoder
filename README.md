# gw2-build-decoder

Decode and encode Guild Wars 2 official build template chat links with full support for terrestrial and aquatic skills.

[![npm version](https://img.shields.io/npm/v/@vip-gw2-guilds/gw2-build-decoder)](https://github.com/orgs/ViP-GW2-Guilds/packages)
[![Tests](https://img.shields.io/badge/tests-27%20passing-brightgreen)](./test)

## Features

- ✅ **Complete data preservation** - All 10 skill slots (terrestrial + aquatic)
- ✅ **Zero data loss** - Perfect round-trip encode/decode
- ✅ **Modern format support** - Handles 50+ byte codes (weapons, skill variants)
- ✅ **Optional validation** - Verify builds against GW2 API
- ✅ **Production-ready** - 106 tests, comprehensive error handling
- ✅ **TypeScript-first** - Full type safety and IntelliSense

## Installation

This package is published to GitHub Packages.

### Configure npm/pnpm

Create `.npmrc` in your project root:

```
@vip-gw2-guilds:registry=https://npm.pkg.github.com
```

### Install

```bash
pnpm add @vip-gw2-guilds/gw2-build-decoder @vip-gw2-guilds/gw2-palette-mapper
```

## Quick Start

```typescript
import { decode, encode } from '@vip-gw2-guilds/gw2-build-decoder';
import { GW2PaletteMapper } from '@vip-gw2-guilds/gw2-palette-mapper';

// Create palette mapper (handles skill palette ↔ ID conversions)
const mapper = new GW2PaletteMapper();

// Decode a chat link
const chatLink = '[&DQg1KTIlIjbBEgAAgQB1AUABgQB1AUABlQCVAAAAAAAAAAAAAAAAAAAAAAA=]';
const build = await decode(chatLink, mapper);

console.log(build.profession); // 8 (Necromancer)
console.log(build.specializations); // [{ id: 53, traits: [1, 2, 2] }, ...]
console.log(build.skills.heal); // 10527
console.log(build.skills.aquaticHeal); // 10531

// Encode back to chat link
const encoded = await encode(build, mapper);
console.log(encoded); // [&DQg1KTI...]
```

## What's New in v1.0.0

### 🎯 Aquatic Skills Support (BREAKING CHANGE)

GW2 build codes store **10 skill slots** (5 terrestrial + 5 aquatic). In v0.x, aquatic skills were **permanently lost** on decode. v1.0.0 fixes this.

**v0.x (Data Loss):**
```typescript
const build = await decode(chatLink, mapper);
console.log(build.skills);
// { heal: 10527, utility1: 10546, ... elite: 10646 }
// ❌ Aquatic skills lost forever
```

**v1.0.0 (Complete):**
```typescript
const build = await decode(chatLink, mapper);
console.log(build.skills);
// {
//   heal: 10527, utility1: 10546, ... elite: 10646,
//   aquaticHeal: 10531, aquaticUtility1: 10547, ... aquaticElite: 10650
// }
// ✅ All 10 slots preserved
```

### ✨ Build Validation (New Feature)

Validate decoded builds against the official GW2 API:

```typescript
import { BuildValidator } from '@vip-gw2-guilds/gw2-build-decoder';
import { GW2PaletteMapper } from '@vip-gw2-guilds/gw2-palette-mapper';

const mapper = new GW2PaletteMapper();
const validator = new BuildValidator(mapper);

const build = await decode(chatLink, mapper);
const result = await validator.validate(build);

if (!result.valid) {
  console.error('Invalid build:');
  result.errors.forEach(err => {
    console.error(`  - ${err.message}`);
  });
}
```

**What it validates:**
- All skill IDs exist in GW2 API
- Skills can be used by the profession
- Specialization IDs exist and belong to the profession
- Pet IDs are valid (for Rangers)

## API Reference

### Core Functions

#### decode(chatLink, paletteMapper, options?)

Decode a GW2 official build template chat link.

```typescript
const build = await decode('[&DQg1KTI...]', mapper);
```

**Parameters:**
- `chatLink` (string): Chat link with or without `[&` and `]` wrapper
- `paletteMapper` (PaletteMapper): Palette mapping implementation
- `options.aquatic` (boolean): **Deprecated in v1.0.0** - all slots always decoded

**Returns:** `Promise<BuildCode>`

#### encode(buildCode, paletteMapper, options?)

Encode a BuildCode object into a chat link.

```typescript
const chatLink = await encode(build, mapper, { wrapInChatLink: true });
```

**Parameters:**
- `buildCode` (BuildCode): Build configuration
- `paletteMapper` (PaletteMapper): Palette mapping implementation
- `options.wrapInChatLink` (boolean): Wrap in `[&...]` format (default: true)
- `options.aquatic` (boolean): **Deprecated in v1.0.0**

**Returns:** `Promise<string>`

### Types

#### BuildCode

```typescript
interface BuildCode {
  profession: Profession;                      // 1-9 (Guardian through Revenant)
  specializations: Specialization[];           // Up to 3 specializations
  skills: Skills;                              // 10 skill slots (v1.0.0+)
  professionSpecific?: ProfessionSpecificData; // Ranger/Revenant data
  weapons?: number[];                          // Weapon type IDs (extended format)
  skillVariants?: number[];                    // Skill variant IDs (extended format)
}
```

#### Skills

```typescript
interface Skills {
  // Terrestrial (land) skills
  heal: number;
  utility1: number;
  utility2: number;
  utility3: number;
  elite: number;

  // Aquatic (underwater) skills - v1.0.0+
  aquaticHeal: number;
  aquaticUtility1: number;
  aquaticUtility2: number;
  aquaticUtility3: number;
  aquaticElite: number;
}
```

#### Specialization

```typescript
interface Specialization {
  id: number;
  traits: [TraitChoice, TraitChoice, TraitChoice]; // Adept, Master, Grandmaster
}

enum TraitChoice {
  None = 0,
  Top = 1,
  Middle = 2,
  Bottom = 3,
}
```

#### Profession-Specific Data

**Ranger:**
```typescript
interface RangerData {
  type: 'ranger';
  pets: [number, number]; // Two pet IDs (0 if slot empty)
}
```

**Revenant:**
```typescript
interface RevenantData {
  type: 'revenant';
  legends: [number, number?];                // Active and inactive legend
  inactiveSkills?: [number, number, number]; // Utility skills for inactive legend
}
```

### Validation

#### BuildValidator

```typescript
class BuildValidator {
  constructor(metadataProvider: MetadataProvider);
  validate(build: BuildCode): Promise<ValidationResult>;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
```

See [validation examples](#build-validation-new-feature) above.

## Understanding Palette Mappers

**Critical:** GW2 build codes store skills as **palette indices**, not skill IDs. You need a `PaletteMapper` to convert between them.

### Recommended: Use gw2-palette-mapper

```bash
pnpm add @vip-gw2-guilds/gw2-palette-mapper
```

```typescript
import { GW2PaletteMapper } from '@vip-gw2-guilds/gw2-palette-mapper';

const mapper = new GW2PaletteMapper({
  apiUrl: 'https://api.guildwars2.com', // optional
  cacheTtl: 1800000, // 30 minutes (optional)
});
```

The `GW2PaletteMapper`:
- Fetches palette data from official GW2 API
- Caches responses for 30 minutes
- Supports validation via BuildValidator
- Handles all 9 professions

### Custom Implementation

Implement the `PaletteMapper` interface:

```typescript
interface PaletteMapper {
  paletteToSkill(profession: Profession, paletteIndex: number): Promise<number>;
  skillToPalette(profession: Profession, skillId: number): Promise<number>;
}
```

**Data source:** https://api.guildwars2.com/v2/professions (set `X-Schema-Version: 2019-12-19T00:00:00.000Z` header)

## Error Handling

```typescript
import { BuildCodeError, BuildCodeErrorCode } from '@vip-gw2-guilds/gw2-build-decoder';

try {
  const build = await decode(chatLink, mapper);
} catch (error) {
  if (error instanceof BuildCodeError) {
    console.error(`Error: ${error.message}`);
    console.error(`Code: ${error.code}`);
  }
}
```

**Error codes:**
- `INVALID_LENGTH` - Build code has wrong byte length
- `INVALID_TYPE` - Not an official build template (type != 0x0D)
- `INVALID_PROFESSION` - Profession ID not 1-9
- `BASE64_DECODE_FAILED` - Invalid base64 string
- `PALETTE_LOOKUP_FAILED` - PaletteMapper couldn't resolve index

## Migration from v0.x

See [MIGRATION.md](./MIGRATION.md) for detailed migration instructions.

**TL;DR:**
- Existing code using `build.skills.heal` etc. continues to work ✅
- If you create BuildCode objects, add 5 aquatic skill fields (or set to 0) ✅
- Aquatic skills now preserved on round-trip ✅

## Technical Details

### Binary Format

**Base Format (44 bytes):**
```
Byte 0:      Type indicator (0x0D)
Byte 1:      Profession ID (1-9)
Bytes 2-7:   3 specializations (2 bytes each: id, trait_choices)
Bytes 8-27:  10 skills (2 bytes each: uint16 palette_index)
             Order: heal, aquaticHeal, util1, util2, util3,
                    aquaticUtil1, aquaticUtil2, aquaticUtil3,
                    elite, aquaticElite
Bytes 28-43: Profession-specific data
```

**Extended Format (44+ bytes, June 2023+):**
```
Byte 44:     Weapon count
Bytes 45+:   Weapon type IDs (uint16 each)
Byte N:      Skill variant count
Bytes N+1:   Skill variant IDs (uint32 each)
```

### Skill Palette Mapping

Official GW2 codes use profession-specific palette indices:

**Example (Necromancer):**
- Palette 4801 → Skill 30488 ("Your Soul Is Mine!")
- Palette 129 → Skill 10546 (Well of Suffering)
- Palette 373 → Skill 10622 (Signet of Spite)

## Development

```bash
# Clone
git clone https://github.com/ViP-GW2-Guilds/gw2-build-decoder.git

# Install
pnpm install

# Build
pnpm build

# Test (27 tests)
pnpm test

# Coverage
pnpm test:coverage
```

## License

MIT

## Links

- **GitHub:** https://github.com/ViP-GW2-Guilds/gw2-build-decoder
- **Issues:** https://github.com/ViP-GW2-Guilds/gw2-build-decoder/issues
- **Packages:** https://github.com/orgs/ViP-GW2-Guilds/packages
- **Companion:** [@vip-gw2-guilds/gw2-palette-mapper](https://github.com/ViP-GW2-Guilds/gw2-palette-mapper)
- **GW2 API:** https://wiki.guildwars2.com/wiki/API:2/professions
- **Chat Link Format:** https://wiki.guildwars2.com/wiki/Chat_link_format
