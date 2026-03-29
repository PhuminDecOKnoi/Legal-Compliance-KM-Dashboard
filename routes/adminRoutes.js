const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const adminController = require('../controllers/adminController');
const configService = require('../services/configService');

const router = express.Router();

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const uploadsDir = path.resolve(process.cwd(), configService.loadConfig().uploadsDir);
    fs.mkdirSync(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename(req, file, cb) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitized = file.originalname.replace(/\s+/g, '-');
    cb(null, `${timestamp}-${sanitized}`);
  }
});

const upload = multer({
  storage,
  fileFilter(req, file, cb) {
    cb(null, /\.(xlsx|xlsm|xls)$/i.test(file.originalname));
  }
});

router.get('/admin', adminController.adminHome);
router.get('/admin/upload', adminController.adminUploadPage);
router.post('/admin/upload', upload.single('workbook'), adminController.handleUpload);
router.get('/admin/preview', adminController.previewUpload);
router.post('/admin/apply', adminController.applyWorkbook);
router.get('/admin/config', adminController.adminConfigPage);
router.post('/admin/config', adminController.saveConfig);
router.post('/admin/rebuild-docs', adminController.rebuildDocs);

module.exports = router;
