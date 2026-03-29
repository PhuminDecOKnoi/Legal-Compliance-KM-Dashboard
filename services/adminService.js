const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const configService = require('./configService');
const workbookService = require('./workbookService');

const ROOT = process.cwd();

function parseCsvList(value) {
  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildConfigFromForm(body, currentConfig) {
  const fieldKeys = Object.keys(currentConfig.fieldAliases);
  const fieldAliases = {};
  for (const key of fieldKeys) {
    fieldAliases[key] = parseCsvList(body[`fieldAliases.${key}`]);
  }

  return {
    activeWorkbookPath: body.activeWorkbookPath || currentConfig.activeWorkbookPath,
    uploadsDir: body.uploadsDir || currentConfig.uploadsDir,
    rawSheetName: body.rawSheetName || currentConfig.rawSheetName,
    workbookGuideSheetName: body.workbookGuideSheetName || currentConfig.workbookGuideSheetName,
    fieldAliases,
    statusRules: {
      Implemented: parseCsvList(body['statusRules.Implemented']),
      'Under Review': parseCsvList(body['statusRules.Under Review']),
      Evaluated: parseCsvList(body['statusRules.Evaluated'])
    },
    validityRules: {
      Active: parseCsvList(body['validityRules.Active']),
      Inactive: parseCsvList(body['validityRules.Inactive'])
    }
  };
}

function serializeConfigForForm(config) {
  const serialize = (list) => (list || []).join(', ');
  return {
    activeWorkbookPath: config.activeWorkbookPath,
    uploadsDir: config.uploadsDir,
    rawSheetName: config.rawSheetName,
    workbookGuideSheetName: config.workbookGuideSheetName,
    fieldAliases: Object.fromEntries(
      Object.entries(config.fieldAliases).map(([key, value]) => [key, serialize(value)])
    ),
    statusRules: Object.fromEntries(
      Object.entries(config.statusRules).map(([key, value]) => [key, serialize(value)])
    ),
    validityRules: Object.fromEntries(
      Object.entries(config.validityRules).map(([key, value]) => [key, serialize(value)])
    )
  };
}

function rebuildStaticDocs() {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-static.js')], {
    cwd: ROOT,
    stdio: 'pipe'
  });
}

async function getAdminContext() {
  const config = configService.loadConfig();
  const appData = await workbookService.loadWorkbook(true);
  const uploads = configService.listUploadedFiles();
  return {
    config,
    configForm: serializeConfigForForm(config),
    uploads,
    activeWorkbookPreview: await workbookService.previewWorkbook(config.activeWorkbookPath),
    appData
  };
}

module.exports = {
  parseCsvList,
  buildConfigFromForm,
  serializeConfigForForm,
  rebuildStaticDocs,
  getAdminContext
};
