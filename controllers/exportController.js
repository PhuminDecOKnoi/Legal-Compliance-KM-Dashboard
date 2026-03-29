const workbookService = require('../services/workbookService');
const { createPdfReport, createExcelExport } = require('../services/exportService');

exports.exportPdf = async (req, res, next) => {
  try {
    const appData = workbookService.getAppDataSafe();
    const view = req.query.view === 'employee' ? 'employee' : 'executive';
    const locale = req.query.lang === 'th' ? 'th' : 'en';

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="legal-compliance-${view}-${locale}.pdf"`
    );
    res.setHeader('Content-Type', 'application/pdf');

    await createPdfReport({
      appData,
      locale,
      view,
      query: req.query,
      output: res
    });
  } catch (error) {
    next(error);
  }
};

exports.exportExcel = async (req, res, next) => {
  try {
    const appData = workbookService.getAppDataSafe();
    const locale = req.query.lang === 'th' ? 'th' : 'en';
    const buffer = await createExcelExport({
      appData,
      locale,
      query: req.query
    });

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="legal-compliance-export.xlsx"'
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
