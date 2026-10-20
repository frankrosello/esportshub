# HUD interface update — October 18, 2026

The static frontend retains its existing Clerk authentication, Worker API, role checks, form IDs, and saved profile customization. Deploy the included Worker to retain the new name fonts and nameplates and enable scoped news deletion. Existing bindings, secrets and databases stay in place; no migration or new Cloudflare service is required.

## Interface changes

- Cyber uses the uploaded HTML's black, lavender, purple, and cyan palette. White, Charcoal, System, and game-inspired presets change the new HUD components as well as page colors.
- A section has one primary action, with consistent dark secondary buttons. Team role chips are shared by rosters, account controls, and profiles.
- The mobile navigation drawer occupies 85% of the viewport. The account avatar moves to the top bar and opens the mini profile and presence controls.
- Search supports keyboard navigation and Command+K on Apple platforms or Ctrl+K elsewhere. The inline dropdown groups accessible pages, teams, and members. Member names honor guest visibility and real-name opt-in. Scoped team reads are cached and reused across search queries; search does not fetch an unrestricted member directory.
- The Base44-style compact notification popover shows reminders, unread counts, relative timestamps, whole-row event/proposal actions, Mark All as Read, and Preferences. Search and Notifications sit directly next to each other.
- Season Snapshot appears full width above the three dashboard totals. Upcoming Schedule and Availability at a Glance share a fixed desktop height; additional event rows scroll within their card. Remaining cards pack into two compact columns by measured height. Customize Dashboard supports dragging or arrow buttons, Save Layout, Cancel, and Auto Arrange. Layout preferences are stored per account in this browser; they are not synced between devices.
- Match preparation actions stay beneath the event details. Staff readiness removes its loading state on both success and failure.
- Agenda view pairs an event index with the selected event's full actions. Calendar view remains available.
- Attendance uses quick status buttons, separate starter/substitute groups, search, totals, and the existing save endpoint. Attendance History has a searchable summary and expandable recorded-event history.
- Availability hover and keyboard focus show available, unavailable, and unsubmitted players. Heat levels use the full roster as denominator; green means every starter is available at that time. Missing schedules are not treated as submitted or available.
- Team News has a top-right publish action and a View More reader.
- Settings has a consistent navigation rail, profile section tabs, responsive live preview, and equal theme choices while retaining existing controls and drafts.
- Organization has game-filtered Up/Down team ordering, creation dialogs, and the existing recoverable deletion confirmation and Trash flows. Reordering remains administrator-only, matching the existing API permission.
- Workshop logs support drag-and-drop through the existing local analyzer and file-size limit. Logs are not uploaded automatically.
- The latest supplied rounded EsportsHub wordmark remains included at both resolutions.

## Validation

JavaScript syntax checks, twenty-four regression tests, original HTML ID/navigation contracts, local asset references, desktop and phone layout checks, and ZIP checksums were verified. Browser checks use local sample data; production Clerk sign-in and Worker writes still require a deployment smoke test.

## Deployment

Copy the ZIP contents to the site's root, preserving `assets/`, `css/`, and `js/`. The ZIP contains frontend files, documentation, and a source manifest. It excludes local preview fixtures, dependency folders, and development tools. After GitHub Pages deploys, refresh once to load the updated cache-busting URLs.

## Availability and profile follow-up

- Game managers can open and save their assigned game's shared map pool from Teams or the Dashboard. Other games remain read-only; the existing Worker already enforces the same permission.
- Profile, Start/Bench, and role controls share a 24 px height throughout the interface. Profile role labels have no enclosing circular pill.
- The dashboard greeting keeps its original larger size when it fits, and scales down only when needed to show the full name on one line.
- Availability opens in team view, including when a saved draft exists. Edit resumes that draft, and active editing survives background refreshes.
- Availability uses five blue shades, light to dark as the available fraction increases. Empty slots are black; all starters available takes precedence and appears green.
- The desktop account footer shows only the highest active role. Full and mini profiles retain all assigned roles.

## Profile, membership, and dashboard polish

