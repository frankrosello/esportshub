# Onboarding Demo

Open `onboarding-demo.html` through the local preview server. This standalone test version uses simulated data. The approved flow is now integrated into the main app through `onboarding.html`, with authenticated saving handled by `js/onboarding-host.js`. The demo remains isolated from real accounts.

The five steps cover identity/privacy, optional appearance, team access, availability (invited members) or team following (guests), and review. A sample dashboard at the end supports simulated player RSVPs. Back/Edit/Skip controls preserve entered values. A unique sessionStorage key stores the demo draft, including a locally selected avatar where browser storage permits. Themes affect this demo only. No API, Clerk, or Worker writes occur.

Use Test Scenarios to restart as a guest, invited player or substitute, test invalid/expired invitation feedback, or simulate a failed final save. The failed save occurs once so you can test retry. A refresh restores the draft in the same browser tab. Codes and username checks are simulated, not live validation.

Demo invitation codes:
- Player, Varsity: AB12-CD34-EF56-7890-AB12
- Substitute, Junior Varsity: EF56-7890-AB12-CD34-EF56
- Captain, Varsity: CD34-EF56-7890-AB12-CD34
- Expired invitation: EXPIRED
- Unavailable username: taken

Following a team does not grant membership; only the simulated verified code supplies a role. Real-name sharing defaults off. Availability uses half-hour slots shared across teams and supports rectangular pointer selection and keyboard selection. The completion screen explains that all results are simulated.

Browser validation: guest completion, unavailable username, valid player invite, availability preset, restored draft after refresh, first RSVP, expired code, final-save failure/retry, and 390px mobile layout without horizontal overflow. No live account creation was performed. The production entry is included in the release ZIP; this standalone demo is excluded.

## Production Setup

First-time accounts open the five-step setup inside the main app. Clerk saves names and avatars; the authenticated Worker saves profile preferences, actual invitation membership, shared availability, followed teams, and the default team. Existing assignments are retained. Guest accounts stay guests until a real invitation is accepted. Followed teams are preferences, not membership grants.

Drafts are scoped to the account in session storage. Completion is written last. Interrupted saves can be retried without redeeming an already accepted invitation again; fresh server membership is checked before skipping redemption. Deploy the included Worker for followed-team preferences; its additive table is created automatically. Existing completed accounts are not forced through setup again.
