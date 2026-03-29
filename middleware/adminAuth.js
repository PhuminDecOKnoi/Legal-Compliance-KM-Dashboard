const authService = require('../services/authService');
const { resolveLocale } = require('../utils/i18n');

function parseCookies(cookieHeader) {
  return String(cookieHeader || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const idx = part.indexOf('=');
      if (idx === -1) return acc;
      const key = part.slice(0, idx);
      const value = decodeURIComponent(part.slice(idx + 1));
      acc[key] = value;
      return acc;
    }, {});
}

function attachAdminUser(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  req.cookies = cookies;
  const session = authService.verifySessionToken(cookies[authService.COOKIE_NAME]);
  req.adminUser = session || null;
  res.locals.adminUser = req.adminUser;
  next();
}

function requireAdminSession(req, res, next) {
  if (req.adminUser) {
    next();
    return;
  }
  const locale = resolveLocale(req.query.lang);
  res.redirect(`/admin/login?lang=${locale}`);
}

module.exports = {
  attachAdminUser,
  requireAdminSession
};
