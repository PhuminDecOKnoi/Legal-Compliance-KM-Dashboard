const express = require('express');

const exportController = require('../controllers/exportController');

const router = express.Router();

router.get('/export/pdf', exportController.exportPdf);
router.get('/export/excel', exportController.exportExcel);

module.exports = router;
