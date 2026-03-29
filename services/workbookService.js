const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const configService = require('./configService');
const {
  parseRawRecords,
  computeKpis,
  computeCategorySummary,
  computeTrendSummary,
  computeBacklog,
  computeDataQuality,
  buildFilterOptions,
  buildWorkbookMapping,
  buildHeaderMapping
} = require('./workbookTransforms');

const ROOT = process.cwd();

let cache = null;

function resolveWorkbookPath(targetPath) {
  return path.resolve(ROOT, targetPath);
}

function ensureWorkbookFile(targetPath) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Workbook file not found: ${targetPath}`);
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

function summarizeWorkbook(workbookPath, workbook, config) {
  const sheets = sheetMap(workbook);
  const parseResult = parseRawRecords(sheets, config);
  const records = parseResult.records;
  const kpis = computeKpis(records);
  const categorySummary = computeCategorySummary(records);
  const trendSummary = computeTrendSummary(records);
  const backlog = computeBacklog(records);
  const dataQuality = computeDataQuality(records);
  const filterOptions = buildFilterOptions(records);
  const workbookMapping = buildWorkbookMapping(sheets, workbook.SheetNames);

  return {
    meta: {
      workbookPath,
      sourceFileName: path.basename(workbookPath),
      lastUpdatedIso: new Date().toISOString(),
      reportingMonth: detectReportingMonth(records),
      sheetNames: workbook.SheetNames,
      recordCount: records.length,
      rawSheetName: parseResult.rawSheetName
    },
    config,
    rawSheets: sheets,
    records,
    kpis,
    categorySummary,
    trendSummary,
    backlog,
    dataQuality,
    filterOptions,
    workbookMapping,
    headerMapping: parseResult.headerMapping
  };
}

function readWorkbookFromPath(targetPath) {
  ensureWorkbookFile(targetPath);
  return XLSX.readFile(targetPath, { cellDates: true });
}

async function loadWorkbook(forceReload = false, explicitPath = null) {
  if (cache && !forceReload && !explicitPath) {
    return cache;
  }

  const config = configService.loadConfig();
  const workbookPath = resolveWorkbookPath(explicitPath || config.activeWorkbookPath);
  const workbook = readWorkbookFromPath(workbookPath);
  cache = summarizeWorkbook(workbookPath, workbook, config);
  return cache;
}

async function previewWorkbook(filePath) {
  const config = configService.loadConfig();
  const absolutePath = resolveWorkbookPath(filePath);
  const workbook = readWorkbookFromPath(absolutePath);
  const sheets = sheetMap(workbook);
  const rawSheetName = workbook.SheetNames.includes(config.rawSheetName)
    ? config.rawSheetName
    : workbook.SheetNames.find((name) => name.toLowerCase().includes('raw')) || workbook.SheetNames[0];
  const rows = sheets[rawSheetName] || [];
  const headers = rows[0] || [];
  const headerMapping = buildHeaderMapping(headers, config.fieldAliases);
  const missingCanonical = Object.entries(headerMapping)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  const sampleRows = rows.slice(0, 6);

  return {
    filePath: absolutePath,
    fileName: path.basename(absolutePath),
    sheetNames: workbook.SheetNames,
    rawSheetName,
    rowCount: Math.max(rows.length - 1, 0),
    headers,
    headerMapping,
    missingCanonical,
    sampleRows
  };
}

async function setActiveWorkbook(filePath) {
  const relativePath = configService.toProjectRelative(filePath);
  configService.updateConfig({ activeWorkbookPath: relativePath });
  return loadWorkbook(true);
}

function getAppDataSafe() {
  if (!cache) {
    throw new Error('Workbook data has not been loaded yet.');
  }
  return cache;
}

module.exports = {
  loadWorkbook,
  previewWorkbook,
  setActiveWorkbook,
  getAppDataSafe,
  resolveWorkbookPath
};
