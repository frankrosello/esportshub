# HUD interface update — October 18, 2026

The static frontend retains its existing Clerk authentication, Worker API, role checks, form IDs, and saved profile customization. No Worker deployment or new Cloudflare service is required for this update.

## Interface changes

- Cyber uses the uploaded HTML's black, lavender, purple, and cyan palette. White, Charcoal, System, and game-inspired presets change the new HUD components as well as page colors.
- A section has one primary action, with consistent dark secondary buttons. Team role chips are shared by rosters, account controls, and profiles.
- The mobile navigation drawer occupies 85% of the viewport. The account avatar moves to the top bar and opens the mini profile and presence controls.
- Search supports keyboard navigation and Command+K on Apple platforms or Ctrl+K elsewhere. The inline dropdown groups accessible pages, teams, and members. Member names honor guest visibility and real-name opt-in. Scoped team reads are cached and reused across search queries; search does not fetch an unrestricted member directory.
- The Base44-style compact notification popover shows reminders, unread counts, relative timestamps, whole-row event/proposal actions, Mark All as Read, and Preferences. Search and Notifications sit directly next to each other.
- Season Snapshot appears full width above the three dashboard totals. Upcoming Schedule and Availability at a Glance share a fixed desktop height; additional event rows scroll within their card. Remaining cards balance into two compact columns.
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

JavaScript syntax checks, fourteen regression tests, original HTML ID/navigation contracts, local asset references, desktop and phone layout checks, and ZIP checksums were verified. Browser checks use local sample data; production Clerk sign-in and Worker writes still require a deployment smoke test.

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

Validated with fourteen regression tests, syntax checks, and local desktop/mobile browser checks. A local substitute assignment was saved through both existing API routes and reflected in the roster and full profile. Production Worker writes were not performed.

## Header and updated wordmark

- Search, Notifications, and View As share a 38 px control height at every breakpoint. The 76 px toolbar and logo header share the same divider baseline.
- The new supplied EsportsHub artwork appears in the sidebar and signed-out header. An SVG mask removes opaque white cutouts while preserving the source artwork and transparent background.
- Esports follows the page text color; Hub follows the same theme highlight as the dashboard name (Cyber lavender `#bd94ed`). Theme changes update the logo immediately.
- Verified matched desktop/mobile control dimensions, mobile search, transparent cutouts, alternate/light theme colors, and no horizontal overflow at 390 px.

## Mobile title and account launcher

- The top bar shows only the current page name on mobile, without the Club Hub prefix or slash. Desktop hides that title entirely.
- The desktop account launcher has no decorative border or clipped corners. Hover and open states use a subtle theme highlight, with visible keyboard focus retained.
- Welcome Back keeps its full size whenever possible and reduces its font only when the complete name exceeds the available width. Verified the full greeting at 390 px and no horizontal overflow at 320 px.
