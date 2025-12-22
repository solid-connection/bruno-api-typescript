# bruno-api-typescript

> **Generate OpenAPI specs from Bruno .bru files**

Convert your Bruno API collections to OpenAPI 3.0 specifications with automatic change detection and changelog generation.

**[한국어 문서 (Korean)](./README.ko.md)** | **[📝 Bruno Guide](./docs/bruno-guide.md)**

## Key Message

**Almost no changes required!** Use your existing Bruno file format. Just make sure to include the response JSON in the `docs` block accurately.

## Installation

```bash
npm install -D bruno-api-typescript
```

## Quick Start

### 1. Write Bruno File

Write as usual, but **include response JSON in the `docs` block**:

```bru
meta {
  name: Get User Profile
  type: http
}

get /users/profile

headers {
  Authorization: Bearer {{token}}
}

docs {
  ```json
  {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  }
  ```
}
```

### 2. Generate OpenAPI

```bash
# Generate OpenAPI spec
npx bruno-api generate -i ./bruno -o ./openapi.json

# Detect changes
npx bruno-api generate --diff

# Generate changelog
npx bruno-api generate --diff --changelog CHANGELOG.md
```

### package.json Scripts

```json
{
  "scripts": {
    "api:generate": "bruno-api generate -i ./bruno -o ./openapi.json",
    "api:diff": "bruno-api generate --diff",
    "api:changelog": "bruno-api generate --diff --changelog CHANGELOG.md"
  }
}
```

## Backend Developer Workflow

```bash
# 1. Write/Edit Bruno file (docs block required!)
vim bruno/applications/get-competitors.bru

# 2. Check changes
npm run api:diff

# 3. Generate changelog
npm run api:changelog

# 4. Commit
git add bruno/ CHANGELOG.md openapi.json
git commit -m "feat: add competitors API"
git push
```

That's it! Frontend team can automatically track changes.

## Project Structure

```
bruno/
├── applications [applications]/  # Korean name [EnglishKey] format
│   ├── get-competitors.bru
│   └── create-application.bru
├── users [users]/
│   └── get-profile.bru
└── bruno.json
```

**Note**: Folder names support `한글명 [EnglishKey]` format, only the `EnglishKey` inside brackets is used.

## Essential Rules

### The `docs` block is everything

The JSON in the `docs` block automatically generates types and schemas.

**Correct example:**
```bru
docs {
  ```json
  {
    "id": 1,
    "username": "johndoe",
    "createdAt": "2025-01-01T00:00:00Z"
  }
  ```
}
```

**Important:**
- ✅ Use valid JSON format only
- ✅ Include all fields (including optional ones)
- ✅ Clear types (strings with `"..."`, numbers without quotes)
- ✅ Arrays must have at least 1 element
- ✅ Dates in ISO 8601 format

See [Bruno Guide](./docs/bruno-guide.md) for details.

## Change Detection

### Breaking Changes

The following changes are considered **Breaking**:
- Endpoint removed
- Field removed from response
- Field type changed (e.g., `number` → `string`)

### Safe Changes

The following are **Minor** changes:
- New endpoint added
- New field added to response

## CLI Options

```
bruno-api generate [options]

Options:
  -i, --input <path>        Bruno collection directory (default: "./bruno")
  -o, --output <path>        Output OpenAPI file (default: "./openapi.json")
  --title <title>           API title (default: "API Documentation")
  --version <version>       API version (default: "1.0.0")
  --base-url <url>          API Base URL

Change Tracking:
  --diff                    Detect changes from previous version
  --changelog <path>        Generate changelog file
  --changelog-format <format> Format: markdown | json | html (default: "markdown")
  --breaking-only           Show only breaking changes
```

## Features

- **Bruno → OpenAPI**: Automatic conversion from .bru files to OpenAPI 3.0
- **Change Detection**: Automatically detect API changes between versions
- **Breaking Changes**: Identify breaking changes that could affect consumers
- **Changelog Generation**: Create changelogs in Markdown, JSON, or HTML
- **Domain Grouping**: Organize endpoints by domain/folder structure

## Additional Documentation

### Getting Started
- **[Quick Start](./docs/quickstart.md)** - 5-minute guide
- **[What's New?](./docs/whats-new.md)** - For existing Bruno users

### Writing Bruno Files
- **[Bruno Tutorial](./docs/bruno-tutorial.md)** - Step-by-step guide (beginners)
- **[Bruno Guide](./docs/bruno-guide.md)** - Reference (advanced)

### Automation (Optional)
- **[GitHub Apps Setup (5min)](./docs/github-apps-simple.md)** - Auto-sync Bruno ↔ Frontend

## License

MIT

---

**bruno-api-typescript v0.3.0** - Better API collaboration
