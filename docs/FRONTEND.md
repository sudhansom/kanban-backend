# Frontend Integration

Guide for connecting the **Angular Kanban** frontend (`kanbanjo/kanban/frontend`) to this API.

---

## Base URL

In `src/app/services/tasks.ts`:

```typescript
const BASE_URL = 'http://127.0.0.1:3000/api';
```

Use `127.0.0.1` or `localhost` consistently. The API listens on `0.0.0.0:3000`.

---

## Endpoints Used by the Frontend

| Frontend method | HTTP | Path | Auth |
|-----------------|------|------|------|
| `getUsers()` | `GET` | `/accounts` | None |
| `getBoards()` | `GET` | `/boards` | Bearer JWT* |
| Login in `app.ts` | `GET` | `/accounts` | None (client-side password check) |

\* Ensure the frontend sends `Authorization: Bearer <token>` when calling `/boards` if JWT protection is enabled.

---

## CORS and Custom Headers

The Angular `AuthInterceptor` adds a custom header:

```typescript
setHeaders: {
  userId: userId,  // from localStorage
}
```

The API allows this via:

```http
Access-Control-Allow-Headers: ..., userId
```

If you add more custom headers, update `src/server.ts` CORS configuration.

---

## User Type Alignment

Frontend `User` interface (`models/types.ts`):

```typescript
export interface User {
  id: string;
  username: string;
  password_hash: string;
}
```

`GET /api/accounts` returns exactly this shape as a **JSON array** (not wrapped in `{ success, data }`).

---

## Login Flow (Current App)

1. User submits username/password in `app.ts`
2. `Tasks.getUsers()` fetches `GET /api/accounts`
3. App loops users and compares `username` and `password_hash` locally
4. On match, stores `userId` in `localStorage` and calls `setUser(user)`

```typescript
this.taskService.getUsers().subscribe((res) => {
  res.forEach((user) => {
    if (user.username === this.username && this.password === user.password_hash) {
      localStorage.setItem('userId', user.id.toString());
      this.taskService.setUser(user);
      this.login.set(true);
    }
  });
});
```

---

## Optional: JWT Login Flow

For server-verified login, use `POST /api/accounts`:

```typescript
this.http.post<{ success: boolean; data: { userId: string; token: string } }>(
  `${BASE_URL}/accounts`,
  { username, password }
).subscribe((res) => {
  if (res.success) {
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('userId', res.data.userId);
  }
});
```

Then attach the token for boards:

```typescript
this.http.get(`${BASE_URL}/boards`, {
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});
```

---

## Running Both Apps

**Terminal 1 — API:**

```bash
cd kanban-backend
npm run seed
npm run dev
```

**Terminal 2 — Angular:**

```bash
cd kanbanjo/kanban/frontend
ng serve
# http://localhost:4200
```

---

## Common Issues

| Symptom | Cause | Fix |
|---------|--------|-----|
| CORS blocked `userId` header | Header not in Allow-Headers | Pull latest API; restart server |
| 401 on `GET /api/accounts` | Old code required JWT | Use current API (public GET) |
| Empty boards | Not logged in / no JWT | Seed DB; login; send Bearer token |
| Connection refused | API not running | `npm run dev` |
| Login never succeeds | Seed not run or wrong password | `npm run seed`; use `demo` / `demo1234` |

---

## Related Documentation

- [API Reference](API.md)
- [Setup Guide](SETUP.md)
