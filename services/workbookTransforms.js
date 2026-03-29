const { formatDateDisplay, parseWorkbookDate } = require('../utils/dateUtils');

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0E00-\u0E7F]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[()]/g, '')
    .replace(/[./]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildHeaderMapping(headers, fieldAliases) {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header)
  }));

  const mapping = {};
  for (const [key, aliases] of Object.entries(fieldAliases || {})) {
    const matched = normalizedHeaders.find((header) =>
      (aliases || []).some((alias) => normalizeHeader(alias) === header.normalized)
    );
    mapping[key] = matched ? matched.original : '';
  }
  return mapping;
}

function mapConfiguredRow(headerMapping, row, headers) {
  const indexByHeader = headers.reduce((acc, header, index) => {
    acc[header] = index;
    return acc;
  }, {});

  const read = (key) => {
    const header = headerMapping[key];
    if (!header && header !== '') return '';
    const index = indexByHeader[header];
    return index === undefined ? '' : row[index] ?? '';
  };

  return {
    subject: read('subject'),
    no: read('no'),
    category: read('category'),
    referenceNo: read('referenceNo'),
    legalTitle: read('legalTitle'),
    effectiveDate: read('effectiveDate'),
    legalReferenceLink: read('legalReferenceLink'),
    requirements: read('requirements'),
    implementationStatus: read('implementationStatus'),
    compliant: read('compliant'),
    guidanceEvidence: read('guidanceEvidence'),
    legalValidityStatus: read('legalValidityStatus'),
    approvalStatus: read('approvalStatus')
  };
}

function normalizeStatus(statusRaw, config) {
  const value = String(statusRaw || '').trim().toLowerCase();
  if (!value) return 'Blank';
  for (const [label, terms] of Object.entries((config && config.statusRules) || {})) {
    if ((terms || []).some((term) => value.includes(String(term).trim().toLowerCase()))) {
      return label;
    }
  }
  return String(statusRaw || '').trim();
}

function normalizeValidity(validityRaw, config) {
  const value = String(validityRaw || '').trim().toLowerCase();
  if (!value) return 'Unknown';
  const rules = (config && config.validityRules) || {};
  if ((rules.Inactive || []).some((term) => value.includes(String(term).trim().toLowerCase()))) return 'Inactive';
  if ((rules.Active || []).some((term) => value.includes(String(term).trim().toLowerCase()))) return 'Active';
  return String(validityRaw || '').trim();
}

function normalizeCompliant(compliantRaw) {
  const value = String(compliantRaw || '').trim().toLowerCase();
  if (!value) return 'Blank';
  if (['y', 'yes', 'true', 'จริง'].includes(value)) return 'Y';
  if (['n', 'no', 'false', 'ไม่จริง'].includes(value)) return 'N';
  return String(compliantRaw || '').trim();
}

function deriveRequiredAction(record) {
  if (record.validityNorm === 'Active' && record.statusNorm !== 'Implemented') {
    return 'Confirm owner, close assessment, and attach implementation evidence';
  }
  if (record.validityNorm === 'Inactive') {
    return 'Validate archive or retained reference treatment';
  }
  if (record.dataQualityFlags.length > 0) {
    return 'Correct data quality issues in source workbook';
  }
  return 'Monitor and maintain evidence';
}

function deriveBacklogPriority(record) {
  if (record.validityNorm === 'Active' && record.statusNorm !== 'Implemented') return 'High';
  if (record.validityNorm === 'Inactive') return 'Medium';
  if (record.dataQualityFlags.length > 0) return 'Medium';
  return 'Low';
}

