# EsportsHub v0.4.8 – Overwatch Game Managers and Purple Theme

- **Game Manager** preview role supervises all teams within its assigned game (Overwatch), including event scheduling, match/report overview, team roster coordination, and private issue documentation in the demo.
- **Admin** retains organization-wide team creation, editing/deletion, administrator settings, and organization appearance controls.
- **Captain** manages only their assigned team; **Player** sees their team, personal availability, and schedule.
- Only **Overwatch** is currently enabled. Game management data is structured to allow more games later; no other game is activated in this release.
- Default appearance is Florida Poly-inspired purple. Existing custom admin-selected colors are preserved, while the old default blue switches to purple.
- Multiple demo game manager profiles can be added under **Settings → Games & game managers**, and selected through the top-bar Game Manager account picker.

**Prototype security notice:** Account switching and authorization are only simulations in browser localStorage. Do not use real disciplinary notes or sensitive information until backend authentication, authorization and private database storage have been implemented.

# EsportsHub v0.3 — Role-Based Workspace Prototype

EsportsHub is an HTML, CSS, and JavaScript prototype intended for eventual deployment on GitHub Pages with a Cloudflare Workers API and Turso database.

## How to open

Open `index.html` in a browser. All preview content is stored in your browser's localStorage; no server, installation, or credentials are required. Use the **View as** control in the top right to switch among Admin, Captain, and Player. Pick a team and player to preview their workspace. Fresh browsers receive a fictional sample roster member for each starting team.

## Role features

| Feature | Player | Captain | Admin |
| --- | --- | --- | --- |
| View assigned team and roster | Yes | Yes | All teams |
| View schedule, match and scrim information | Yes | Yes | Yes |
| Submit weekly playing availability | Yes | Yes | Yes |
| Create and edit events | No | Own team | All teams |
| Submit session attendance and scores | No | Own team | All teams |
| Maintain roster and issue invite links | No | Own team | All teams |
| Record factual player concerns and resolve entries | No | Own team | All teams |
| Create, edit, and delete teams | No | No | Yes |

Other sections include report history, attendance, match results, local CSV export, and theme settings.

## Critical security / privacy notice

**This is only a UI and interaction demonstration, not an authentication system.** Selecting a role in the browser is not logging in. Client-side permissions can be bypassed. All data, including issue notes and sample registrations, is stored locally in localStorage, which is not safe for real sensitive player records. Do **not** store real player conduct, disciplinary, or personal information here. Join links only operate within browser-local demo state: they do not let players join a shared team across devices.

Before the application is used by real club members, implement a proper identity provider, verified member/team roles, API-side authorization in Cloudflare Workers, Turso queries scoped to authenticated membership, secure sessions, audit logs, and real invitation redemption. Provide privacy-aware retention and access practices for player issue records. Never expose Turso credentials in the frontend.

## Files

- `index.html` — application shell and role selector
- `css/style.css` — design and responsive layout
- `js/app.js` — original team, roster, reports, and invitation demo
- `js/roles.js` — player/captain/admin screens, schedule, availability, issue documentation, team deletion

## Deploying frontend

Upload these files to a GitHub repository and enable GitHub Pages. All flows remain browser-local until the backend is connected. No paid services are required to preview.


## v0.3.1 — Account selection persistence

Demo role, team, and selected player are saved in browser localStorage and restored across page navigation, refreshes, and browser tabs. The My Profile page now displays the selected demo role rather than an unrelated local registration profile. These settings only affect the prototype UI and are not secure authentication.

## v0.3.2 — Player navigation fixes

- Route changes now render the appropriate role-scoped page instead of falling back to the original unscoped interface.
- The Teams navigation reads **My team** for players and captains, and shows only their assigned team and its roster. Players have no roster/team-management buttons.
- Schedule and Availability links now render correctly for players, and players can record their own weekly time windows.
- Existing role, team, and player selections remain in browser localStorage.
- Important: this remains a local UI prototype, not real security. Add server-side authentication and permissions before real rollout.


## v0.4.1 — Overwatch test rosters

Preloads the provided Varsity, Ashborn, Ember, Academy, Purple and White roster information, including role slots, starters/substitutes and captains. Several players belong to more than one roster, intentionally represented by separate team-membership records.

On first launch after upgrading, the old generated Sample Player entries are replaced. Any manually added players are kept. The import is marked complete so later refreshes do not overwrite roster edits. To replay the import on an existing browser, remove `eh_roster_seed_v041` from localStorage and refresh (this adds any missing seeded memberships).

All roster and account information is still a browser-only demonstration, not shared between devices.

## v0.4.2 roster correction
DATBOI is only on White, where he is captain. He has been removed from Purple; Purple captain remains unassigned until provided. This update also corrects saved browser demo data once.

## v0.4.4 — Captain assignment correction
Captain badges attach to the first player listed on the role line, not to the substitute. Demo captain assignments: Varsity — Ghost (FDPS); Ashborn — Liondel (HDPS); Ember — QuackMuffin (Tank); Academy — XenXero (Tank); Purple — G0ldenAng3l (MS); White — DATBOI (MS). The one-time migration fixes existing local browser data without erasing reports or availability. This remains a local prototype.

## v0.4.5 roster display
Team rosters now have clearly separated **Starters** and **Substitutes** sections, each organized by Overwatch role. Existing player and captain data is preserved.

## v0.4.6 — Captain account selector
In the top-right demo selector, Captain mode lists only roster members marked as captains for the selected team. Player mode still shows all roster members. A saved player selection is automatically corrected when changing to Captain mode or switching teams. This is a local interface preview, not secure authentication.


## v0.4.7 — Organization theming and multiple demo administrators

In Admin preview, visit **Settings** to edit the organization's display name, initials, accent color, description, and default light/dark/system theme. Add, select, or remove additional admin *profiles* from the same page. The primary administrator cannot be removed. Admin profiles appear in the top-right selector in Admin mode. Data persists to this browser's localStorage.

**Security caveat:** These are demonstration identities and settings, not real logins or authorization. No passwords or actual admin invitations are created. Anyone with access to this client-side demo can switch role or change its data. Connect authentication and enforce role permissions on Cloudflare Workers before using it with real members. Organization-wide settings are local to one browser, not synced across players yet.


## v0.4.9 Game Manager corrections
Game Managers can create, edit and delete teams belonging to their assigned game; manage rosters, player invitations, events, attendance, reports and issue reviews. Teams named both Overwatch and Overwatch 2 are treated as the Overwatch game. Admins retain cross-game control and organization-wide admin/branding settings. These permissions are UI-only in the local demo, not real server-side authorization.

## v0.5 — Games and staff invitation previews

- In **Admin → Settings**, use **Games & Game Managers → Create game** to add a new game to the local catalog. The team editor offers games in that catalog; Game Managers are scoped to their selected game.
- The **Staff invitation links** panel creates and revokes demonstration links for Administrator or Game Manager invitations. It includes game selection for Game Manager invitations.
- Opening an invitation link displays a **registration preview only**. It does not create an account, authenticate a user, securely grant a role, or synchronize data across devices. The link is only a locally stored demonstration: on another browser/device it won't resolve unless that browser has matching local data.
- Never use these links as real access control. Secure invitations require server-side token validation, expiration, single-use redemption, verified authentication and game-specific authorization in Cloudflare Workers + Turso.