- Members uses the shared roster badges and includes a Substitute filter and direct Substitute assignment. Substitute retains player permissions and uses the existing team-lineup endpoint; failed lineup saves show an explicit retry message.
- Profiles opened from Teams show all authorized roles for that team, including substitute lineup status. Unrelated team assignments are excluded.
- Player navigation displays Invite Guests instead of Members, including when using the Player role view.
- Profile customization uses a banner/avatar header with Save Profile, common identity/bio/presence fields, advanced account details, six customization tabs, and an expandable full preview. Existing field IDs, uploads, validation, and draft retention are preserved.
- My Match Details is a full-width accessible accordion with four aligned status fields, collapsing to two columns on smaller screens.
- Team News uses square HUD edges and clean article rows.

Validated with twenty-four regression tests, syntax checks, and local desktop/mobile browser checks. A local substitute assignment was saved through both existing API routes and reflected in the roster and full profile. Production Worker writes were not performed.

## Header and updated wordmark

- Search, Notifications, and View As share a 38 px control height at every breakpoint. The 76 px toolbar and logo header share the same divider baseline.
- The new supplied EsportsHub artwork appears in the sidebar and signed-out header. An SVG mask removes opaque white cutouts while preserving the source artwork and transparent background.
- Esports follows the page text color; Hub follows the same theme highlight as the dashboard name (Cyber lavender `#bd94ed`). Theme changes update the logo immediately.
- Verified matched desktop/mobile control dimensions, mobile search, transparent cutouts, alternate/light theme colors, and no horizontal overflow at 390 px.

## Mobile title and account launcher

- The top bar shows only the current page name on mobile, without the Club Hub prefix or slash. Desktop hides that title entirely.
- The desktop account launcher has no decorative border or clipped corners. Hover and open states use a subtle theme highlight, with visible keyboard focus retained.
- Welcome Back keeps its full size whenever possible and reduces its font only when the complete name exceeds the available width. Verified the full greeting at 390 px and no horizontal overflow at 320 px.

## Event and Mobile Reliability

- Upcoming-event View actions use one delegated handler and open the selected event’s role-appropriate details. Featured-match actions stay in one stable row for every assigned role; asynchronous readiness never moves the buttons.
- Upcoming Schedule measures complete rows against the desktop card’s available space, rather than always showing four clipped rows. Full Schedule remains available for the rest.
- Browser Back and Forward restore actual pages through history entries, while permission redirects and background refreshes avoid duplicate entries.
- Touching an editable availability cell starts selection immediately. Sliding paints all crossed slots, including cells skipped by fast movement; starting on an existing selection clears cells instead. Scrolling remains available outside the editing grid.
- Substitute memberships are presented as players with substitute lineup status, preserving player tools without granting staff access.
- Map/VOD insertion supports multiple rows, mode and map selectors, and Heroicons mode symbols. One insertion preserves map order and the existing notes format; no backend migration is needed.
- Mobile fixes cover team-selector borders, logo proportions and close-button spacing, event dates/time inputs, availability-card heading/button layout, and Workshop Analysis upload sizing. Season metrics are consistently smaller and roster search is 40 px high across role views.

Validation: twenty-four regression tests and JavaScript syntax checks; local browser checks across all seven assigned-role views; event View actions; Back navigation; two-map insertion; 390 px date/time, roster, and dashboard layouts; and a 320 px Workshop Analysis layout. Touch selection is exercised by event-handler tests. Production Clerk/Worker writes and physical-phone gestures were not performed.


## Updated Pages Preview — October 19, 2026

The design from `esportshub-pages-preview(1).html` is adapted to the real app rather than importing its demo handlers or sample content. Buttons, HUD card headers, list/selection layouts, team roster and resources columns, organization lists, editor controls, and settings navigation use its visual system. Existing IDs, screen attributes, Clerk sign-in, API routes, form handlers, role checks, themes, and advanced customization remain available.

