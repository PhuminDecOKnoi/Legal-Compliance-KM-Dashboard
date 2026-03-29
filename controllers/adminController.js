const path = require('path');

const configService = require('../services/configService');
const workbookService = require('../services/workbookService');
const adminService = require('../services/adminService');
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

async function renderAdmin(res, req, view, extra = {}) {
  const locale = resolveLocale(extra.locale || req.query.lang);
  const context = await adminService.getAdminContext();
  return res.render(view, {
    pageTitle: extra.pageTitle || 'Admin',
    locale,
    t: translations[locale],
    url: buildUrl(req, locale),
    appData: context.appData,
    adminData: context,
    flash: extra.flash || null,
    currentPath: req.path
  });
}

exports.adminHome = async (req, res, next) => {
  try {
    await renderAdmin(res, req, 'pages/admin-index', {
      pageTitle: 'Admin Console',
      flash: req.query.message
        ? { type: req.query.type || 'success', message: req.query.message }
        : null
    });
  } catch (error) {
    next(error);
  }
};

exports.adminUploadPage = async (req, res, next) => {
  try {
    await renderAdmin(res, req, 'pages/admin-upload', {
      pageTitle: 'Admin Upload',
      flash: req.query.message
        ? { type: req.query.type || 'success', message: req.query.message }
        : null
    });
  } catch (error) {
    next(error);
  }
};

exports.handleUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      res.redirect(`/admin/upload?lang=${resolveLocale(req.query.lang)}&type=error&message=${encodeURIComponent('No file uploaded')}`);
      return;
    }
    const relative = configService.toProjectRelative(req.file.path);
    res.redirect(`/admin/preview?lang=${resolveLocale(req.query.lang)}&file=${encodeURIComponent(relative)}&type=success&message=${encodeURIComponent('Workbook uploaded successfully')}`);
  } catch (error) {
    next(error);
  }
};

exports.previewUpload = async (req, res, next) => {
  try {
    const locale = resolveLocale(req.query.lang);
    const file = req.query.file || configService.loadConfig().activeWorkbookPath;
    const preview = await workbookService.previewWorkbook(file);
    const context = await adminService.getAdminContext();
    res.render('pages/admin-preview', {
      pageTitle: 'Admin Preview',
      locale,
      t: translations[locale],
      url: buildUrl(req, locale),
      appData: context.appData,
      adminData: context,
      preview,
      targetFile: file,
      flash: req.query.message ? { type: req.query.type || 'success', message: req.query.message } : null,
      currentPath: req.path
    });
  } catch (error) {
    next(error);
  }
};

exports.applyWorkbook = async (req, res, next) => {
  try {
    const locale = resolveLocale(req.body.lang || req.query.lang);
    const targetFile = req.body.targetFile;
    await workbookService.setActiveWorkbook(targetFile);
    if (req.body.rebuildDocs) {
      adminService.rebuildStaticDocs();
    }
    res.redirect(`/admin?lang=${locale}&type=success&message=${encodeURIComponent('Workbook applied successfully')}`);
  } catch (error) {
    next(error);
  }
};

exports.adminConfigPage = async (req, res, next) => {
  try {
    await renderAdmin(res, req, 'pages/admin-config', {
      pageTitle: 'Admin Config',
      flash: req.query.message
        ? { type: req.query.type || 'success', message: req.query.message }
        : null
    });
  } catch (error) {
    next(error);
  }
};

exports.saveConfig = async (req, res, next) => {
  try {
    const currentConfig = configService.loadConfig();
    const nextConfig = adminService.buildConfigFromForm(req.body, currentConfig);
    configService.saveConfig(nextConfig);
    await workbookService.loadWorkbook(true);
    res.redirect(`/admin/config?lang=${resolveLocale(req.body.lang || req.query.lang)}&type=success&message=${encodeURIComponent('Configuration saved successfully')}`);
  } catch (error) {
    next(error);
  }
};

exports.rebuildDocs = async (req, res, next) => {
  try {
    adminService.rebuildStaticDocs();
    res.redirect(`/admin?lang=${resolveLocale(req.body.lang || req.query.lang)}&type=success&message=${encodeURIComponent('Static docs rebuilt successfully')}`);
  } catch (error) {
    next(error);
  }
};
