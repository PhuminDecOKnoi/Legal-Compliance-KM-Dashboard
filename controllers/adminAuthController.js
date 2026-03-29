const workbookService = require('../services/workbookService');
const authService = require('../services/authService');
const { translations, resolveLocale } = require('../utils/i18n');

function buildUrl(req, locale) {
  return {
    staticMode: false,
    asset: (assetPath) => `/public/${assetPath}`,
    route: (pagePath, lang = locale) => `${pagePath}?lang=${lang}`,
    langSwitch: {
      en: `${req.path}?lang=en`,
      th: `${req.path}?lang=th`
    }
  };
}

exports.loginPage = (req, res) => {
  const locale = resolveLocale(req.query.lang);
  res.render('pages/admin-login', {
    pageTitle: 'Admin Login',
    locale,
    t: translations[locale],
    url: buildUrl(req, locale),
    appData: workbookService.getAppDataSafe(),
    flash: req.query.message ? { type: req.query.type || 'error', message: req.query.message } : null,
    currentPath: req.path
  });
};

exports.login = (req, res) => {
  const locale = resolveLocale(req.body.lang || req.query.lang);
  const user = authService.validateCredentials(req.body.username, req.body.password);
  if (!user) {
    res.redirect(`/admin/login?lang=${locale}&type=error&message=${encodeURIComponent('Invalid username or password')}`);
    return;
  }

  const token = authService.createSessionToken(user);
  res.setHeader('Set-Cookie', authService.serializeCookie(token));
  res.redirect(`/admin?lang=${locale}`);
};

exports.logout = (req, res) => {
  const locale = resolveLocale(req.body.lang || req.query.lang);
  res.setHeader('Set-Cookie', authService.clearCookie());
  res.redirect(`/admin/login?lang=${locale}&type=success&message=${encodeURIComponent('Signed out successfully')}`);
};
