const express = require('express');

const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

router.get('/', dashboardController.redirectRoot);
router.get('/dashboard', dashboardController.dashboardHome);
router.get('/dashboard/executive', dashboardController.executiveView);
router.get('/dashboard/employee', dashboardController.employeeView);
router.get('/legal-register', dashboardController.legalRegisterView);
router.get('/backlog', dashboardController.backlogView);
router.get('/category-summary', dashboardController.categorySummaryView);
router.get('/trend-summary', dashboardController.trendSummaryView);
router.get('/data-quality', dashboardController.dataQualityView);
router.get('/about-report', dashboardController.aboutReportView);
router.get('/print/executive', dashboardController.printExecutiveView);
router.get('/print/employee', dashboardController.printEmployeeView);
router.post('/api/refresh', dashboardController.refreshData);
router.get('/api/data', dashboardController.jsonData);

module.exports = router;
