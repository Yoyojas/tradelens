# TradeLens Front-End Build Brief (Milestone 1)

## Context
TradeLens is a web app that helps retail investors keep a structured trade journal and
review their performance by strategy. This milestone delivers the React front end only,
running on mock JSON data with no backend yet. Keep the data shapes compatible with a
later Flask plus PostgreSQL backend so the mock layer can be swapped for a real API.

## Personas
- End user (retail investor): records trades, tags each one with a strategy playbook, reviews performance.
- Administrator (platform operator): curates the strategy playbook library and monitors activity.
  Prioritize the end-user views first; admin views are a secondary target for this milestone.

## Views to build (single-page app with React Router)
1. Auth: registration and login screens using mock auth only.
2. Library: browse, search, and filter a curated strategy playbook library, then adopt a playbook into a personal workspace.
3. Journal: a manual trade entry form (ticker, side, quantity, price, open date, close date, fees, notes)
   with client-side validation, plus a trade history list filterable by date range, ticker, and playbook.
4. Reports: a review dashboard showing win rate, average gain to loss ratio, holding-period distribution,
   and position concentration, both overall and per playbook.

## Mock data
Provide seed JSON for playbooks, trades, tags, and one demo user. Compute the dashboard metrics in the
front end from the seeded trades so the numbers reconcile exactly against the seed data.

## Tech constraints
- React with functional components and hooks.
- React Router for navigation across Library, Journal, and Reports.
- Styling kept in external CSS files under a css/ directory; avoid large inline style blocks. This is a course requirement.
- State managed with useState and useContext. No network or backend calls in this milestone.
- Keep trade and playbook data shapes clean so a REST API can later replace the mock layer without restructuring.

## Out of scope for Milestone 1
Real authentication, backend API, database, server-side CSV import, live market data, payments.

## Deliverable
A running React app demonstrating the four views on mock data, ready for a 5 to 7 minute demo video
covering a solution walkthrough, a code walkthrough, and a discussion of issues and how they were resolved.
Due July 13.
