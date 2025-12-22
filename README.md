# bruno-api-typescript

> Automate API synchronization between Bruno and Frontend repositories using GitHub Apps

**[한국어 문서 (Korean Documentation)](./README.ko.md)**

This project automatically generates OpenAPI specs and React Query hooks from Bruno `.bru` files via GitHub Actions.

Backend developers write Bruno files, and the rest is automated - TypeScript types and hooks are generated in the frontend repository with automatic PR creation.

## How It Works

```mermaid
graph LR
    A[Backend: Edit Bruno files] --> B[GitHub Push]
    B --> C[GitHub Actions]
    C --> D[Generate OpenAPI]
    C --> E[Generate React Query Hooks]
    E --> F[Auto PR to Frontend]
```

## Setup

See [Korean Documentation](./README.ko.md) for detailed setup instructions.

## License

MIT
