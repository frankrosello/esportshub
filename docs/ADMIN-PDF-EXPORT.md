# Administrative PDF Export

1. Deploy cloudflare/index.js using your existing Worker project and bindings.
2. Upload the updated frontend files, including js/admin-export.js, js/vendor/, and assets/fonts/.
3. Sign in as an administrator (All Roles or Admin view), then open Organization > Data Export.
4. Leave all sections selected or choose specific records. Select paper size/style and click Export PDF.

The report contains private data if those sections are selected. It is generated locally and downloaded to your device. No report data is sent to a PDF provider. Files appear in the attachment inventory; images/videos themselves are not embedded. This report is not a restorable database backup. All pages of selected records are fetched on demand, without the normal screen list limits. If any section fails, no incomplete PDF is downloaded; fix the error and retry.

Clerk credentials, sessions, invitation secrets and infrastructure secrets are not exported. Browser-local drafts, layouts and other devices' Workshop logs are unavailable. A currently loaded Workshop analysis in your own browser can be included. Unsupported font symbols are represented by their Unicode code points rather than silently lost. The report shows Eastern timestamps with source ISO values.

Libraries are vendored and loaded only when generating a PDF: jsPDF 4.2.1 and jsPDF-AutoTable 5.0.9 (MIT), with Bai Jamjuree Regular/Bold (SIL Open Font License). License files accompany the assets.
