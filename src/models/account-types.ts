/**
 * Shape of an account document stored in MongoDB.
 * Passwords are saved as bcrypt hashes (`passwordHash`), not plain text.
 */
export interface IAccount {
  /** Public account id (matches `id` in data/data.json). */
  userId: string;
  /** Unique login name, stored lowercase. */
  username: string;
  /** bcrypt hash of the user's password. */
  passwordHash: string;
}
