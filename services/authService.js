const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();
const USERS_PATH = path.join(ROOT, 'config', 'admin-users.json');
const COOKIE_NAME = 'admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'legal-dashboard-admin-session-secret';

const DEFAULT_USERS = {
  users: [
    {
      username: 'root',
      password: '1234',
      role: 'super_user',
      displayName: 'Root'
    }
  ]
};

function ensureUsersFile() {
  fs.mkdirSync(path.dirname(USERS_PATH), { recursive: true });
  if (!fs.existsSync(USERS_PATH)) {
    fs.writeFileSync(USERS_PATH, JSON.stringify(DEFAULT_USERS, null, 2));
  }
}

function loadUsers() {
  ensureUsersFile();
  const parsed = JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
  return parsed.users || [];
}

function getUser(username) {
  return loadUsers().find((user) => user.username === username) || null;
}

function validateCredentials(username, password) {
  const user = getUser(username);
  if (!user) return null;
  if (user.password !== password) return null;
  return user;
}

function sign(value) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
}

function createSessionToken(user) {
  const payload = JSON.stringify({
    username: user.username,
    role: user.role,
    displayName: user.displayName,
    exp: Date.now() + SESSION_TTL_MS
  });
  const encoded = Buffer.from(payload, 'utf8').toString('base64url');
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || !token.includes('.')) return null;
  const [encoded, signature] = token.split('.');
  if (sign(encoded) !== signature) return null;
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (!payload.exp || payload.exp < Date.now()) return null;
  return payload;
}

function serializeCookie(token) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax`;
}

function clearCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

module.exports = {
  loadUsers,
  validateCredentials,
  createSessionToken,
  verifySessionToken,
  serializeCookie,
  clearCookie,
  COOKIE_NAME,
  USERS_PATH
};
