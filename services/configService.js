const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'config', 'dashboard.json');

const DEFAULT_CONFIG = {
  activeWorkbookPath: './TLS8001_Legal_Compliance_Dashboard_March Ver2.0_13032026.xlsx',
  uploadsDir: './data/uploads',
  rawSheetName: 'Raw_Data_Copy',
  workbookGuideSheetName: 'Workbook_Guide',
  fieldAliases: {
    subject: ['Subject'],
    no: ['No'],
    category: ['Category'],
    referenceNo: ['Document ID / Reference No.'],
    legalTitle: ['Legal / Regulatory Title'],
    effectiveDate: ['Date of Issue / Effective Date'],
    legalReferenceLink: ['Legal Reference Link'],
    requirements: ['Key Legal & Regulatory Requirements'],
    implementationStatus: ['Compliance Implementation Status'],
    compliant: ['(Y) Compliant / (N) Non-Compliant'],
    guidanceEvidence: ['Implementation Guidance & Evidence Examples'],
    legalValidityStatus: ['Legal Validity Status'],
    approvalStatus: ['Approval status']
  },
  statusRules: {
    Implemented: ['implemented'],
    'Under Review': ['under review', 'review'],
    Evaluated: ['evaluated', 'evaluate']
  },
  validityRules: {
    Active: ['active'],
    Inactive: ['inactive']
  }
};

function ensureConfigFile() {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
  }
}

function deepMerge(base, override) {
  const output = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === 'object' &&
      !Array.isArray(base[key])
    ) {
      output[key] = deepMerge(base[key], value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

function loadConfig() {
  ensureConfigFile();
  const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const config = deepMerge(DEFAULT_CONFIG, parsed);
  fs.mkdirSync(path.resolve(ROOT, config.uploadsDir), { recursive: true });
  return config;
}

function saveConfig(config) {
  const merged = deepMerge(DEFAULT_CONFIG, config);
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2));
  fs.mkdirSync(path.resolve(ROOT, merged.uploadsDir), { recursive: true });
  return merged;
}

function updateConfig(patch) {
  const current = loadConfig();
  return saveConfig(deepMerge(current, patch));
}

function toProjectRelative(targetPath) {
  const absolute = path.resolve(ROOT, targetPath);
  if (absolute.startsWith(ROOT)) {
    return `.${absolute.slice(ROOT.length)}` || '.';
  }
  return absolute;
}

function listUploadedFiles() {
  const config = loadConfig();
  const uploadsDir = path.resolve(ROOT, config.uploadsDir);
  if (!fs.existsSync(uploadsDir)) return [];
  return fs.readdirSync(uploadsDir)
    .filter((file) => /\.(xlsx|xlsm|xls)$/i.test(file))
    .map((file) => {
      const absolutePath = path.join(uploadsDir, file);
      const stat = fs.statSync(absolutePath);
      return {
        fileName: file,
        absolutePath,
        relativePath: toProjectRelative(absolutePath),
        size: stat.size,
        modifiedAt: stat.mtime.toISOString()
      };
    })
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

module.exports = {
  loadConfig,
  saveConfig,
  updateConfig,
  listUploadedFiles,
  toProjectRelative,
  CONFIG_PATH
};