- Dashboard cards automatically pack into balanced columns. Customize Dashboard enables mouse dragging and keyboard/mobile arrow controls. Save Layout persists the two card columns per signed-in account in local storage. Cancel restores the saved arrangement; Auto Arrange returns to measured automatic packing. Future visits reuse the preference in the same browser. Private cards remain hidden in role views that cannot access them.
- Up Next always builds the same title, metadata, action row, and match-details structure. Empty schedules use a full-width message. Public viewers get View Event instead of personal RSVP controls. Role changes temporarily disable team selection so overlapping refreshes cannot overwrite it.
- Players viewing other teams use the public scope. A failed concern read no longer stops map/news loading. Resource responses are checked against both team and request generation, including failure paths.
- View Maps opens the selected team's read-only map viewer for guests and members. Map editing remains in the authorized map-pool controls.
- Map/VOD insertion uses aligned mode icons and structured replay blocks containing an icon, mode, map name, and selectable code. Existing three-line Markdown entries render as blocks too. Editing saves the original Markdown format, so no database migration is needed.
- Player Concerns pairs a searchable Open/Closed/All conversation library with the actual thread, reply editor, edit-original, and close/reopen actions. New Concern opens a composer dialog. Replies and uploads retain the existing API handlers.
- Workshop Analysis keeps local parsing, export, and report creation. Its results show a statistics table beside the result and hero-appearance counts; no illustrative scores or analytics are added to real logs.
- Profile frame selections now draw inside clipped square avatars in the full profile, mini profile, and settings preview. Ring names become frame names while preserving saved option values. Accent, double, dashed, neon, two-color, split, diamond trim, shield trim, pixel, inset, star, and crown options remain supported.

Changed source files: `index.html`, `css/hud.css`, `js/portal.js`, `js/hud.js`, `tests/hud-dashboard.test.cjs`, and this document. `css/style.css` remains the base stylesheet; the app still loads only two CSS files.

Validation: 24 regression tests, JavaScript syntax checks, original static ID preservation, local asset checks, mobile page overflow checks at 390 px, multi-team Player/Guest dashboards, match details and map viewing, structured map insertion, square profile decorations, and saved-layout reload/cancel behavior. Browser checks use local fixtures. Live Clerk/Worker writes were not performed. This release changes frontend files only and requires no new Cloudflare binding or service.

## UI Kit Component Pass

`EsportsHub UI Kit.html` supplies the final object styling: core Cyber ink/muted/grid tokens, 11 px HUD corner brackets, clipped primary and outlined secondary buttons, amber keyboard focus rings, void form fields, solid cyan/brand role tags with outlined substitutes and guests, tabs, segmented RSVP/attendance/view controls, notification badges, row metadata, and Heroicons layout controls. Website presets continue to supply their own surfaces and accents. The kit's fixed 1600 px canvas is not imported; mobile layouts remain responsive.

Dashboard Map Pool map names use the same 24 px cyan player-role badges. Mode headings remain plain accent-colored headers with the shared mode icons from the map/VOD importer. Restriction dates and rotation annotations remain visible; the full map viewer retains photographs.

Map-pool edit actions and Team News publish/edit actions are icon-only with transparent backgrounds, 32 px click targets, accessible labels, hover feedback, and visible keyboard focus.

The View More Team News window includes transparent publish and per-article edit icons for authorized team managers. It reuses the existing news editor and refreshes the open reader after publishing or editing; guests remain read-only. Opening the reader reuses the loaded news rather than issuing another request.

### Compact maps, news controls, and planning

Teams map categories use smaller photo tiles. Active restrictions appear as amber warning icons; hover, keyboard focus, or tap shows the Eastern-date availability cutoff without increasing card height. The same delegated tooltip works in the cloned full map viewer.

The Team News reader uses matching transparent 32px add, close, edit, and delete icons. Dashboard and reader both expose deletion only to administrators and the assigned game manager. Deletion asks for confirmation, checks permissions again on submission, and refreshes both views after success. Other staff retain their existing publishing/editing permissions.

Suggested Practice Times displays at most four non-overlapping ranked windows. On desktop, the practice and player-summary column matches the Team Availability card height; filters and expanded details remain scrollable without stretching the page. Smaller screens retain the stacked responsive layout.

**Worker deployment required for news deletion:** `cloudflare/index.js` is based on the current Worker supplied from `Downloads/EsportsHub/backend/src/index.js`. Its only source change is the scoped DELETE news route. Replace your backend's `src/index.js` with this file and deploy using your existing Worker project, dependencies, bindings, and secrets. No new table, migration, or paid service is needed. The original supplied Worker file has not been overwritten.

Validation: 24 existing regression tests plus two Worker deletion tests pass. The deletion tests cover admins, assigned/unassigned game managers, captains, coaches, team managers, players, guests, missing posts, and cross-team article IDs. Local browser fixtures verified confirmation and deletion refresh, transparent icon styling, map warning details, equal tile heights, and four practice suggestions with aligned desktop columns. Live deployment was not performed.

