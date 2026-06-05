/**
 * Database seed script — run with: npm run seed
 *
 * 1. Connects to MongoDB (MONGODB_URI from .env)
 * 2. Drops every collection in that database
 * 3. Inserts accounts and boards from data/data.json
 */
import chalk from "chalk";
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import { Account } from "../src/models/account.js";
import { Board } from "../src/models/board.js";
import { Column } from "../src/models/column.js";
import { Task } from "../src/models/task.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "../data/data.json");

const MONGODB_URI = process.env.MONGODB_URI;

/** Account row in data/data.json (plain password before hashing). */
interface SeedAccount {
  id: string;
  username: string;
  password_hash: string;
}

interface SeedTask {
  id: number;
  title: string;
  description: string;
  assignee: string;
  column_id: number;
  position: number;
}

interface SeedColumn {
  id: number;
  name: string;
  position: number;
  board_id: number;
  tasks: SeedTask[];
}

interface SeedBoard {
  id: number;
  name: string;
  columns: SeedColumn[];
}

interface SeedData {
  accounts: SeedAccount[];
  boards: SeedBoard[];
}

/** Reads data/data.json from the project root. */
const loadSeedData = (): SeedData => {
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw) as SeedData;
};

/**
 * Removes all collections in the current database.
 * Ensures no leftover users/cereals from other projects remain.
 */
const clearDatabase = async (): Promise<void> => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection is not ready");
  }

  const existing = await db.listCollections().toArray();

  for (const { name } of existing) {
    await db.dropCollection(name);
    console.log(chalk.yellow(`Dropped collection: ${name}`));
  }
};

/** Main seed routine: clear DB, then insert accounts/boards/columns/tasks. */
const seed = async () => {
  if (!MONGODB_URI) {
    console.error(chalk.red("MONGODB_URI is missing in .env"));
    process.exit(1);
  }

  const data = loadSeedData();

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    console.log(chalk.green("Connected to MongoDB"));

    console.log(chalk.cyanBright("Clearing database..."));
    await clearDatabase();

    for (const account of data.accounts) {
      const passwordHash = await bcrypt.hash(account.password_hash, 12);
      await Account.create({
        userId: account.id,
        username: account.username.toLowerCase(),
        passwordHash,
      });
      console.log(chalk.gray(`Added account: ${account.username}`));
    }

    for (const board of data.boards) {
      await Board.create({
        boardId: board.id,
        name: board.name,
      });
      console.log(chalk.gray(`Added board: ${board.name}`));
    }

    for (const board of data.boards) {
      for (const column of board.columns) {
        await Column.create({
          columnId: column.id,
          name: column.name,
          position: column.position,
          boardId: column.board_id,
        });

        for (const task of column.tasks) {
          await Task.create({
            taskId: task.id,
            title: task.title,
            description: task.description,
            assignee: task.assignee,
            columnId: task.column_id,
            position: task.position,
          });
        }
      }
    }

    console.log(
      chalk.green(
        `Seed completed — ${data.accounts.length} accounts, ${data.boards.length} boards from data/data.json`,
      ),
    );
  } catch (error) {
    console.error(chalk.red("Seed failed"), error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

void seed();
