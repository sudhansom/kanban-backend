# Testing (Jest)

Controller unit tests live under `tests/unit/controllers/`. Dependencies (Mongoose models, bcrypt, JWT, file loader) are mocked — no database required.

## Commands

```bash
npm test              # run all tests once
npm run test:watch    # watch mode
npm run test:coverage # coverage for src/controllers/
```

## Structure

```
tests/
  helpers/
    mock-express.ts       # mock req, res, next
  unit/
    controllers/
      account-controller.test.ts
      board-controller.test.ts
```

## Branch

This setup uses **Jest** with `ts-jest` (ESM). See branch `vitest` for the Vitest equivalent.