### Vector branding and public product pages

The supplied Illustrator artwork now provides outlined SVG wordmarks and the E-only favicon. Controller circles and D-pad use genuine transparent vector cutouts; no raster tracing, embedded image, or font download is required for the logo. The Hub layer continues to use the current theme highlight. README logo assets and transparent PNG alternatives were updated as well.

The signed-out home introduces the product with a labeled sample-dashboard screenshot, clear feature/role entry points, and the existing account-entry section. Separate `features.html`, `for-teams.html`, and `about.html` pages provide feature details, role explanations, onboarding, and FAQs with shared navigation and a footer. These information pages do not load Clerk or make Worker calls. Product links use the existing auth query entry point; local home CTAs scroll to the existing auth controls without altering Clerk's hash route. Previous landing element IDs remain available.

Mobile team selection uses full-width bordered rows, with team and game names separated. Teams Map Pool is its own card below NECC & Team Resources. The roster matches the combined resource-column height on desktop, and the cards stack naturally on mobile. Existing map editor permissions, shared-game pool data, restriction icons, and the dashboard map viewer are preserved.

Checks: all 26 existing regression/authorization tests pass; all public-page local links/assets resolve. Browser checks verified mobile team switching, equal desktop roster/resource-column heights, all public pages at 390px without horizontal overflow, and product navigation/account entry using local Clerk fixtures. Live login and deployment were not performed.

## October 19 — Product Site, Availability, and Profile Editor

- Home, Features, For Teams, and About are separate public product pages. Authentication has its own `signin.html` entry point. Existing index auth URLs forward with their query and callback hash intact. The signed-in application continues to use index.html.
- Vector wordmarks and the E favicon were extracted from the supplied Illustrator artwork; transparent cutouts and theme-colored Hub are preserved. Mobile team selectors stack as full-width rows. Teams has separate Resources and Map Pool cards beside the roster.
- Availability selection works as an anchored Excel-style rectangle: drag across days and half hours, shrink back without leaving trails, extend with Shift-click or Shift-arrow, or drag on touch. Cancelled gestures restore their starting state. Existing Save Availability persists the selection.
- Edit Profile uses the full-size profile card as its navigation. Click the name for display name, font and nameplate; avatar/banner for media; identity for account names, username, pronouns, public-name consent and dashboard naming preference; About Me for bio/GIF; presence/status for status controls; Game Accounts for game usernames; Connections for personal links; Theme & Decorations for colors, frames, effects and appearance reset. Each opens a focused editing page with Back to Profile. Moving between pages preserves the same form and drafts. Save Profile saves all changes together.
- Five self-hosted optional name fonts accompany Classic; OFL license files and source URLs are included in assets/fonts. Font and nameplate values are allowlisted in both frontend and Worker. No third-party font requests are needed for these choices.
- Profile banners are rectangular. About Me and other profile content sections use the personal profile background rather than black boxes. Recorded Games Played stays in About Me, separate from Game Accounts; statistics and assigned roles are read-only.
- Navigation avatars always retain an initials fallback if their image fails. Connection settings is visible only in an active admin view, including after switching roles; personal profile links remain available to every member.

Validation: 43 regression and authorization tests, JavaScript syntax checks, local desktop and 390px mobile checks, draft navigation and profile save round trip, role-based Connection visibility, and range-selection checks. Preview saves used local fixtures. Live Clerk/Worker writes and physical-device gestures were not exercised.

### Profile and Status Follow-up

Automatic whole-card shrinking was removed after readability feedback. The editor uses its normal responsive width and the large profile has a viewport-height limit with scrolling, so lower content remains reachable. Status fields have a searchable native emoji picker, with typed/pasted emoji still accepted. The mini profile has Edit Custom Status with emoji, text, expiration, Save, Clear, and Cancel. Its authenticated `/me/custom-status` PATCH updates only the current user's three status JSON keys atomically, preserving unrelated customization. Redeploy the included Worker for this action. Availability time slots show only the temporary hover/focus tooltip; the legacy persistent slot-info panel stays hidden.

### Avatar Decoration and Popup Polish

