const workbookService = require('../services/workbookService');
const {
  buildExecutiveNarrative,
  buildRecommendations
} = require('../services/insightService');
const {
  translations,
  resolveLocale,
  localizeCategory,
  localizeStatus,
  localizeValidity,
  localizeNote,
  localizeWorkbookModule,
  localizeWorkbookNote,
  localizeGuideLabel,
  buildTrendNotes,
  buildDataQualityWarnings,
  shortenTrendLabel
} = require('../utils/i18n');

function render(res, view, extra = {}) {
  const locale = resolveLocale(extra.locale);
  const appData = workbookService.getAppDataSafe();
  const url = {
    staticMode: false,
    asset: (assetPath) => `/public/${assetPath}`,
    route: (pagePath, lang = locale) => `${pagePath}?lang=${lang}`,
    langSwitch: {
      en: `${extra.query?.path || extra.currentPath || '/dashboard'}?lang=en`,
      th: `${extra.query?.path || extra.currentPath || '/dashboard'}?lang=th`
    }
  };
  const insights = {
    narrative: buildExecutiveNarrative(appData, locale),
    recommendations: buildRecommendations(appData, locale)
  };
  const viewModel = {
    topExposureCategory: localizeCategory(appData.kpis.topExposureCategory, locale),
    categoryChartData: appData.categorySummary.map((item) => ({
      label: localizeCategory(item.category, locale),
      shortLabel: localizeCategory(item.category, locale),
      count: item.count
    })),
    categoryPendingChartData: appData.categorySummary.map((item) => ({
      label: localizeCategory(item.category, locale),
      shortLabel: localizeCategory(item.category, locale),
      count: item.activePending || item.count
    })),
    monthlyTrendChartData: appData.trendSummary.monthly.map((item) => ({
      label: item.label,
      shortLabel: shortenTrendLabel(item.label),
      count: item.count
    })),
    yearlyTrendChartData: appData.trendSummary.yearly.map((item) => ({
      label: item.label,
      shortLabel: item.label,
      count: item.count
    })),
    trendNotes: buildTrendNotes(locale),
    dataQualityWarnings: buildDataQualityWarnings(appData.dataQuality, locale),
    workbookMapping: appData.workbookMapping.map((item) => ({
      ...item,
      moduleLocalized: localizeWorkbookModule(item.module, locale),
      notesLocalized:
        item.notes.startsWith('Source of truth for')
          ? locale === 'th'
            ? `เป็นแหล่งข้อมูลหลักสำหรับ ${appData.meta.recordCount} แถวรายละเอียด`
            : item.notes
          : localizeWorkbookNote(item.notes, locale)
    })),
    workbookGuideRows: (appData.rawSheets.Workbook_Guide || []).slice(0, 8).map((row) => ({
      label: localizeGuideLabel(row[0], locale) || row[0],
      value: row[1] || ''
    }))
  };

  return res.render(view, {
    pageTitle: extra.pageTitle || 'Legal / Compliance Dashboard',
    locale,
    t: translations[locale],
    url,
    ui: {
      localizeCategory: (value) => localizeCategory(value, locale),
      localizeStatus: (value) => localizeStatus(value, locale),
      localizeValidity: (value) => localizeValidity(value, locale),
      localizeNote: (value) => localizeNote(value, locale),
      shortenTrendLabel
    },
    appData,
    insights,
    viewModel,
    filters: extra.filters || {},
    query: extra.query || {},
    currentPath: extra.currentPath || res.req.path
  });
}

exports.redirectRoot = (req, res) => res.redirect('/dashboard');

exports.dashboardHome = (req, res) => render(res, 'pages/dashboard', {
  pageTitle: 'Dashboard',
  locale: req.query.lang || 'en',
  query: req.query,
  currentPath: req.path
});

exports.executiveView = (req, res) => render(res, 'pages/executive', {
  pageTitle: 'Executive View',
  locale: req.query.lang || 'en',
  query: req.query,
  currentPath: req.path
});

exports.employeeView = (req, res) => render(res, 'pages/employee', {
  pageTitle: 'Employee View',
  locale: req.query.lang || 'en',
  query: req.query,
  currentPath: req.path
});

exports.legalRegisterView = (req, res) => render(res, 'pages/legal-register', {
  pageTitle: 'Legal Register',
  locale: req.query.lang || 'en',
  query: req.query,
  currentPath: req.path
});

exports.backlogView = (req, res) => render(res, 'pages/backlog', {
  pageTitle: 'Action Backlog',
  locale: req.query.lang || 'en',
  query: req.query,
  currentPath: req.path
});

exports.categorySummaryView = (req, res) => render(res, 'pages/category-summary', {
  pageTitle: 'Category Summary',
  locale: req.query.lang || 'en',
  query: req.query,
  currentPath: req.path
});

exports.trendSummaryView = (req, res) => render(res, 'pages/trend-summary', {
  pageTitle: 'Trend Summary',
  locale: req.query.lang || 'en',
  query: req.query,
  currentPath: req.path
});

exports.dataQualityView = (req, res) => render(res, 'pages/data-quality', {
  pageTitle: 'Data Quality',
  locale: req.query.lang || 'en',
  query: req.query,
  currentPath: req.path
});

exports.aboutReportView = (req, res) => render(res, 'pages/about-report', {
  pageTitle: 'About Report',
  locale: req.query.lang || 'en',
  query: req.query,
  currentPath: req.path
});

exports.printExecutiveView = (req, res) => render(res, 'pages/print-executive', {
  pageTitle: 'Print Executive',
  locale: req.query.lang || 'en',
  query: req.query,
  currentPath: req.path
});

exports.printEmployeeView = (req, res) => render(res, 'pages/print-employee', {
  pageTitle: 'Print Employee',
  locale: req.query.lang || 'en',
  query: req.query,
  currentPath: req.path
});

exports.refreshData = async (req, res, next) => {
  try {
    const appData = await workbookService.loadWorkbook(true);
    res.json({
      ok: true,
      refreshedAt: appData.meta.lastUpdatedIso,
      sourceFile: appData.meta.sourceFileName,
      totalRecords: appData.kpis.totalLegalRequirements
    });
  } catch (error) {
    next(error);
  }
};

exports.jsonData = (req, res) => {
  res.json(workbookService.getAppDataSafe());
};
