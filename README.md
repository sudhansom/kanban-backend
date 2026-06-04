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
| `npm run seed` | Load demo users and boards |

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

## Demo users

| username | password |
|----------|----------|
| demo     | demo1234 |
| lenny    | demo1234 |
| lisa     | demo1234 |
