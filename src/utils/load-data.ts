import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "../../data/data.json");

/** Account row as it appears in data/data.json (plain `password_hash` for the Angular UI). */
export interface DataFileAccount {
  id: string;
  username: string;
  password_hash: string;
}

/** Full contents of data/data.json. */
interface DataFile {
  accounts: DataFileAccount[];
  boards: unknown[];
}

/**
 * Reads and parses `data/data.json` from disk.
 * Used by GET /api/accounts so the login screen matches the seed file.
 *
 * @returns Parsed JSON with `accounts` and `boards` arrays
 */
export const loadDataFile = (): DataFile => {
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw) as DataFile;
};
