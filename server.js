require('dotenv').config();

const path = require('path');
const express = require('express');

const dashboardRoutes = require('./routes/dashboardRoutes');
const exportRoutes = require('./routes/exportRoutes');
const adminRoutes = require('./routes/adminRoutes');
const workbookService = require('./services/workbookService');

const app = express();
const port = Number(process.env.PORT || 3000);
let serverInstance = null;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

app.use('/', dashboardRoutes);
app.use('/', exportRoutes);
app.use('/', adminRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', {
    pageTitle: 'Dashboard Error',
    locale: 'en',
    t: { appTitle: 'Dashboard Error' },
    url: {
      staticMode: false,
      asset: (assetPath) => `/public/${assetPath}`,
      route: (pagePath) => pagePath,
      langSwitch: { en: '/dashboard?lang=en', th: '/dashboard?lang=th' }
    },
    error: err,
    appData: (() => {
      try {
        return workbookService.getAppDataSafe();
      } catch {
        return { meta: {}, records: [] };
      }
    })(),
    currentPath: req.path
  });
});

async function startServer() {
  try {
    await workbookService.loadWorkbook();
    serverInstance = app.listen(port, () => {
      console.log(`Legal dashboard running at http://localhost:${port}/dashboard`);
    });
    serverInstance.on('error', (error) => {
      console.error('Server failed:', error);
      process.exit(1);
    });
    serverInstance.ref();
  } catch (error) {
    console.error('Failed to load workbook on startup:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  if (serverInstance) {
    serverInstance.close(() => process.exit(0));
    return;
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  if (serverInstance) {
    serverInstance.close(() => process.exit(0));
    return;
  }
  process.exit(0);
});

startServer();
