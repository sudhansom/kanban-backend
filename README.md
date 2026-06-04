# Kanban API

Express + TypeScript + MongoDB backend for the Kanban board app.  
Structured the same way as [cereal-backend](../cerealizer/cereal-backend).

## Setup

```bash
npm install
cp .env.example .env
# edit .env — set MONGODB_URI
npm run seed
npm run dev
```

## Scripts

| Command | What it does |
|---------|----------------|
| `npm run dev` | Watch TypeScript + run server with nodemon |
| `npm start` | Build and run production server |
| `npm run seed` | Clear DB and load `data/data.json` (accounts + boards only) |

## API

### Login

```http
POST /api/accounts
Content-Type: application/json

{ "username": "demo", "password": "demo1234" }
```

Response:

```json
{
  "success": true,
  "data": { "userId": "1", "token": "..." }
}
```

### Get boards (needs token)

```http
GET /api/boards
Authorization: Bearer <token>
```

## Project layout

```
src/
  server.ts              # app entry, DB, CORS, errors
  routes/                # account-routes, board-routes
  controllers/           # login + get boards
  models/                # mongoose schemas
  middleware/            # check-auth (JWT)
  http-error/            # HttpError class
scripts/
  seed.ts                # npm run seed
```

## Troubleshooting

**"Connection was refused"** when calling the API usually means the Node server is not running. Start it with `npm run dev`.

If the server is running but API calls fail, open `http://localhost:3000/health`:
- `database: connected` — MongoDB is fine
- `database: disconnected` — fix `MONGODB_URI` in `.env` (local MongoDB on `27017`, or your Atlas URI). Then run `npm run seed`.

**MongoDB Compass "connection refused"** on `localhost:27017` means local MongoDB is not installed/running. This project can use Atlas instead — put that URI in `.env`, not Compass localhost.

Use database name `kanban_db` in your URI (or run seed against whichever DB name you use).

## Seed data

Edit `data/data.json`, then run `npm run seed`. This **drops every collection** in the database configured by `MONGODB_URI`, then inserts only kanban **accounts** and **boards** (no users/cereals).

| username | password |
|----------|----------|
| demo     | demo1234 |
| guest    | guest    |
| manager  | manager  |
| admin    | admin    |
