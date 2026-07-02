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

// In-memory fallback database for serverless environments where disk writing is prohibited
let memoryUsers: UserRecord[] = [];
let useMemoryDb = false;

// Determine path (use /tmp in serverless environments to avoid read-only filesystem errors)
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.LAMBDA_TASK_ROOT;
const dataDirectory = isServerless ? '/tmp' : path.join(process.cwd(), 'data');
const dbFilePath = path.join(dataDirectory, 'users.json');

function ensureDbFile() {
  if (useMemoryDb) return;
  try {
    if (!fs.existsSync(dataDirectory)) {
      fs.mkdirSync(dataDirectory, { recursive: true });
    }
    if (!fs.existsSync(dbFilePath)) {
      fs.writeFileSync(dbFilePath, JSON.stringify({ users: [] }, null, 2), 'utf8');
    }
  } catch (error) {
    console.warn('Failed to initialize file-based DB, falling back to in-memory database:', error);
    useMemoryDb = true;
  }
}

function readDb(): DbFile {
  ensureDbFile();
  if (useMemoryDb) {
    return { users: memoryUsers };
  }
  try {
    const raw = fs.readFileSync(dbFilePath, 'utf8');
    return JSON.parse(raw) as DbFile;
  } catch (error) {
    console.warn('Failed to read file-based DB, falling back to in-memory database:', error);
    useMemoryDb = true;
    return { users: memoryUsers };
  }
}

function writeDb(data: DbFile) {
  if (useMemoryDb) {
    memoryUsers = data.users;
    return;
  }
  try {
    ensureDbFile();
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.warn('Failed to write to file-based DB, falling back to in-memory database:', error);
    useMemoryDb = true;
    memoryUsers = data.users;
  }
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
