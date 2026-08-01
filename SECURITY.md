# Security Policy

## Scope

This repository processes legal, compliance, workforce, and Excel-based reporting data. Security reports should cover application code, workbook ingestion, exports, configuration, authentication assumptions, or data-handling behavior that could expose information or produce unsafe results.

## Reporting

Do not publish sensitive details, personal data, credentials, workbook contents, or exploitable steps in a public issue. Use a private GitHub security report when available and include the affected route or file, impact, reproduction conditions, and a proposed mitigation.

## Security and Privacy Baseline

- Do not commit real employee records, health information, identity numbers, disciplinary records, passwords, API keys, tokens, private keys, or confidential organization data.
- Use synthetic, anonymized, or formally approved sample workbooks.
- Treat uploaded or configured workbook paths as untrusted input.
- Validate workbook structure, sheet names, headers, data types, row counts, and file size before processing.
- Restrict accepted file types and reject unexpected active content or executable formats.
- Prevent path traversal and do not expose arbitrary local file paths through routes or error messages.
- Escape rendered values and avoid injecting workbook content directly into HTML.
- Apply least privilege to files, processes, service accounts, and deployment environments.
- Protect export routes and generated files when data is not intended for public access.
- Avoid verbose production errors that reveal stack traces, workbook paths, secrets, or internal schema details.
- Log security-relevant events without logging personal or confidential content.

## Application Boundaries

The current repository may include prototype or internal-use assumptions. Before production use, implement authentication, authorization, session security, audit logging, rate limiting, secure headers, retention rules, backup, recovery, and a privacy review appropriate to the actual data.

## Data Quality and Legal Use

Security review does not replace legal validation. Dashboard calculations, statutory interpretations, compliance status, and exported reports require human review before decisions with legal, employment, audit, or disciplinary consequences.
