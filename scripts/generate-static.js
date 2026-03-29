const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const workbookService = require('../services/workbookService');
const { buildExecutiveNarrative, buildRecommendations } = require('../services/insightService');
const i18n = require('../utils/i18n');

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, 'docs');
const BASE_PATH = '/Legal-Compliance-KM-Dashboard';

function buildUrlHelpers({ locale, currentPath, staticMode }) {
  const basePath = BASE_PATH.replace(/\/$/, '');
  const localePrefix = (lang) => (lang === 'th' ? '/th' : '');

  return {
    staticMode,
    currentPath,
    asset: (assetPath) => `${basePath}/public/${assetPath}`.replace(/\/+/g, '/'),
    route: (pagePath, lang = locale) => {
      if (!staticMode) {
        return `${pagePath}?lang=${lang}`;
      }
      const clean = pagePath === '/' ? '/dashboard' : pagePath;
      return `${basePath}${localePrefix(lang)}${clean}/`.replace(/\/+/g, '/');
    },
    langSwitch: {
      en: `${basePath}${currentPath}/`.replace(/\/+/g, '/'),
      th: `${basePath}/th${currentPath}/`.replace(/\/+/g, '/')
    }
  };
}

function buildViewModel(appData, locale) {
  return {
    topExposureCategory: i18n.localizeCategory(appData.kpis.topExposureCategory, locale),
    categoryChartData: appData.categorySummary.map((item) => ({
      label: i18n.localizeCategory(item.category, locale),
      shortLabel: i18n.localizeCategory(item.category, locale),
      count: item.count
    })),
    categoryPendingChartData: appData.categorySummary.map((item) => ({
      label: i18n.localizeCategory(item.category, locale),
      shortLabel: i18n.localizeCategory(item.category, locale),
      count: item.activePending || item.count
    })),
    monthlyTrendChartData: appData.trendSummary.monthly.map((item) => ({
      label: item.label,
      shortLabel: i18n.shortenTrendLabel(item.label),
      count: item.count
    })),
    yearlyTrendChartData: appData.trendSummary.yearly.map((item) => ({
      label: item.label,
      shortLabel: item.label,
      count: item.count
    })),
    trendNotes: i18n.buildTrendNotes(locale),
    dataQualityWarnings: i18n.buildDataQualityWarnings(appData.dataQuality, locale),
    workbookMapping: appData.workbookMapping.map((item) => ({
      ...item,
      moduleLocalized: i18n.localizeWorkbookModule(item.module, locale),
      notesLocalized:
        item.notes.startsWith('Source of truth for')
          ? locale === 'th'
            ? `เป็นแหล่งข้อมูลหลักสำหรับ ${appData.meta.recordCount} แถวรายละเอียด`
            : item.notes
          : i18n.localizeWorkbookNote(item.notes, locale)
    })),
    workbookGuideRows: (appData.rawSheets.Workbook_Guide || []).slice(0, 8).map((row) => ({
      label: i18n.localizeGuideLabel(row[0], locale) || row[0],
      value: row[1] || ''
    }))
  };
}

function buildPayload({ appData, locale, currentPath, pageTitle }) {
  return {
    pageTitle,
    locale,
    t: i18n.translations[locale],
    ui: {
      localizeCategory: (value) => i18n.localizeCategory(value, locale),
      localizeStatus: (value) => i18n.localizeStatus(value, locale),
      localizeValidity: (value) => i18n.localizeValidity(value, locale),
      localizeNote: (value) => i18n.localizeNote(value, locale),
      shortenTrendLabel: i18n.shortenTrendLabel
    },
    url: buildUrlHelpers({ locale, currentPath, staticMode: true }),
    appData,
    insights: {
      narrative: buildExecutiveNarrative(appData, locale),
      recommendations: buildRecommendations(appData, locale)
    },
    viewModel: buildViewModel(appData, locale),
    filters: {},
    query: {},
    currentPath
  };
}

async function renderPage({ appData, locale, currentPath, view, outputFile, pageTitle }) {
  const payload = buildPayload({ appData, locale, currentPath, pageTitle });
  const html = await new Promise((resolve, reject) => {
    ejs.renderFile(path.join(ROOT, view), payload, {}, (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(result);
    });
  });
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, html);
}

async function main() {
  const appData = await workbookService.loadWorkbook(true);
  fs.rmSync(DOCS_DIR, { recursive: true, force: true });
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  fs.cpSync(path.join(ROOT, 'public'), path.join(DOCS_DIR, 'public'), { recursive: true });
  fs.writeFileSync(path.join(DOCS_DIR, '.nojekyll'), '');

  const pages = [
    { currentPath: '/dashboard', view: 'views/pages/dashboard.ejs', pageTitle: 'Dashboard' },
    { currentPath: '/dashboard/executive', view: 'views/pages/executive.ejs', pageTitle: 'Executive View' },
    { currentPath: '/dashboard/employee', view: 'views/pages/employee.ejs', pageTitle: 'Employee View' },
    { currentPath: '/admin', view: 'views/pages/admin-static.ejs', pageTitle: 'Admin' },
    { currentPath: '/legal-register', view: 'views/pages/legal-register.ejs', pageTitle: 'Legal Register' },
    { currentPath: '/backlog', view: 'views/pages/backlog.ejs', pageTitle: 'Action Backlog' },
    { currentPath: '/category-summary', view: 'views/pages/category-summary.ejs', pageTitle: 'Category Summary' },
    { currentPath: '/trend-summary', view: 'views/pages/trend-summary.ejs', pageTitle: 'Trend Summary' },
    { currentPath: '/data-quality', view: 'views/pages/data-quality.ejs', pageTitle: 'Data Quality' },
    { currentPath: '/about-report', view: 'views/pages/about-report.ejs', pageTitle: 'About Report' },
    { currentPath: '/print/executive', view: 'views/pages/print-executive.ejs', pageTitle: 'Executive Print' },
    { currentPath: '/print/employee', view: 'views/pages/print-employee.ejs', pageTitle: 'Employee Print' }
  ];

  for (const locale of ['en', 'th']) {
    for (const page of pages) {
      const localeDir = locale === 'th' ? path.join(DOCS_DIR, 'th') : DOCS_DIR;
      const outputFile = path.join(localeDir, page.currentPath.replace(/^\//, ''), 'index.html');
      await renderPage({
        appData,
        locale,
        currentPath: page.currentPath,
        view: page.view,
        outputFile,
        pageTitle: page.pageTitle
      });
    }
  }

  const dashboardIndex = fs.readFileSync(path.join(DOCS_DIR, 'dashboard', 'index.html'), 'utf8');
  fs.writeFileSync(path.join(DOCS_DIR, 'index.html'), dashboardIndex);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
