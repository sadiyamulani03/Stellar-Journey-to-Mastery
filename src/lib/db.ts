import fs from 'fs';
import path from 'path';

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  walletAddress?: string;
  createdAt: string;
}

interface DbFile {
  users: UserRecord[];
}

const dataDirectory = path.join(process.cwd(), 'data');
const dbFilePath = path.join(dataDirectory, 'users.json');

function ensureDbFile() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }
  if (!fs.existsSync(dbFilePath)) {
    fs.writeFileSync(dbFilePath, JSON.stringify({ users: [] }, null, 2), 'utf8');
  }
}

function readDb(): DbFile {
  ensureDbFile();
  const raw = fs.readFileSync(dbFilePath, 'utf8');
  return JSON.parse(raw) as DbFile;
}

function writeDb(data: DbFile) {
  ensureDbFile();
  fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf8');
}

export function getUsers(): UserRecord[] {
  return readDb().users;
}

export function getUserById(id: string): UserRecord | undefined {
  return getUsers().find((user) => user.id === id);
}

export function getUserByUsername(username: string): UserRecord | undefined {
  return getUsers().find((user) => user.username.toLowerCase() === username.toLowerCase());
}

export function createUser(username: string, passwordHash: string, walletAddress?: string): UserRecord {
  const normalized = username.trim().toLowerCase();
  const existing = getUserByUsername(normalized);
  if (existing) {
    throw new Error('Username already exists.');
  }

  const newUser: UserRecord = {
    id: crypto.randomUUID(),
    username: normalized,
    passwordHash,
    walletAddress: walletAddress?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  const db = readDb();
  db.users.push(newUser);
  writeDb(db);
  return newUser;
}
