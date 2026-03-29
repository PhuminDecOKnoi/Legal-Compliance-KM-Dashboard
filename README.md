# Legal / Compliance Dashboard

Internal bilingual legal and compliance dashboard built with Node.js, Express.js, EJS, CSS3, and vanilla JavaScript. The application reads directly from the Excel workbook on startup and can refresh from the same workbook without manual JSON conversion.

## Features

- Executive and Employee views without authentication
- Direct Excel workbook parsing using `xlsx`
- KPI, category, trend, backlog, and data-quality summaries
- Bilingual UI chrome in English and Thai
- PDF export, Excel export, and dedicated print views
- Refresh endpoint to reload workbook data

## Run

1. Copy `.env.example` to `.env` if you want to override defaults.
2. Install dependencies with `npm install`.
3. Start the app with `npm start`.
4. Open `http://localhost:3000/dashboard`.

## Workbook path

The default workbook path is:

`./TLS8001_Legal_Compliance_Dashboard_March Ver2.0_13032026.xlsx`

Override it with:

`WORKBOOK_PATH=/absolute/or/relative/path/to/workbook.xlsx`

## Routes

- `/dashboard`
- `/dashboard/executive`
- `/dashboard/employee`
- `/legal-register`
- `/backlog`
- `/category-summary`
- `/trend-summary`
- `/data-quality`
- `/about-report`
- `/print/executive`
- `/print/employee`
- `/export/pdf`
- `/export/excel`

## Notes

- `Raw_Data_Copy` is treated as the source of truth.
- Workbook summary sheets are mirrored in code for transparent calculations.
- Export Excel respects query filters when they are passed through the export route.
