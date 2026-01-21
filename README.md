# gw2-build-decoder

Decode and encode Guild Wars 2 official build template chat links.

## Installation

This package is published to GitHub Packages.

### Step 1: Configure npm/pnpm to use GitHub Packages

Create a `.npmrc` file in your project root (or add to existing):

```
@vip-gw2-guilds:registry=https://npm.pkg.github.com
```

### Step 2: Authenticate with GitHub (if private repo)

For public packages, authentication may not be required. If needed:

```bash
npm login --registry=https://npm.pkg.github.com
# Username: your-github-username
# Password: your-github-personal-access-token
# Email: your-email
```

### Step 3: Install the package

```bash
pnpm add @vip-gw2-guilds/gw2-build-decoder
# or
npm install @vip-gw2-guilds/gw2-build-decoder
# or
yarn add @vip-gw2-guilds/gw2-build-decoder
```

## Requirements

- Node.js >= 22.0.0
- A PaletteMapper implementation (see [Understanding Palette Mappers](#understanding-palette-mappers))

## Quick Start

```typescript
import { decode, encode, Profession } from '@vip-gw2-guilds/gw2-build-decoder';

// You'll need a PaletteMapper implementation (see below)
const mapper = new YourPaletteMapper();

// Decode a chat link
const chatLink = '[&DQg1KTIlIjbBEgAAgQB1AUABgQB1AUABlQCVAAAAAAAAAAAAAAAAAAAAAAA=]';
const build = await decode(chatLink, mapper);

console.log(build.profession); // Profession.Necromancer
console.log(build.specializations); // [{ id: 53, traits: [1, 2, 2] }, ...]
console.log(build.skills.heal); // Skill ID

// Encode a build back to a chat link
const encoded = await encode(build, mapper);
console.log(encoded); // [&DQg1KTI...]
```

## Understanding Palette Mappers

**Critical Requirement:** GW2 official build codes store skills as **palette indices**, not skill IDs. Each profession has a unique mapping between palette indices and skill IDs.

This package requires you to provide a `PaletteMapper` implementation that performs these conversions:

```typescript
interface PaletteMapper {
  paletteToSkill(profession: Profession, paletteIndex: number): Promise<number>;
  skillToPalette(profession: Profession, skillId: number): Promise<number>;
}
```

**Note:** v0.2.0+ requires async PaletteMapper methods (returns `Promise<number>`). This enables API-based palette mapping implementations.

### Why External?

We keep the palette mapping external to:
- Keep the package lightweight and focused
- Let you control data freshness (GW2 adds new skills regularly)
- Avoid bundling large static data files
- Support multiple data sources (offline data, GW2 API, custom databases)

### Future Companion Package

A companion package `gw2-palette-mapper` is planned (separate repository) that will provide ready-to-use implementations:

```typescript
// Future package (not yet available)
import { GW2PaletteMapper } from 'gw2-palette-mapper';

const mapper = new GW2PaletteMapper({
  source: 'api', // or 'bundled' or 'hybrid'
  cacheDir: '.cache/gw2-palettes',
});
```

### Data Sources

To implement your own mapper, you can:

1. **GW2 Official API** (recommended for fresh data)
   - Endpoint: `https://api.guildwars2.com/v2/professions`
   - Each profession response includes `skills_by_palette` array

2. **Extract from existing tools** (e.g., HsBuildCodes offline data)

3. **Hybrid approach**: Bundle common skills, fall back to API for rare ones

**Important:** Revenant requires special legend-based palette mapping. The palette indices vary by active legend.

## API Reference

### decode(chatLink, paletteMapper, options?)

Decode a GW2 official build template chat link.

```typescript
const build = await decode(
  '[&DQg1KTI...]',
  mapper,
  { aquatic: false } // optional
);
```

**Parameters:**
- `chatLink` (string): Chat link with or without `[&` and `]` wrapper
- `paletteMapper` (PaletteMapper): Implementation for palette ↔ skill mapping
- `options.aquatic` (boolean): Whether this is an aquatic (underwater) build

**Returns:** `Promise<BuildCode>`

**Throws:** `BuildCodeError` if chat link is invalid

### encode(buildCode, paletteMapper, options?)

Encode a BuildCode object into a chat link.

```typescript
const chatLink = await encode(
  build,
  mapper,
  {
    aquatic: false,         // optional
    wrapInChatLink: true    // optional (default: true)
  }
);
```

**Parameters:**
- `buildCode` (BuildCode): Build configuration to encode
- `paletteMapper` (PaletteMapper): Implementation for skill → palette mapping
- `options.aquatic` (boolean): Encode as aquatic build
- `options.wrapInChatLink` (boolean): Wrap result in `[&...]` format

**Returns:** `Promise<string>`

## Types

### BuildCode

```typescript
interface BuildCode {
  profession: Profession;                    // 1-9 (Guardian through Revenant)
  specializations: Specialization[];         // Up to 3 specializations
  skills: Skills;                            // 5 skill slots
  professionSpecific?: ProfessionSpecificData; // Ranger/Revenant data
}
```

### Specialization

```typescript
interface Specialization {
  id: number;                                 // Specialization ID
  traits: [TraitChoice, TraitChoice, TraitChoice]; // Adept, Master, Grandmaster
}

enum TraitChoice {
  None = 0,
  Top = 1,
  Middle = 2,
  Bottom = 3,
}
```

### Skills

```typescript
interface Skills {
  heal: number;      // Heal skill ID
  utility1: number;  // First utility skill ID
  utility2: number;  // Second utility skill ID
  utility3: number;  // Third utility skill ID
  elite: number;     // Elite skill ID
}
```

### Profession-Specific Data

#### Ranger

```typescript
interface RangerData {
  type: 'ranger';
  pets: [number, number]; // Two terrestrial pet IDs
}
```

#### Revenant

```typescript
interface RevenantData {
  type: 'revenant';
  legends: [number, number?];              // Active and inactive legend
  inactiveSkills?: [number, number, number]; // Utility skills for inactive legend
}
```

**Note:** Engineer toolbelt skills are **NOT** part of the official 44-byte format.

## Aquatic Builds

Underwater builds use a 2-byte offset for skill and profession-specific data:

```typescript
// Decode aquatic build
const build = await decode(chatLink, mapper, { aquatic: true });

// Encode aquatic build
const encoded = await encode(build, mapper, { aquatic: true });
```

## Error Handling

```typescript
import { BuildCodeError, BuildCodeErrorCode } from '@vip-gw2-guilds/gw2-build-decoder';

try {
  const build = await decode(chatLink, mapper);
} catch (error) {
  if (error instanceof BuildCodeError) {
    switch (error.code) {
      case BuildCodeErrorCode.INVALID_LENGTH:
        console.error('Chat link has wrong length');
        break;
      case BuildCodeErrorCode.INVALID_TYPE:
        console.error('Not an official build code');
        break;
      case BuildCodeErrorCode.PALETTE_LOOKUP_FAILED:
        console.error('Palette mapper failed');
        break;
    }
  }
}
```

## Technical Details

### Binary Format (44 bytes)

```
Byte 0:      Type indicator (0x0D = 13)
Byte 1:      Profession ID (1-9)
Bytes 2-7:   3 specializations (2 bytes each: spec_id, trait_choices)
Bytes 8-27:  5 skills (4 bytes each: uint16 palette_index + 2 padding)
Bytes 28-43: Profession-specific data (16 bytes)
```

### Trait Encoding

Each specialization's trait choices are packed into 1 byte:
- Bits 0-1: Adept trait (0=None, 1=Top, 2=Middle, 3=Bottom)
- Bits 2-3: Master trait
- Bits 4-5: Grandmaster trait

### Skill Palette Mapping

Official GW2 codes use profession-specific palette indices instead of skill IDs. This allows the game to change skill IDs without breaking existing codes.

**Example mapping (Necromancer):**
- Palette index 4572 → Skill ID 10527 (Well of Blood)
- Palette index 4614 → Skill ID 10533 (Spectral Walk)

## Development

```bash
# Clone the repository
git clone https://github.com/ViP-GW2-Guilds/gw2-build-decoder.git
cd gw2-build-decoder

# Install dependencies
pnpm install

# Build
pnpm build

# Test
pnpm test

# Test with coverage
pnpm test:coverage

# Lint
pnpm lint
```

## Publishing

This package uses GitHub Actions for automated publishing. To release a new version:

1. Update the version in `package.json`
2. Commit and push to `main`
3. GitHub Actions will automatically build, tag, and publish

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR on GitHub.

## Repository

- GitHub: https://github.com/ViP-GW2-Guilds/gw2-build-decoder
- Issues: https://github.com/ViP-GW2-Guilds/gw2-build-decoder/issues
- Packages: https://github.com/orgs/ViP-GW2-Guilds/packages

## Related Projects

- [HsBuildCodes](https://github.com/HardstuckGuild/HsBuildCodes) - Original TypeScript implementation with Hardstuck format support
- GW2 API: https://api.guildwars2.com/v2/professions (palette data source)

## See Also

- [GW2 Build Templates Wiki](https://wiki.guildwars2.com/wiki/Chat_link_format/Build_templates)
- [Official GW2 API Documentation](https://wiki.guildwars2.com/wiki/API:Main)
