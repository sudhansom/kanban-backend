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

const PORT = process.env.PORT || 3000;
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
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  );
  next();
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
  try {
    await mongoose.connect(MONGODB_URI, {
      family: 4,
      serverSelectionTimeoutMS: 5000,
    });

    console.log(chalk.green("Connected to MongoDB"));

    const boardCount = await Board.countDocuments();
    if (boardCount === 0) {
      console.log(chalk.cyanBright("No boards found. Run npm run seed"));
    } else {
      console.log(chalk.gray("boards already in database"));
    }

    app.listen(PORT, () => {
      console.log(chalk.blue(`Server is running on http://localhost:${PORT}`));
    });
  } catch (error) {
    console.error(chalk.redBright("MongoDB connection failed."));
    console.error(error);
    process.exit(1);
  }
};

void startServer();