Avatar Decoration is now beside the avatar upload in Avatar & Banner, with a keyboard-accessible visual picker. All twelve non-empty decorations use square SVG mask geometry, including corner brackets, layered rails, crown/star accents, and pixel trim. The avatar preview and both profile views use the same decoration styles and existing saved frame keys. Colors follow the profile palette. No new backend fields or services are needed. Custom Status uses neutral themed fields and secondary buttons, including autofill and keyboard focus styling. Every open dialog locks the background page; nested dialogs retain the lock until the last closes, and the prior page scroll position is restored. Dialog content can still scroll independently.

### Emoji Popover, Practice Suggestions, and Team Enrollment

- Emoji selection is an anchored non-modal panel inside the current editor. It has 539 unique native emojis across eight categories, category navigation, global keyword search, keyboard navigation, outside-click dismissal and Escape dismissal. Closing it keeps the parent status editor open and the background locked.
- Suggested Practice Times ranks up to six non-overlapping candidates. Desktop shows the complete rows that fit the card; mobile shows no more than six. Available/Unavailable/Not Submitted names and the squad-sized blue availability bar stay visible. An icon-only edit control in the header opens duration/day/hour filters. The redundant shared-availability paragraph is removed.
- Save Availability returns to Team Availability; the separate preview button is removed while editing. Guests do not request private team availability data while browsing public team information.
- New Clerk registrations receive an unassigned Guest role. Existing accounts are not demoted. Invitation creation returns a private human-formatted code instead of a URL. The Worker stores only its SHA-256 hash, with the existing 72-hour expiry, role/team scope, usage limit and atomic redemption protections. Codes accept lowercase and spaces/hyphens. Old invitation links remain compatible.
- Join Team on the Teams page and the dashboard code form allow guests and existing members to review and redeem a code. Joining preserves other team memberships and removes only unassigned placeholder memberships. Guests can access Teams for public roster information and code redemption; private team features still require actual membership.
- Team Manager is consolidated into Game Manager. Legacy assignments are interpreted as Game Manager for their game, and role selection, invitation creation, profiles and NECC sync use the canonical role. Original membership records are retained; no destructive migration is performed. This intentionally gives legacy Team Managers access across teams in their assigned game.
- Edit actions share the dashboard-news transparent pencil design, with accessible labels, tooltips and keyboard focus. Settings navigation and mini-profile menu entries retain text; Edit Custom Status now includes a pencil icon.

Deployment: redeploy the included cloudflare/index.js for guest defaults, invitation codes and unified manager permissions. Keep existing secrets/bindings and database; role-schema compatibility is handled by the existing helper. Validate a new account, code review/redemption, existing memberships, and manager game scope in the deployed environment. Local regression coverage is 43 tests; browser workflows used fixtures rather than production accounts.

## Schedule-First Dashboard and Notes (2026-10-19)

- Pinned dashboard order: Up Next → three summary tiles → full-width Upcoming Schedule. Season Snapshot follows; secondary cards retain per-account custom layouts. Existing saved layouts safely ignore the now-pinned schedule card.
- Schedule rows show full Eastern date/time, event type, opponent, recorded duration, preparation notes, and the existing Event Details action; six additional events maximum, with a Full Schedule link.
- Reports is now Notes in navigation, titles, dashboard actions, and editor copy. Compatibility IDs, #reports links, API routes and old records remain intact.
- A single category tab row replaces duplicate category dropdown/creation shortcuts. New Note uses the selected category and map; the composer still lets authors change them before publishing.
- Map-linked notes and five-slot hero compositions persist separately from rich text. Existing formatting, media, replay codes, authorship and edit permissions remain. Map pool cards open matching map notes.
- Worker creates `eh_note_tactics` additively; legacy edits that omit tactical fields preserve existing metadata. Guest and cross-team access are denied.
- Validation: 47 tests pass; desktop/mobile browser checks cover full-width ordering, category filtering, composition save/render/edit, direct map links, and 390px layouts. Browser writes use local fixtures; deployed Clerk/Worker writes were not exercised.

## Shared Accent Detail Borders

