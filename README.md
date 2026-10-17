<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/esportshub-logo-rounded-dark.svg">
    <img src="docs/images/esportshub-logo-rounded.webp" alt="EsportsHub" width="360">
  </picture>
</p>

<p align="center"><strong>A shared workspace for collegiate esports teams.</strong></p>

<p align="center">
  <a href="https://frankrosello.github.io/esportshub/">Open EsportsHub</a> ·
  <a href="#screenshots">Screenshots</a> ·
  <a href="#features">Features</a> ·
  <a href="#user-roles">User Roles</a>
</p>

EsportsHub brings rosters, schedules, availability, reports, and team coordination into one place. Originally created for Florida Polytechnic University Esports, it gives players the information they need at a glance while providing staff with tools to manage their teams.

## Screenshots

Screenshots show the local preview with sample accounts and events, not live member data. Features shown may require backend configuration.

### Overview

Upcoming sessions, team availability, results, notes, and contacts in one dashboard.

![EsportsHub overview dashboard](docs/images/dashboard.png)

<details>
<summary><strong>Team Rosters</strong></summary>

Separate captain, coach, starter, and substitute sections with profile access and lineup controls for authorized staff.

![Team roster with role groups and player controls](docs/images/teams.png)

</details>

<details>
<summary><strong>Schedule</strong></summary>

Team filters, agenda and calendar views, event details, RSVPs, match preparation, and attendance.

![Team schedule and event cards](docs/images/schedule.png)

</details>

<details>
<summary><strong>Availability</strong></summary>

Weekly half-hour availability, teammate coverage, and suggested practice windows in Eastern Time.

![Weekly team availability and editing controls](docs/images/availability.png)

</details>

<details>
<summary><strong>Reports</strong></summary>

Shared scrim notes, VOD reviews, match summaries, and practice reports.

![Reports library and report writing controls](docs/images/reports.png)

</details>

<details>
<summary><strong>Workshop Analysis</strong></summary>

Local Workshop log analysis with player statistics and a report handoff.

![Workshop log analysis and player statistics](docs/images/workshop-analysis.png)

</details>

## Features

### Team and Member Management

- Manage games and teams from Organization, with separate Games & Teams and NECC Sync tabs.
- Open invitations through the Invite button in Members, keeping member management in one place.
- Provide team-scoped Guest access for family, friends, and supporters.
- Organize captains, coaches, starters, and substitutes into clear roster groups.
- Assign roles with team or game scope and support multiple assignments per account.
- Search and filter the member directory; arrange teams by dragging.
- Preview the interface using one of your assigned roles.

### Scheduling and Match Preparation

- Let assigned players and authorized staff create practices, scrims, matches, and other events for their teams.
- Keep event editing, deletion, result management, and attendance management restricted to authorized staff.
- Switch between agenda and calendar views; filter by team or show all accessible teams.
- Collect event RSVPs and choose starters and substitutes for each event.
- Track lineup confirmation, warmup time, and preparation notes.
- Open the NECC match page for captain check-in.
- Sync NECC schedules and results when the required services are configured.
- Show scores awaiting NECC verification as provisional, while preserving saved results when new data is unavailable.
- Share staff-maintained map pools, handbook links, Discord links, and other team resources.
- Display event times in Eastern Time, including daylight saving changes.

### Availability and Attendance

- View teammates’ recurring weekly availability before editing your own.
- Use 30-minute slots with 12-hour time labels and compact time ranges.
- On mobile, hold a block briefly and drag across multiple blocks to select or clear availability; normal swiping scrolls before the hold activates.
- Restore unsaved availability drafts after refreshes or team switches in the current browser tab. Save or Cancel clears the draft.
- Inspect which players are available, unavailable, or have not submitted a schedule.
- Find practice windows based on shared availability.
- Record present, late, excused, absent, or unrecorded attendance.
- Search attendance lists, mark all players present, and review attendance history.

### Reports and Private Concerns

- Write scrim, VOD, match, and practice reports using a document-style editor.
- Format headings, bold and italic text, lists, quotes, and spacing.
- Add map names and VOD replay codes.
- Attach HTTPS links and upload images up to 4 MB; add videos by hosted link.
- Let assigned players create reports and edit their own; authorized staff can edit team reports.
- Submit named private concerns for review by authorized game managers and administrators.
- Let concern authors view their own conversations, edit the original submission, and exchange formatted replies with authorized reviewers.
- Let game managers and administrators close and reopen concerns; closed conversations reject new replies.
- Search concern conversations without exposing submissions to unrelated teammates.

