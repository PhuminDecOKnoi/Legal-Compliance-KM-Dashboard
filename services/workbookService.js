const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const {
  normalizeRecord,
  computeKpis,
  computeCategorySummary,
  computeTrendSummary,
  computeBacklog,
  computeDataQuality,
  buildFilterOptions,
  buildWorkbookMapping
} = require('./workbookTransforms');

const workbookPath = path.resolve(
  process.env.WORKBOOK_PATH || './TLS8001_Legal_Compliance_Dashboard_March Ver2.0_13032026.xlsx'
);

let cache = null;

function ensureWorkbookFile() {
  if (!fs.existsSync(workbookPath)) {
    throw new Error(`Workbook file not found: ${workbookPath}`);
  }
}

function toRows(sheet) {
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: ''
  });
}

function sheetMap(workbook) {
  return workbook.SheetNames.reduce((acc, name) => {
    acc[name] = toRows(workbook.Sheets[name]);
    return acc;
  }, {});
}

function detectReportingMonth(records) {
  const latest = records
    .filter((record) => record.yearMonth)
    .map((record) => record.yearMonth)
    .sort()
    .at(-1);
  return latest || 'N/A';
}

function parseRawRecords(sheets) {
  const rawRows = sheets.Raw_Data_Copy || [];
  const headers = rawRows[0] || [];
  return rawRows
    .slice(1)
    .map((row, index) => normalizeRecord(row, headers, index + 2))
    .filter((record) => record.legalTitle || record.category || record.subject);
}

async function loadWorkbook(forceReload = false) {
  if (cache && !forceReload) {
    return cache;
  }

  ensureWorkbookFile();

  const workbook = XLSX.readFile(workbookPath, { cellDates: true });
  const sheets = sheetMap(workbook);
  const records = parseRawRecords(sheets);
  const kpis = computeKpis(records);
  const categorySummary = computeCategorySummary(records);
  const trendSummary = computeTrendSummary(records);
  const backlog = computeBacklog(records);
  const dataQuality = computeDataQuality(records);
  const filterOptions = buildFilterOptions(records);
  const workbookMapping = buildWorkbookMapping(sheets, workbook.SheetNames);

  cache = {
    meta: {
      workbookPath,
      sourceFileName: path.basename(workbookPath),
      lastUpdatedIso: new Date().toISOString(),
      reportingMonth: detectReportingMonth(records),
      sheetNames: workbook.SheetNames,
      recordCount: records.length
    },
    rawSheets: sheets,
    records,
    kpis,
    categorySummary,
    trendSummary,
    backlog,
    dataQuality,
    filterOptions,
    workbookMapping
  };

  return cache;
}

function getAppDataSafe() {
  if (!cache) {
    throw new Error('Workbook data has not been loaded yet.');
  }
  return cache;
}

module.exports = {
  loadWorkbook,
  getAppDataSafe
};
