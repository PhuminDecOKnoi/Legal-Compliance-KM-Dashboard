# Contributing Guide

Thank you for helping improve the Legal / Compliance Dashboard.

## Contribution Principles

Changes should preserve legal traceability, data integrity, privacy, bilingual usability, and transparent calculations. Avoid presenting a prototype feature as production-ready unless the required controls are implemented and documented.

## Development Standards

- Keep workbook parsing, business rules, presentation, and export logic separated where practical.
- Document assumptions for sheet names, columns, status values, dates, and calculations.
- Treat `Raw_Data_Copy` or the documented source sheet as the controlled source of truth unless a change explicitly updates that architecture.
- Use synthetic or anonymized data in tests and examples.
- Do not commit real employee records, confidential legal registers, access credentials, or production workbook files.
- Preserve Thai and English labels when changing user-facing content.
- Escape workbook-derived values before rendering.
- Add validation and clear errors for missing sheets, headers, invalid dates, and unexpected data types.
- Explain changes that affect KPIs, trends, backlog, legal status, data quality, PDF output, or Excel export.
- Update README and technical notes when routes, workbook assumptions, or calculations change.

## Recommended Verification

1. Install dependencies and start the application.
2. Test with an approved synthetic workbook.
3. Verify dashboard totals against source rows.
4. Check executive and employee views.
5. Test affected filters and refresh behavior.
6. Review PDF, Excel, and print outputs when relevant.
7. Confirm that errors do not reveal confidential paths or data.
8. Run available tests, linting, or syntax checks.

## Commit Messages

```text
feat: add legal register filter
fix: correct backlog calculation
security: validate workbook path and type
docs: clarify workbook schema
refactor: separate export service
```

## Legal and Audit Review

Contributions that change compliance logic, statutory interpretation, audit classification, or decision rules require domain review before operational use.

## License

By contributing, you confirm that the submitted material may be distributed under the repository license and does not contain unauthorized third-party or confidential content.
