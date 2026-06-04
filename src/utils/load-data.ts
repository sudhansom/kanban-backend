import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "../../data/data.json");

export interface DataFileAccount {
  id: string;
  username: string;
  password_hash: string;
}

interface DataFile {
  accounts: DataFileAccount[];
  boards: unknown[];
}

export const loadDataFile = (): DataFile => {
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw) as DataFile;
};