Text/date/time inputs, rich-text editor frames and toolbars, date blocks, note metadata panels, readiness/RSVP details, and their divider rules use `--hud-detail-border` / `--hud-detail-connector`, both derived from the active `--hud-highlight`. Cyber uses lavender; other presets follow their own highlight. Existing outer HUD panels and semantic warning/availability colors retain their separate roles. New grouped detail components should use `.hud-detail-frame` / `[data-detail-frame]` and `.hud-detail-connector` / `[data-detail-connector]` rather than hardcoded border colors.

The shared UI-kit focus token also follows `--hud-highlight`. Keyboard focus for every text field, search input, native select/dropdown, rich editor, and actionable control uses the theme accent; gold is reserved for warnings.

## Single Field Border States

All text/search/date/time inputs, selects and rich editors now use one 1px black resting border. Pointer and keyboard focus recolor that exact border to the current theme highlight, with no extra outline or shadow. Composite search bars and rich editors draw the edge on their wrapper only. Keyboard focus remains visible through that accent border; other button/link focus indicators remain. This shared rule applies to existing and future native fields in the app, sign-in, and dialogs across all presets.

Search and field resting borders now use the same neutral `--border` as the top command bar (dark grey in Cyber), retaining one accent edge on focus. Search inputs, including dynamically generated schedule, roster, notes, concerns, attendance, map-library, and emoji filters, show the same Heroicons magnifier. The command bar keeps its existing SVG; CSS decorates other inputs without changing their DOM or event handlers.

## Fast Profiles and Compact Status

- Warm the authenticated user's profile in parallel with dashboard/team loading; intentional profile hover/focus shares the same scoped request cache. Uploaded banners and trusted avatars begin loading alongside profile details.
- Mini and full profiles synchronously paint valid cached data, then revalidate in the background. Duplicate cache-event paints are suppressed. Account/role changes still clear the scoped cache.
- Status and presence saves patch only the owner's cached data; other cached profiles and image blobs are retained. Replacing the cache entry prevents an older pending refresh from overwriting a saved status.
- Custom status opens immediately with cached values in a compact anchored window. Late responses do not overwrite a typed draft. Save still requires the authenticated Worker response; failure leaves editing available. Escape/outside close, keyboard access, nested emoji picker, and background scroll lock remain.
- Edit Profile and Edit Custom Status labels align left with Log Out. All Roles has a continuous rectangular border, matching neutral/focused field states.
- Validation: 51 tests passed, including shared reads, targeted status updates, pending-request races, and role-scoped eviction. Browser checks use local fixtures; no production latency benchmark is claimed.

## Stable Sidebar and Status Popover

Custom status now uses a manual native popover rather than a modal dialog. The mini profile stays open while editing, selecting emoji, saving, or pressing Escape; outside navigation closes the related surfaces. Status controls participate in the shared field styles.

Scroll locks no longer fix or offset the body. The body uses `overflow: clip` while locked so it does not become an extra scroll container that changes sticky-sidebar behavior. Full modal dialogs retain their background lock and scroll restoration.

Verified in the browser: sidebar top remains 0px when opening both status and full profile at a scrolled position; full-profile opening preserved scrollY=1364. Nested emoji Escape, status Escape, and saving all retained the mini profile. 51 regression tests passed.

### Team and role consistency audit

Shared UI, theme variables, profile/status cache and popovers, dashboard actions, map pools, Notes, and availability remain common implementations for every team. No team-name-specific feature overrides were introduced. Permissions continue to use the active role and the selected team's/game's assignments. Substitutes retain player permissions; staff assignments do not grant private access to unrelated teams or games.

Fixed guest personal Settings navigation so Edit Profile, appearance, account security, and personal preferences are available while Connection stays administrator-only. Fixed invitation return navigation for players (including active Player views) so Back returns to Dashboard instead of looping into Invitations. Guest private team sections remain blocked, players retain Invite Guests instead of Members, and map/news administration remains scoped.

Validation: 56 regression/authorization tests passed. Added a three-team/two-game matrix covering administrator, game manager, coach, captain, player, substitute, guest, and mixed-role account scopes; Worker note authorization was verified across same-game and unrelated-game teams. Browser sample-data checks confirmed guest personal Settings without Connection, player Purple-team actions and invitation return, coach readiness without stuck loading, and public-only event controls for an unrelated team. Live account/Worker mutations were not exercised.

### Notes and Player Concerns organization