### Built-In Workshop Analysis

- Import Overwatch Workshop Inspector text logs and analyze them locally in a browser Web Worker.
- Review map and team results, hero usage, final blows, deaths, eliminations, hero damage, healing, and ultimates used.
- Export analysis as JSON or start a team report with a statistics summary.
- Process logs locally without uploading the raw file; summaries are shared only when published as reports.
- Support Parsertime-style logs up to 20 MB, including partial logs. This is a basic EsportsHub analyzer, not Parsertime’s full rating system.

### Profiles and Personal Preferences

- Complete first-time profile setup and customize a display name, pronouns, bio, status, avatar, and banner.
- Choose primary and accent profile colors, avatar decorations, and banner effects.
- Add an About Me GIF up to 4 MB and up to eight HTTPS profile connections, such as GitHub, LinkedIn, or Battle.net. Connections are links, not verified account integrations.
- Edit account identity, avatar and banner, About Me, presence, and appearance in organized sections.
- Preserve profile drafts during background updates.
- Open a mini profile from the account area or a full profile with About Me and Game Accounts tabs.
- Share Discord and in-game usernames, with a Discord username copy control.
- Display activity-based presence with Away, Do Not Disturb, and Invisible preferences.
- Set a default dashboard team and choose name or username for the greeting.
- Cache loaded profiles during the browser session for faster repeat opens.

### Notifications and Responsive UI

- View in-site notifications and reminders while the site is open.
- Refresh notifications on demand, with reduced background polling.
- Use responsive layouts, a full-width mobile navigation menu, and light/dark themes.
- Keep personalized profile styling separate from the solid-color workspace design.

## User Roles

Permissions depend on the account’s assigned team or game scope.

| Role | Main Capabilities |
|---|---|
| **Administrator** | Manage organization-wide games, teams, members, assignments, and private concerns. |
| **Game Manager** | Oversee assigned games and their teams; review private concerns for those games. |
| **Team Manager** | Manage assigned team operations, events, lineups, attendance, and NECC syncing. |
| **Captain** | Coordinate assigned team events, lineups, reports, and attendance. |
| **Coach** | Manage assigned team events, reports, lineups, and attendance. |
| **Player** | View assigned teams, create team events, submit availability and RSVPs, write reports, edit their own reports, and follow their private concern conversations. |
| **Guest** | View assigned team rosters, schedules, and resource links. No access to private profiles, reports, concerns, availability, or attendance. |

Captains, coaches, and team managers do not automatically receive access to other players’ private concerns. Unassigned accounts need a team assignment before accessing team tools.

## Technology

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript, Bai Jamjuree |
| API | Cloudflare Workers |
| Database | Turso / libSQL |
| Authentication | Clerk |
| Frontend Hosting | GitHub Pages |
| Uploaded Images | Existing Turso database, accessed through the Worker |
| Workshop Analysis | Local JavaScript Web Worker; no raw log upload |
| Match Integration | NECC / LeagueOS calendar feed and configured result syncing |

## Deployment Notes

The frontend and API deploy separately. Hosting the static frontend alone does not configure authentication, the database, or team services.

- Publish the frontend files with their `css/`, `js/`, and `assets/` folders intact, including `js/workshop.js` for log analysis. Deploy `index.js` as the Worker entry point.
- Configure the Worker, Turso connection, Clerk keys, and permitted frontend origin separately. Keep secrets out of frontend files and Git history.
- Image uploads use the existing Turso database and Worker with a 4 MB limit. Videos use hosted links; no separate storage bucket is required.
- NECC schedule and result syncing require their corresponding backend configuration. Check-ins remain on NECC.
- Notifications are in-site reminders, not closed-browser push notifications.
- New accounts retain the existing default role. Administrators or invitations assign Guest access to a specific team.

## Project Status

EsportsHub is actively developed. The interface and available integrations continue to evolve as team needs change.

## Developer

**Frank Rosello**  
Computer Science Student · Vice President, Florida Poly Esports

[GitHub](https://github.com/frankrosello) · [LinkedIn](https://www.linkedin.com/in/frank-rosello/)

---

EsportsHub is independently developed and is not an official Florida Polytechnic University software product.
