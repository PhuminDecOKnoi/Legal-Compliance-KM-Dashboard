const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const { translations } = require('../utils/i18n');

function filterRecords(records, query) {
  return records.filter((record) => {
    if (query.category && record.category !== query.category) return false;
    if (query.status && record.statusNorm !== query.status) return false;
    if (query.validity && record.validityNorm !== query.validity) return false;
    if (query.year && record.year !== query.year) return false;
    if (query.month && record.yearMonth !== query.month) return false;
    if (query.search) {
      const haystack = [
        record.legalTitle,
        record.category,
        record.referenceNo,
        record.requirements
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(String(query.search).toLowerCase())) return false;
    }
    return true;
  });
}

function drawSectionTitle(doc, title) {
  doc.moveDown(0.8);
  doc.fontSize(14).fillColor('#16324f').text(title, { underline: true });
  doc.moveDown(0.2);
}

async function createPdfReport({ appData, locale, view, query, output }) {
  const t = translations[locale];
  const doc = new PDFDocument({ margin: 36, size: 'A4' });
  doc.pipe(output);

  doc.font('Helvetica-Bold').fontSize(18).fillColor('#16324f').text(t.appTitle);
  doc.font('Helvetica').fontSize(10).fillColor('#4f6b87').text(`${t.reportingMonth}: ${appData.meta.reportingMonth}`);
  doc.text(`${t.sourceFile}: ${appData.meta.sourceFileName}`);
  doc.text(`${t.lastUpdated}: ${new Date(appData.meta.lastUpdatedIso).toLocaleString()}`);

  drawSectionTitle(doc, view === 'employee' ? t.employeeView : t.executiveView);
  doc.fontSize(10).fillColor('#243b53');
  doc.text(`${t.totalLegalRequirements}: ${appData.kpis.totalLegalRequirements}`);
  doc.text(`${t.activeLaws}: ${appData.kpis.activeLaws}`);
  doc.text(`${t.implemented}: ${appData.kpis.implemented}`);
  doc.text(`${t.activePending}: ${appData.kpis.activePending}`);
  doc.text(`${t.implementedPercent}: ${appData.kpis.implementedPercent}%`);

  drawSectionTitle(doc, t.executiveHighlights);
  doc.text(view === 'employee' ? t.operationalFollowUp : t.recommendations);
  doc.text(appData.backlog.slice(0, 5).map((item, index) => `${index + 1}. ${item.legalTitle} [${item.status}/${item.validity}]`).join('\n'));

  if (view === 'employee') {
    const records = filterRecords(appData.records, query).slice(0, 20);
    drawSectionTitle(doc, t.legalRegister);
    records.forEach((record, index) => {
      doc.font('Helvetica-Bold').text(`${index + 1}. ${record.legalTitle}`);
      doc.font('Helvetica').text(`${t.category}: ${record.category}`);
      doc.text(`${t.status}: ${record.statusNorm} | ${t.validity}: ${record.validityNorm}`);
      doc.text(`${t.effectiveDate}: ${record.effectiveDateDisplay || '-'}`);
      doc.moveDown(0.4);
    });
  }

  drawSectionTitle(doc, t.dataQualityWatch);
  appData.dataQuality.warnings.forEach((warning) => doc.text(`- ${warning}`));

  doc.end();

  await new Promise((resolve) => output.on('finish', resolve));
}

async function createExcelExport({ appData, locale, query }) {
  const t = translations[locale];
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Codex';
  workbook.created = new Date();

  const filteredRecords = filterRecords(appData.records, query);

  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: t.metric, key: 'metric', width: 32 },
    { header: t.value, key: 'value', width: 18 }
  ];
  summarySheet.addRows([
    { metric: t.totalLegalRequirements, value: appData.kpis.totalLegalRequirements },
    { metric: t.activeLaws, value: appData.kpis.activeLaws },
    { metric: t.implemented, value: appData.kpis.implemented },
    { metric: t.underReview, value: appData.kpis.underReview },
    { metric: t.evaluated, value: appData.kpis.evaluated },
    { metric: t.blankStatus, value: appData.kpis.blankStatus },
    { metric: t.activePending, value: appData.kpis.activePending },
    { metric: t.implementedPercent, value: `${appData.kpis.implementedPercent}%` },
    { metric: t.topExposureCategory, value: appData.kpis.topExposureCategory },
    { metric: t.dataQualityWatch, value: appData.kpis.dataQualityWatch }
  ]);

  const registerSheet = workbook.addWorksheet('Legal Register');
  registerSheet.columns = [
    { header: 'No', key: 'no', width: 8 },
    { header: t.subject, key: 'subject', width: 20 },
    { header: t.category, key: 'category', width: 28 },
    { header: t.referenceNo, key: 'referenceNo', width: 20 },
    { header: t.legalTitle, key: 'legalTitle', width: 50 },
    { header: t.effectiveDate, key: 'effectiveDateDisplay', width: 16 },
    { header: t.status, key: 'statusNorm', width: 18 },
    { header: t.validity, key: 'validityNorm', width: 16 },
    { header: t.requiredAction, key: 'requiredAction', width: 36 }
  ];
  registerSheet.addRows(filteredRecords);

  const backlogSheet = workbook.addWorksheet('Backlog');
  backlogSheet.columns = [
    { header: t.legalTitle, key: 'legalTitle', width: 50 },
    { header: t.category, key: 'category', width: 28 },
    { header: t.status, key: 'status', width: 18 },
    { header: t.validity, key: 'validity', width: 16 },
    { header: t.requiredAction, key: 'requiredAction', width: 40 },
    { header: t.notes, key: 'notes', width: 20 }
  ];
  backlogSheet.addRows(appData.backlog);

  return workbook.xlsx.writeBuffer();
}

module.exports = {
  createPdfReport,
  createExcelExport
};
