# API Reference

Base URL (development): `http://localhost:3000` or `http://127.0.0.1:3000`

All API routes under `/api` require an active MongoDB connection. If the database is disconnected, `/api/*` returns **503**.

---

## Response Conventions

### Envelope (most endpoints)

```json
{
  "success": true,
  "data": { }
}
```

```json
{
  "success": false,
  "error": "Human-readable message"
}
```

### Exception: `GET /api/accounts`

Returns a **raw JSON array** (no envelope) to match the Angular `User[]` type.

---

## Authentication

Protected routes expect:

```http
Authorization: Bearer <jwt_token>
```

Obtain a token via `POST /api/accounts` (login). Tokens are signed with `JWT_SECRET` and expire per `JWT_EXPIRES_IN`.

---

## Endpoints

### Health Check

#### `GET /health`

No authentication required.

**Response `200`** — database connected:

```json
{
  "success": true,
  "data": {
    "api": "ok",
    "database": "connected"
  }
}
```

**Response `503`** — database disconnected:

```json
{
  "success": false,
  "data": {
    "api": "ok",
    "database": "disconnected"
  }
}
```

---

### Accounts

#### `GET /api/accounts`

List all accounts for the frontend login screen. **No authentication required.**

**Response `200`** — `application/json` array:

```json
[
  {
    "id": "1",
    "username": "demo",
    "password_hash": "demo1234"
  },
  {
    "id": "2",
    "username": "guest",
    "password_hash": "guest"
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Account identifier |
| `username` | string | Login name |
| `password_hash` | string | Plain-text password for client-side comparison (dev/demo only) |

> **Note:** Data is read from `data/data.json`. Passwords in MongoDB are stored with bcrypt for `POST` login; this endpoint exposes plain values from the seed file for Angular compatibility.

---

#### `POST /api/accounts`

Authenticate with username and password. **No authentication required.**

**Request body:**

```json
{
  "username": "demo",
  "password": "demo1234"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | Yes | Case-insensitive; stored lowercase in DB |
| `password` | string | Yes | Compared against bcrypt hash in MongoDB |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "userId": "1",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response `401`:**

```json
{
  "success": false,
  "error": "Invalid username or password"
}
```

**Example (curl):**

```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"demo1234"}'
```

---

### Boards

#### `GET /api/boards`

Returns all boards with nested columns and tasks. **Requires JWT.**

**Headers:**

```http
Authorization: Bearer <token>
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "boards": [
      {
        "id": 1,
        "name": "My Board",
        "columns": [
          {
            "id": 1,
            "name": "To Do",
            "position": 0,
            "board_id": 1,
            "tasks": [
              {
                "id": 1,
                "title": "Welcome Task",
                "description": "Drag me to move",
                "assignee": "",
                "column_id": 1,
                "position": 0
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Response `401`:**

```json
{
  "success": false,
  "error": "Invalid or missing token"
}
```

**Example (curl):**

```bash
TOKEN="<your-jwt>"
curl http://localhost:3000/api/boards \
  -H "Authorization: Bearer $TOKEN"
```

---

## HTTP Status Codes

| Code | Usage |
|------|--------|
| `200` | Success |
| `204` | CORS preflight (`OPTIONS`) |
| `401` | Invalid credentials or missing/invalid JWT |
| `404` | Route not found |
| `500` | Unhandled server error |
| `503` | Database not connected |

---

## CORS

The API allows cross-origin requests from any origin (`*`) with these headers:

- `Content-Type`
- `Authorization`
- `userId` (custom header used by the Angular interceptor)

Preflight `OPTIONS` requests receive **204 No Content**.

---

## Error Handling

Unhandled routes:

```json
{
  "success": false,
  "error": "Page not Found"
}
```

Status **404**.
