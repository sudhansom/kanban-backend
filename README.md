# Kanban API

A TypeScript REST API for a multi-board Kanban application. Built with **Express 5**, **MongoDB**, and **JWT** authentication, following a layered architecture inspired by [cereal-backend](../cerealizer/cereal-backend).

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [API Overview](#api-overview)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Environment Variables](#environment-variables)
- [License](#license)

---

## Features

| Capability | Description |
|------------|-------------|
| **Accounts** | List accounts for client-side login; JWT-based login endpoint for protected routes |
| **Boards** | Embedded columns and tasks in a single document per board |
| **Seeding** | Import from `data/data.json`; clears the target database before insert |
| **CORS** | Configured for Angular dev server (`localhost:4200`) with `userId` custom header |
| **Health check** | `GET /health` reports API and database connectivity |

---

## Quick Start

### Prerequisites

- **Node.js** 18 or later
- **MongoDB** 6+ (local install or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))

### Installation

```bash
git clone <repository-url>
cd kanban-backend
npm install
cp .env.example .env
```

Edit `.env` and set `MONGODB_URI` (use database name **`kanban_db`**):

```env
MONGODB_URI=mongodb://localhost:27017/kanban_db
JWT_SECRET=your-super-secret-jwt-key-at-least-16-chars
```

### Run

```bash
npm run seed    # load data/data.json into MongoDB
npm run dev     # development server on http://localhost:3000
```

Verify:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/accounts
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Setup Guide](docs/SETUP.md) | Local MongoDB, Atlas, environment, seeding |
| [API Reference](docs/API.md) | Endpoints, request/response schemas, status codes |
| [Architecture](docs/ARCHITECTURE.md) | Layers, data model, authentication flows |
| [Frontend Integration](docs/FRONTEND.md) | Angular client configuration and headers |

---

## API Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | No | Service and database status |
| `GET` | `/api/accounts` | No | List accounts (for Angular login UI) |
| `POST` | `/api/accounts` | No | Login; returns JWT |
| `GET` | `/api/boards` | Bearer JWT | All boards with columns and tasks |

See [API Reference](docs/API.md) for full details and examples.

---

## Project Structure

```
kanban-backend/
├── data/
│   └── data.json           # Source of truth for seed + GET /api/accounts
├── docs/                   # Documentation
├── scripts/
│   └── seed.ts             # Database seed script
├── src/
│   ├── server.ts           # Application entry point
│   ├── controllers/        # Request handlers
│   ├── routes/             # Express routers
│   ├── models/             # Mongoose schemas
│   ├── middleware/         # JWT authentication
│   ├── http-error/         # Custom error type
│   └── utils/              # Shared helpers
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | TypeScript watch + nodemon with `tsx` (development) |
| `npm start` | Compile with `tsc` and run `dist/server.js` (production) |
| `npm run seed` | Drop all collections in `MONGODB_URI` DB, then seed from `data/data.json` |
| `npm run watch` | TypeScript compiler in watch mode only |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | HTTP server port |
| `MONGODB_URI` | Yes | — | MongoDB connection string (use `kanban_db`) |
| `JWT_SECRET` | No* | `do-not-share` | Secret for signing JWTs (*set in production) |
| `JWT_EXPIRES_IN` | No | `7d` | Token lifetime (e.g. `1h`, `7d`) |

---

## Demo Accounts

After seeding, these accounts are available (see `data/data.json`):

| Username | Password | Role (app logic) |
|----------|----------|------------------|
| `demo` | `demo1234` | Standard user |
| `guest` | `guest` | Read-only style user |
| `manager` | `manager` | Manager |
| `admin` | `admin` | Administrator |

---

## License

ISC
