# NPM Package Setup Guide

This guide will help you prepare and publish this SDK as an npm package.

## 📦 Package Configuration

### 1. Update Package Name

**Important**: The package name in `package.json` is currently set to `@your-org/cctp-wormhole-transfer`. You need to change this to your actual npm scope or package name.

**Option A: Scoped Package (Recommended for organizations)**
```json
{
  "name": "@your-org/cctp-wormhole-transfer"
}
```

**Option B: Unscoped Package**
```json
{
  "name": "cctp-wormhole-transfer"
}
```

Edit `package.json` and replace `@your-org` with your actual npm organization or remove the scope entirely.

### 2. Update Repository Information

Update the repository URL in `package.json`:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/cctp.git"
  }
}
```

### 3. Add Author Information

Add your name and email:

```json
{
  "author": "Your Name <your.email@example.com>"
}
```

## 🔨 Building the Package

Before publishing, build the package:

```bash
npm run build
```

This will:
- Compile TypeScript to JavaScript in `dist/`
- Generate TypeScript declaration files (`.d.ts`)
- Prepare the package for distribution

## 📝 Files Included in Package

The following files will be included when you publish:

- `dist/` - Compiled JavaScript and type definitions
- `README.md` - Main documentation
- `SDK.md` - SDK usage guide
- `LICENSE` - License file (create one if it doesn't exist)

Files excluded (via `.npmignore`):
- `src/` - Source TypeScript files
- `.env*` - Environment files
- Development/test files

## 🚀 Publishing to npm

### 1. Create an npm Account

If you don't have one, sign up at [npmjs.com](https://www.npmjs.com/signup).

### 2. Login to npm

```bash
npm login
```

Enter your username, password, and email.

### 3. Test the Package Locally (Optional)

Before publishing, you can test the package locally:

```bash
# Create a test directory
mkdir test-package
cd test-package

# Install from local path
npm install ../path/to/this/project

# Test imports
node -e "const sdk = require('@your-org/cctp-wormhole-transfer'); console.log(sdk);"
```

### 4. Publish

**For the first time:**
```bash
npm publish
```

**For scoped packages (if not public):**
```bash
npm publish --access public
```

**For updates (after version bump):**
```bash
# Update version first
npm version patch  # or minor, or major

# Then publish
npm publish
```

## 📋 Version Management

Follow semantic versioning:
- **Patch** (1.0.0 → 1.0.1): Bug fixes
- **Minor** (1.0.0 → 1.1.0): New features (backward compatible)
- **Major** (1.0.0 → 2.0.0): Breaking changes

Update version in `package.json` or use:
```bash
npm version patch
npm version minor
npm version major
```

## 🔍 Verifying Your Package

After publishing, verify it's available:

1. Check on npm website: `https://www.npmjs.com/package/@your-org/cctp-wormhole-transfer`
2. Install it: `npm install @your-org/cctp-wormhole-transfer`
3. Test imports in a new project

## 📚 Usage After Publishing

Users can install and use your SDK:

```bash
npm install @your-org/cctp-wormhole-transfer
```

```typescript
import { transferUsdcViaCctp } from '@your-org/cctp-wormhole-transfer';

const result = await transferUsdcViaCctp({
  amount: "1.0",
  destAddress: "0x...",
});
```

## ⚠️ Important Notes

1. **Private Keys**: Never publish private keys or sensitive data. They're excluded via `.npmignore`, but double-check before publishing.

2. **Version Control**: Make sure `.env*` files are in `.gitignore` and not committed.

3. **TypeScript Types**: The package includes TypeScript declarations (`.d.ts` files) for full type support.

4. **CLI Tools**: The package includes CLI binaries (`cctp-transfer` and `generate-permit2`) that users can run with `npx`.

5. **Dependencies**: All dependencies in `package.json` will be installed by users automatically.

## 🔧 Troubleshooting

**Error: "You do not have permission to publish"**
- Check if the package name is already taken
- If using a scope, ensure you're logged into the correct npm account
- For scoped packages, use `--access public` flag

**Error: "Package name is invalid"**
- Package names must be lowercase
- No spaces or special characters (except `-` and `_`)
- Scoped packages must start with `@scope/`

**TypeScript errors after install**
- Ensure `tsconfig.json` has `declaration: true`
- Rebuild with `npm run build`

## 📖 Documentation

Update these files before publishing:
- `README.md` - Quick start and overview
- `SDK.md` - Detailed SDK documentation
- `LICENSE` - Add a license file if needed

## ✅ Pre-Publish Checklist

- [ ] Update package name in `package.json`
- [ ] Update repository URL
- [ ] Add author information
- [ ] Create/update `LICENSE` file
- [ ] Review `.npmignore` to ensure sensitive files are excluded
- [ ] Run `npm run build` successfully
- [ ] Test package locally
- [ ] Update version number
- [ ] Review documentation (README.md, SDK.md)
- [ ] Login to npm (`npm login`)
- [ ] Publish (`npm publish`)

## 🎉 Next Steps

After publishing:

1. Create a GitHub release
2. Update documentation with installation instructions
3. Consider adding badges to README (npm version, license, etc.)
4. Share the package link with users

Example badges:
```markdown
[![npm version](https://badge.fury.io/js/@your-org%2Fcctp-wormhole-transfer.svg)](https://www.npmjs.com/package/@your-org/cctp-wormhole-transfer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
```

