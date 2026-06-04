# Setup Guide

This guide walks through installing and running the Kanban API in development and production.

---

## Requirements

| Tool | Version |
|------|---------|
| Node.js | 18.x or later |
| npm | 9.x or later (bundled with Node) |
| MongoDB | 6.x local, or MongoDB Atlas |

---

## 1. Clone and Install

```bash
cd kanban-backend
npm install
```

---

## 2. Environment Configuration

Copy the example file:

```bash
cp .env.example .env
```

### Local MongoDB

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/kanban_db
JWT_SECRET=change-this-to-a-long-random-string
JWT_EXPIRES_IN=7d
```

Start MongoDB (macOS with Homebrew):

```bash
brew services start mongodb-community
```

### MongoDB Atlas

1. Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user and allow your IP in **Network Access**.
3. Copy the connection string and set the database name to **`kanban_db`**:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/kanban_db?retryWrites=true&w=majority
```

> Use a dedicated database (`kanban_db`) so seeding does not affect other applications (e.g. `cereal_db`).

---

## 3. Seed the Database

The seed script:

1. Connects using `MONGODB_URI`
2. **Drops every collection** in that database
3. Inserts accounts (bcrypt-hashed passwords) and boards from `data/data.json`

```bash
npm run seed
```

Expected output:

```
Connected to MongoDB
Clearing database...
Dropped collection: ...
Added account: demo
...
Seed completed — 4 accounts, 2 boards from data/data.json
```

### Customizing data

Edit `data/data.json`, then run `npm run seed` again.

---

## 4. Run the Server

### Development

```bash
npm run dev
```

- Compiles TypeScript in watch mode
- Restarts the server on file changes via nodemon + `tsx`
- Default URL: [http://localhost:3000](http://localhost:3000)

### Production

```bash
npm start
```

Runs `tsc` then `node dist/server.js`.

---

## 5. Verify Installation

```bash
# Health
curl http://localhost:3000/health

# Accounts list
curl http://localhost:3000/api/accounts

# Login
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"demo1234"}'
```

---

## Troubleshooting

### Connection refused (browser or curl)

The Node process is not listening. Run `npm run dev` and confirm no port conflict on `3000`.

### `database: disconnected` on `/health`

MongoDB is unreachable. Check:

- `MONGODB_URI` in `.env`
- Local MongoDB is running, or Atlas IP whitelist includes your machine
- Username/password in the URI are correct

### CORS errors from Angular

Ensure the API is running and allows the `userId` header. See [Frontend Integration](FRONTEND.md).

### `Invalid username or password` on POST login

Run `npm run seed` so accounts exist in MongoDB. Usernames are lowercase in the database (`demo`, not `Demo`).

### MongoDB Compass: connection refused on `localhost:27017`

Compass is pointing at local MongoDB while your app uses Atlas. Use the Atlas connection string in Compass, or install/start local MongoDB.

### Seed wiped unrelated data

`npm run seed` drops **all collections** in the database named in `MONGODB_URI`. Always use `kanban_db` for this project.

---

## Next Steps

- [API Reference](API.md) — endpoint details
- [Architecture](ARCHITECTURE.md) — code organization
- [Frontend Integration](FRONTEND.md) — connect the Angular app