function normalizeRecord(mapped, sourceRowNumber, config) {
  const issueDateObj = parseWorkbookDate(mapped.effectiveDate);
  const statusNorm = normalizeStatus(mapped.implementationStatus, config);
  const validityNorm = normalizeValidity(mapped.legalValidityStatus, config);
  const compliantNorm = normalizeCompliant(mapped.compliant);
  const currentDate = new Date();
  const dataQualityFlags = [];

  if (!mapped.effectiveDate) dataQualityFlags.push('Missing date');
  if (!mapped.referenceNo) dataQualityFlags.push('Missing reference');
  if (!mapped.implementationStatus) dataQualityFlags.push('Blank status');
  if (issueDateObj && issueDateObj > currentDate) dataQualityFlags.push('Future date');

  const year = issueDateObj ? String(issueDateObj.getFullYear()) : '';
  const month = issueDateObj
    ? `${issueDateObj.getFullYear()}-${String(issueDateObj.getMonth() + 1).padStart(2, '0')}`
    : '';

  const record = {
    id: `record-${sourceRowNumber}-${slugify(mapped.legalTitle) || mapped.no || sourceRowNumber}`,
    sourceRowNumber,
    subject: mapped.subject,
    no: mapped.no,
    category: mapped.category,
    referenceNo: mapped.referenceNo,
    legalTitle: mapped.legalTitle,
    effectiveDateRaw: mapped.effectiveDate,
    effectiveDateDisplay: formatDateDisplay(issueDateObj),
    effectiveDateIso: issueDateObj ? issueDateObj.toISOString() : '',
    legalReferenceLink: mapped.legalReferenceLink,
    requirements: mapped.requirements,
    implementationStatus: mapped.implementationStatus,
    statusNorm,
    compliantRaw: mapped.compliant,
    compliantNorm,
    guidanceEvidence: mapped.guidanceEvidence,
    legalValidityStatus: mapped.legalValidityStatus,
    validityNorm,
    approvalStatus: mapped.approvalStatus || '',
    year,
    yearMonth: month,
    isActive: validityNorm === 'Active',
    isImplemented: statusNorm === 'Implemented',
    isPendingActive: validityNorm === 'Active' && statusNorm !== 'Implemented',
    dataQualityFlags
  };

  record.requiredAction = deriveRequiredAction(record);
  record.backlogPriority = deriveBacklogPriority(record);
  record.notes =
    record.dataQualityFlags[0] ||
    (record.validityNorm === 'Inactive' ? 'Archive review' : record.isPendingActive ? 'Immediate action' : 'Controlled');

  return record;
}

function parseRawRecords(sheets, config) {
  const rawSheetName = sheets[config.rawSheetName]
    ? config.rawSheetName
    : Object.keys(sheets).find((name) => name.toLowerCase().includes('raw')) || Object.keys(sheets)[0];
  const rawRows = sheets[rawSheetName] || [];
  const headers = rawRows[0] || [];
  const headerMapping = buildHeaderMapping(headers, config.fieldAliases);
  const records = rawRows
    .slice(1)
    .map((row, index) => normalizeRecord(mapConfiguredRow(headerMapping, row, headers), index + 2, config))
    .filter((record) => record.legalTitle || record.category || record.subject);

  return { records, rawSheetName, headerMapping };
}

function computeKpis(records) {
  const active = records.filter((record) => record.validityNorm === 'Active');
  const implemented = records.filter((record) => record.statusNorm === 'Implemented');
  const underReview = records.filter((record) => record.statusNorm === 'Under Review');
  const evaluated = records.filter((record) => record.statusNorm === 'Evaluated');
  const blankStatus = records.filter((record) => record.statusNorm === 'Blank');
  const activePending = records.filter((record) => record.isPendingActive);
  const topExposure = computeCategorySummary(records).sort((a, b) => b.activePending - a.activePending || b.count - a.count)[0];
  const dataQuality = computeDataQuality(records);

  return {
    totalLegalRequirements: records.length,
    activeLaws: active.length,
    implemented: implemented.length,
    underReview: underReview.length,
    evaluated: evaluated.length,
    blankStatus: blankStatus.length,
    activePending: activePending.length,
    implementedPercent: records.length ? Math.round((implemented.length / records.length) * 1000) / 10 : 0,
    topExposureCategory: topExposure ? topExposure.category : 'N/A',
    dataQualityWatch: dataQuality.totalIssues
  };
}

function computeCategorySummary(records) {
  const byCategory = new Map();

  for (const record of records) {
    const key = record.category || 'Uncategorized';
    if (!byCategory.has(key)) {
      byCategory.set(key, {
        category: key,
        count: 0,
        active: 0,
        implemented: 0,
        underReview: 0,
        evaluated: 0,
        activePending: 0,
        notes: 'Controlled'
      });
    }
    const item = byCategory.get(key);
    item.count += 1;
    if (record.validityNorm === 'Active') item.active += 1;
    if (record.statusNorm === 'Implemented') item.implemented += 1;
    if (record.statusNorm === 'Under Review') item.underReview += 1;
    if (record.statusNorm === 'Evaluated') item.evaluated += 1;
    if (record.isPendingActive) item.activePending += 1;
  }

  return Array.from(byCategory.values())
    .map((item) => {
      const percent = records.length ? ((item.count / records.length) * 100).toFixed(1) : '0.0';
      let notes = 'Controlled';
      if (item.activePending > 0) notes = 'Priority follow-up';
      else if (item.active < item.count) notes = 'Archive review';
      return { ...item, percent: `${percent}%`, notes };
    })
    .sort((a, b) => b.count - a.count);
}

