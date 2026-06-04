import chalk from "chalk";
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import { Account } from "../src/models/account.js";
import { Board } from "../src/models/board.js";

const MONGODB_URI = process.env.MONGODB_URI;

const seedAccounts = [
  { id: "1", username: "demo", password: "demo1234" },
  { id: "2", username: "lenny", password: "demo1234" },
  { id: "3", username: "lisa", password: "demo1234" },
];

const seedBoards = [
  {
    id: 1,
    name: "My Board",
    columns: [
      {
        id: 1,
        name: "To Do",
        position: 0,
        board_id: 1,
        tasks: [
          {
            id: 1,
            title: "Welcome Task",
            description: "Drag me to move",
            assignee: "",
            column_id: 1,
            position: 0,
          },
        ],
      },
      {
        id: 2,
        name: "In Progress",
        position: 1,
        board_id: 1,
        tasks: [
          {
            id: 2,
            title: "Build Kanban UI",
            description: "Connect frontend to this API",
            assignee: "lenny",
            column_id: 2,
            position: 0,
          },
        ],
      },
    ],
  },
];

const seed = async () => {
  if (!MONGODB_URI) {
    console.error(chalk.red("MONGODB_URI is missing in .env"));
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log(chalk.green("Connected to MongoDB"));

    if (process.env.NODE_ENV !== "production") {
      await Account.deleteMany({});
      await Board.deleteMany({});
      console.log(chalk.yellow("Cleared accounts and boards"));
    }

    for (const account of seedAccounts) {
      const passwordHash = await bcrypt.hash(account.password, 12);
      await Account.create({
        userId: account.id,
        username: account.username,
        passwordHash,
      });
      console.log(chalk.gray(`Added account: ${account.username}`));
    }

    for (const board of seedBoards) {
      await Board.create({
        boardId: board.id,
        name: board.name,
        columns: board.columns.map((col) => ({
          columnId: col.id,
          name: col.name,
          position: col.position,
          boardId: col.board_id,
          tasks: col.tasks.map((task) => ({
            taskId: task.id,
            title: task.title,
            description: task.description,
            assignee: task.assignee,
            columnId: task.column_id,
            position: task.position,
          })),
        })),
      });
      console.log(chalk.gray(`Added board: ${board.name}`));
    }

    console.log(chalk.cyanBright("Seed completed. Login with demo / demo1234"));
  } catch (error) {
    console.error(chalk.red("Seed failed"), error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

void seed();
