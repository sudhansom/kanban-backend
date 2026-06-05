/**
 * Application entry point.
 *
 * Sets up Express, CORS, MongoDB, API routes, and global error handling.
 * Run with: npm run dev (development) or npm start (production build).
 */
import express, {
  type Request,
  type Response,
  type Application,
  type NextFunction,
} from "express";
import chalk from "chalk";
import "dotenv/config";
import mongoose from "mongoose";

import accountRoute from "./routes/account-routes.js";
import boardRoute from "./routes/board-routes.js";
import columnRoute from "./routes/column-routes.js";
import taskRoute from "./routes/task-routes.js";
import HttpError from "./http-error/http-error.js";
import { Board } from "./models/board.js";

const app: Application = express();

const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is missing. Add it to your .env file.");
}

app.use(express.json());
app.use(
  (
    err: SyntaxError & { status?: number; body?: unknown },
    _req: Request,
    _res: Response,
    next: NextFunction,
  ) => {
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
      return next(
        new HttpError(
          'Invalid JSON body. Send { "name": "To Do", "position": 1 } as JSON with Content-Type: application/json (no extra quotes).',
          400,
        ),
      );
    }
    return next(err);
  },
);
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (typeof req.body === "string" && req.body.trim().startsWith("{")) {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      return next(
        new HttpError(
          'Invalid JSON body. Send { "name": "To Do", "position": 1 } with Content-Type: application/json.',
          400,
        ),
      );
    }
  }
  return next();
});
app.use(express.urlencoded({ extended: true }));

/**
 * CORS middleware for the Angular app (localhost:4200).
 * Allows custom `userId` header from AuthInterceptor.
 * Answers OPTIONS preflight with 204 so browsers can call the API.
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, userId",
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  );

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

/**
 * GET /health — quick check that the server and database are up.
 * Does not require authentication.
 */
app.get("/health", (_req: Request, res: Response) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.status(dbReady ? 200 : 503).json({
    success: dbReady,
    data: {
      api: "ok",
      database: dbReady ? "connected" : "disconnected",
    },
  });
});

/**
 * Blocks /api/* when MongoDB is not connected yet.
 * Returns 503 with a clear message instead of hanging or crashing.
 */
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  if (mongoose.connection.readyState === 1) {
    return next();
  }
  res.status(503).json({
    success: false,
    error:
      "Database is not connected yet. Check MONGODB_URI in .env and that MongoDB is running.",
  });
});

app.use("/api/accounts", accountRoute);
app.use("/api/boards", boardRoute);
app.use("/api/columns", columnRoute);
app.use("/api/tasks", taskRoute);

/** Catch-all for unknown URLs → 404 HttpError. */
app.use((req: Request, res: Response, next: NextFunction) => {
  const error = new HttpError("Page not Found", 404);
  return next(error);
});

/**
 * Global error handler.
 * Controllers call `next(error)` with HttpError; this sends JSON to the client.
 */
app.use(
  (error: HttpError, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(error);
    }
    const status =
      typeof error.code === "number" ? error.code : Number(error.code) || 500;
    res.status(Number.isFinite(status) ? status : 500);
    res.json({
      success: false,
      error: error.message || "An unknown error occurred!",
    });
  },
);

/**
 * Starts the HTTP server first, then connects to MongoDB in the background.
 * If MongoDB fails, the server still runs so /health can report the problem.
 */
const startServer = async () => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      chalk.blue(`Server is running on http://localhost:${PORT}`),
    );
    console.log(chalk.gray(`Health check: http://localhost:${PORT}/health`));
  });

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log(chalk.green("Connected to MongoDB"));

    const boardCount = await Board.countDocuments();
    if (boardCount === 0) {
      console.log(chalk.cyanBright("No boards found. Run npm run seed"));
    } else {
      console.log(chalk.gray("boards already in database"));
    }
  } catch (error) {
    console.error(
      chalk.redBright(
        "MongoDB connection failed — API stays up but /api routes return 503 until DB connects.",
      ),
    );
    console.error(error);
    console.error(
      chalk.yellow(
        "Tips: start local MongoDB, or fix Atlas URI / IP whitelist / database name in .env",
      ),
    );
  }
};

void startServer();