Player Concerns uses Notes-style category tabs and search above a single shared frame. The left column selects a private conversation; the right pane retains its thread, rich-text replies, original-message editing, and close/reopen controls. Removed the nested HUD card frames. Filtering preserves the selected conversation when it remains visible; otherwise the first matching concern is selected. Existing role/team privacy checks and Worker routes remain unchanged.

Notes headings and browser titles follow the selected category (Map Notes, Hero Compositions, Reviews, etc.). Concern headings follow Open Concerns, Closed Concerns, or All Concerns. Background refreshes do not replace the current page's title. Validated concern switching, right-pane rendering, status filters, and Map Notes headings in the local preview. All 59 tests pass; no backend deployment change is needed for this interface update.

Concern layout refinement: category tabs and search now sit directly on the page background. The concern selector and selected conversation are independent HUD panels, with no shared outer box. Conversation selection and role restrictions are unchanged. Browser-verified both panels and transparent outer wrapper; 59 tests pass.

Notes categories simplified to All Notes, General, Maps, Compositions, and Scouting. Existing Reviews, Strategy, and Training notes appear under General without a database migration or content deletion. New/edit note category selectors use the same four categories. Category-specific page headings remain descriptive. Verified General includes existing review notes; 60 tests pass.

### Administrative PDF exports, Clerk forms, and transient notices

Administrators can open Organization > Data Export, select all or individual sections, choose A4/US Letter and print-friendly/dark rendering, then download a locally generated PDF. Theme accents and embedded Bai Jamjuree typography carry into section tables, headers, and numbered footers. Dataset counts, export timestamps, scope, absent storage categories and limitations appear up front. Long records continue onto additional pages without truncation. Eastern timestamps retain their original ISO value for auditing. Related user/team/game/event IDs gain names when those datasets are included.

The Worker adds authenticated GET /admin/export. It checks the active administrator role before any database reads, exposes only allowlisted tables/columns, and pages all records in batches of 250. Accounts, assignments, games, teams, lineups, events/durations/results, readiness, RSVPs, attendance, availability, notes/scouting/maps/compositions, private concerns/replies/status, news/resources/map pools/restrictions, NECC metadata, preferences/profiles/connections, invitations/redemptions, trash and moderation history are covered where stored. Uploads are inventoried with MIME/byte sizes, not embedded. Credentials, session tables, invitation codes/hashes, secrets and service counters are excluded. Other users' unsaved drafts, local dashboard layouts and Workshop logs are not server data; the current browser's loaded Workshop analysis is optional. This PDF is an administrative report, not a database backup. Reads are live, not a frozen transaction; edits made during collection may affect the report. Cancellation or a role/account change stops download. No background export polling or third-party PDF service is used.

Deploy the included cloudflare/index.js to the existing Worker before using exports, and upload js/admin-export.js, js/vendor/ (including licenses/embedded PDF fonts), the new assets/fonts/BaiJamjuree-* files/license, and the updated HTML/CSS/portal.js. No new binding, paid storage, or manual migration is required. Vendored libraries: jsPDF 4.2.1 and jsPDF-AutoTable 5.0.9 (MIT); Bai Jamjuree (SIL OFL).

Embedded Clerk forms use one HUD frame, compact spacing, theme tokens, unclipped social buttons and explicit four-sided input/button borders. Authentication options, redirects, validation, password controls, verification flows, Clerk branding and development-mode indicator remain intact. Sign-in/Sign-up selectors use the site's active-tab styling.

Transient notify() messages and connection notices now appear as top-right manual popovers without moving or blocking the page. Five-second notices and eight-second errors include an animated expiration bar and news-style X button, pause on hover/focus, and respect reduced motion. Form validation/errors that require action remain in their form.

Validation: 68 regression/authorization tests pass, including admin export denial for non-admin roles, table/column allowlists, pagination/injection rejection, toast timing/replacement/pause/reduced-motion behavior, and auth appearance/routing. Browser sample-data export downloaded six records in five pages; active-role changes hide Data Export. Live Clerk sign-in and sign-up rendering was checked without submitting credentials; final four-sided CSS borders were additionally verified in a style fixture because the browser session had since signed in. Nine-page PDF sample was rendered/visually reviewed, with long-note tail and accented names confirmed by PDF text extraction. Live production exports/Worker deployment were not performed.