function buildDistribution(records, formatter) {
  const map = new Map();
  for (const record of records) {
    const key = formatter(record);
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function computeTrendSummary(records) {
  return {
    yearly: buildDistribution(records, (record) => record.year),
    monthly: buildDistribution(records, (record) => record.yearMonth),
    notes: [
      'Trend is based on Date of Issue / Effective Date from the legal register.',
      'Use the distribution as portfolio visibility rather than closure-progress measurement.'
    ]
  };
}

function computeBacklog(records) {
  const priorityRank = { High: 1, Medium: 2, Low: 3 };
  return records
    .filter((record) => record.isPendingActive || record.validityNorm === 'Inactive' || record.dataQualityFlags.length > 0)
    .map((record) => ({
      id: record.id,
      legalTitle: record.legalTitle,
      category: record.category,
      status: record.statusNorm,
      validity: record.validityNorm,
      requiredAction: record.requiredAction,
      notes: record.notes,
      priority: record.backlogPriority
    }))
    .sort((a, b) => (priorityRank[a.priority] || 99) - (priorityRank[b.priority] || 99) || a.legalTitle.localeCompare(b.legalTitle));
}

function computeDataQuality(records) {
  const blankDate = records.filter((record) => record.dataQualityFlags.includes('Missing date')).length;
  const futureDate = records.filter((record) => record.dataQualityFlags.includes('Future date')).length;
  const missingReference = records.filter((record) => record.dataQualityFlags.includes('Missing reference')).length;
  const blankStatus = records.filter((record) => record.dataQualityFlags.includes('Blank status')).length;
  const warnings = [];

  if (blankDate) warnings.push(`${blankDate} records have missing dates.`);
  if (futureDate) warnings.push(`${futureDate} records have future effective dates.`);
  if (missingReference) warnings.push(`${missingReference} records are missing reference numbers.`);
  if (blankStatus) warnings.push(`${blankStatus} records have blank implementation statuses.`);
  if (!warnings.length) warnings.push('No major data quality warnings detected.');

  return {
    blankDate,
    futureDate,
    missingReference,
    blankStatus,
    totalIssues: blankDate + futureDate + missingReference + blankStatus,
    warnings
  };
}

function buildFilterOptions(records) {
  const unique = (values) => Array.from(new Set(values.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));
  return {
    categories: unique(records.map((record) => record.category)),
    statuses: unique(records.map((record) => record.statusNorm)),
    validities: unique(records.map((record) => record.validityNorm)),
    years: unique(records.map((record) => record.year)),
    months: unique(records.map((record) => record.yearMonth))
  };
}

function buildWorkbookMapping(sheets, sheetNames) {
  return [
    {
      sheet: 'Raw_Data_Copy',
      module: 'Primary legal register and detailed employee table',
      notes: `Source of truth for ${Math.max((sheets.Raw_Data_Copy || []).length - 1, 0)} detailed rows.`
    },
    {
      sheet: 'Data_Helper',
      module: 'Normalization layer in code',
      notes: 'Mirrored through derived year, year-month, normalized status, normalized validity, and compliant flags.'
    },
    {
      sheet: 'Summary_KPI',
      module: 'Executive KPI cards',
      notes: 'Rendered from server-side KPI calculations for transparency.'
    },
    {
      sheet: 'Summary_Category',
      module: 'Category exposure summary page and executive section',
      notes: 'Shows counts, active items, implemented items, under review, evaluated, and active pending.'
    },
    {
      sheet: 'Summary_Trend',
      module: 'Trend summary page and chart section',
      notes: 'Uses effective dates for yearly and monthly distribution.'
    },
    {
      sheet: 'Action_Backlog',
      module: 'Backlog page and preview panel',
      notes: 'Operational follow-up view for active pending items, inactive archive checks, and data quality issues.'
    },
    {
      sheet: 'Workbook_Guide',
      module: 'About report page',
      notes: 'Used as the narrative guide for assumptions and report interpretation.'
    },
    ...sheetNames
      .filter((name) => !['Raw_Data_Copy', 'Data_Helper', 'Summary_KPI', 'Summary_Category', 'Summary_Trend', 'Action_Backlog', 'Workbook_Guide'].includes(name))
      .map((name) => ({
        sheet: name,
        module: 'Workbook context and reporting references',
        notes: 'Exposed as workbook structure context in the About Report section.'
      }))
  ];
}

module.exports = {
  parseRawRecords,
  computeKpis,
  computeCategorySummary,
  computeTrendSummary,
  computeBacklog,
  computeDataQuality,
  buildFilterOptions,
  buildWorkbookMapping,
  buildHeaderMapping
};
