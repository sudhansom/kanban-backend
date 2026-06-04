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
import HttpError from "./http-error/http-error.js";
import { Board } from "./models/board.js";

const app: Application = express();

const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is missing. Add it to your .env file.");
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.use((req: Request, res: Response, next: NextFunction) => {
  const error = new HttpError("Page not Found", 404);
  return next(error);
});

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
