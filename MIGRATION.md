# Migration Guide: v0.x to v1.0.0

This guide helps you migrate from `gw2-build-decoder` v0.x to v1.0.0.

## Breaking Changes

### Extended Skills Interface

**What Changed:** The `Skills` interface now includes 5 additional fields for aquatic (underwater) skills.

**v0.x (Old):**
```typescript
interface Skills {
  heal: number;
  utility1: number;
  utility2: number;
  utility3: number;
  elite: number;
}
```

**v1.0.0 (New):**
```typescript
interface Skills {
  // Terrestrial skills (unchanged)
  heal: number;
  utility1: number;
  utility2: number;
  utility3: number;
  elite: number;

  // Aquatic skills (new)
  aquaticHeal: number;
  aquaticUtility1: number;
  aquaticUtility2: number;
  aquaticUtility3: number;
  aquaticElite: number;
}
```

### Migration Steps

#### If You Only Use Terrestrial Skills

**No code changes required!** Your existing code continues to work:

```typescript
const build = await decode(chatLink, mapper);
console.log(build.skills.heal);      // ✅ Still works
console.log(build.skills.utility1);  // ✅ Still works
console.log(build.skills.elite);     // ✅ Still works
```

The new aquatic fields default to `0` if not present in the build code.

#### If You Create BuildCode Objects for Encoding

**Add the 5 aquatic fields** (or use TypeScript's partial helper):

**Before (v0.x):**
```typescript
const build: BuildCode = {
  profession: Profession.Necromancer,
  specializations: [...],
  skills: {
    heal: 10100,
    utility1: 10200,
    utility2: 10300,
    utility3: 10400,
    elite: 10500,
  },
};
```

**After (v1.0.0):**
```typescript
const build: BuildCode = {
  profession: Profession.Necromancer,
  specializations: [...],
  skills: {
    // Terrestrial
    heal: 10100,
    utility1: 10200,
    utility2: 10300,
    utility3: 10400,
    elite: 10500,
    // Aquatic (set to 0 if not used)
    aquaticHeal: 0,
    aquaticUtility1: 0,
    aquaticUtility2: 0,
    aquaticUtility3: 0,
    aquaticElite: 0,
  },
};
```

**TypeScript Helper:**
```typescript
// For builds without aquatic skills
const buildWithDefaults: BuildCode = {
  ...myBuild,
  skills: {
    ...myBuild.skills,
    aquaticHeal: 0,
    aquaticUtility1: 0,
    aquaticUtility2: 0,
    aquaticUtility3: 0,
    aquaticElite: 0,
  },
};
```

#### If You Iterate Over Skills

Update your code to handle the new fields:

**Before:**
```typescript
const skillIds = [
  build.skills.heal,
  build.skills.utility1,
  build.skills.utility2,
  build.skills.utility3,
  build.skills.elite,
];
```

**After:**
```typescript
// Option 1: Only terrestrial
const terrestrialSkills = [
  build.skills.heal,
  build.skills.utility1,
  build.skills.utility2,
  build.skills.utility3,
  build.skills.elite,
];

// Option 2: All skills
const allSkills = [
  build.skills.heal,
  build.skills.aquaticHeal,
  build.skills.utility1,
  build.skills.utility2,
  build.skills.utility3,
  build.skills.aquaticUtility1,
  build.skills.aquaticUtility2,
  build.skills.aquaticUtility3,
  build.skills.elite,
  build.skills.aquaticElite,
];
```

### Deprecations

#### DecodeOptions.aquatic

The `aquatic` option in `DecodeOptions` is **deprecated** and no longer needed.

**Before (v0.x):**
```typescript
// You had to specify aquatic: true for underwater builds
const build = await decode(chatLink, mapper, { aquatic: true });
```

**After (v1.0.0):**
```typescript
// All 10 skill slots are always decoded
const build = await decode(chatLink, mapper);

// Check which skills are populated
if (build.skills.aquaticHeal > 0) {
  console.log('This build has underwater skills');
}
```

The decoder now **always** extracts both terrestrial and aquatic skills from every build code.

## New Features in v1.0.0

### BuildValidator (Opt-in Validation)

Validate decoded builds against the official GW2 API:

```typescript
import { BuildValidator } from '@vip-gw2-guilds/gw2-build-decoder';
import { GW2PaletteMapper } from '@vip-gw2-guilds/gw2-palette-mapper';

const mapper = new GW2PaletteMapper();
const validator = new BuildValidator(mapper); // mapper implements MetadataProvider

const build = await decode(chatLink, mapper);
const result = await validator.validate(build);

if (!result.valid) {
  console.error('Invalid build!');
  result.errors.forEach(error => {
    console.error(`- ${error.message}`);
  });
}
```

**What it validates:**
- ✅ All skill IDs exist in GW2 API
- ✅ Skills can be used by the profession
- ✅ Specialization IDs exist and belong to the profession
- ✅ Pet IDs are valid (for Rangers)

### Extended Build Code Format Support

Supports modern build codes (50+ bytes) with weapons and skill variants:

```typescript
const build = await decode(chatLink, mapper);

// New optional fields (added June 2023)
console.log(build.weapons);        // [86, 49, 89] - weapon type IDs
console.log(build.skillVariants);  // [12345, 67890] - skill variant IDs
```

## Why Upgrade?

### Critical Fixes
1. **No more data loss** - Aquatic skills are now preserved on round-trip encode/decode
2. **Correct binary parsing** - Fixed bug where each skill was read as 4 bytes instead of 2

### New Capabilities
1. **Validation** - Verify builds against GW2 API
2. **Complete data** - All 10 skill slots accessible
3. **Modern format** - Support for extended build codes with weapons/variants

### Better Testing
1. **106 tests** vs original 17 tests
2. **Validates correctness** - Not just "value > 0"
3. **API snapshots** - Offline testing against real GW2 data

## Compatibility Matrix

| Package Version | Decoder Version | Notes |
|----------------|-----------------|-------|
| gw2-palette-mapper 0.2.x | decoder 0.2.x-0.3.x | Old versions (data loss) |
| gw2-palette-mapper 0.3.0+ | decoder 1.0.0+ | Current (production-ready) |

**Recommended:** Always use the latest versions together.

## Need Help?

- **Issues:** https://github.com/ViP-GW2-Guilds/gw2-build-decoder/issues
- **Examples:** See test files in `test/` directory
- **API Docs:** https://wiki.guildwars2.com/wiki/Chat_link_format

## Rollback

If you need to rollback:

```bash
pnpm add @vip-gw2-guilds/gw2-build-decoder@0.3.2
pnpm add @vip-gw2-guilds/gw2-palette-mapper@0.2.7
```

**Note:** You will lose aquatic skill data and validation capabilities.
