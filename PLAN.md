# Budget AI — Planning Document

## Overview

A household budgeting application built on Laravel + Inertia + React. Families share a **Team** (already scaffolded), and all budget data is scoped to that team. An AI layer categorizes transactions automatically using minimal token usage.

---

## Tech Stack Additions

### shadcn/ui
Already installed (new-york style, neutral base, Lucide icons). Use `npx shadcn@latest add <component>` to add components as needed. All UI components live in `resources/js/components/ui/`. Do not build custom primitives when a shadcn component exists.

### Ziggy
Exposes Laravel named routes to JavaScript so frontend code never hardcodes URLs.

Install:
```bash
composer require tightenco/ziggy
```

Add to `HandleInertiaRequests::share()`:
```php
'ziggy' => fn () => [...Ziggy::generate()->toArray(), 'location' => $request->url()],
```

Import in TypeScript:
```ts
import { route } from 'ziggy-js';
// route('categories.index', { current_team: team.slug })
```

All frontend route calls must use `route()` from `ziggy-js`. Never hardcode URLs in React components.

### Larastan (PHPStan for Laravel)
Not yet installed. Add via:
```bash
composer require --dev larastan/larastan
```
Config file: `phpstan.neon` at project root, level 9.

```neon
includes:
    - vendor/larastan/larastan/extension.neon

parameters:
    paths:
        - app/
    level: 9
    checkMissingIterableValueType: false
```

Run with: `vendor/bin/phpstan analyse`

All PHP code written for this project must pass Larastan at level 9 before being considered complete. This means:
- Full return types on all methods
- No `mixed` types without justification
- Typed properties and constructor promotion
- Proper generic annotations on Eloquent relations (e.g. `@return HasMany<Transaction, Team>`)

---

## Core Concepts

| Concept | Description |
|---|---|
| **Team** | A household. All data is scoped to a team. Already scaffolded. |
| **Budget** | A monthly spending plan for a team. One budget per team per month. |
| **Category** | A named expense/income bucket (e.g. "Groceries", "Rent"). Belongs to a team. |
| **Budget Line** | The allocated amount for a category within a budget. |
| **Transaction** | A financial event (debit or credit). Belongs to a team, optionally linked to a category and budget. |
| **CSV Import** | A batch of transactions uploaded from a bank export file. |

---

## Data Model

### `default_categories` *(global seed table — read-only at runtime)*
| column | type | notes |
|---|---|---|
| id | bigint PK | |
| name | string | e.g. "Groceries" |
| color | string nullable | hex color |
| is_income | boolean | default false |

> Populated by a seeder. Never modified at runtime — serves as the master list copied to new teams.

---

### `categories`
| column | type | notes |
|---|---|---|
| id | bigint PK | |
| team_id | bigint FK | |
| name | string | e.g. "Groceries" |
| color | string nullable | hex color for UI |
| is_income | boolean | default false |
| created_at / updated_at | timestamps | |

> When a team is created, all `default_categories` rows are copied into `categories` for that team. Teams can then rename, delete, or add their own — global defaults are never touched.

---

### `budgets`
| column | type | notes |
|---|---|---|
| id | bigint PK | |
| team_id | bigint FK | |
| month | date | stored as first day of month (2026-03-01) |
| notes | text nullable | |
| created_at / updated_at | timestamps | |

> Unique constraint on `(team_id, month)`.

---

### `budget_lines`
| column | type | notes |
|---|---|---|
| id | bigint PK | |
| budget_id | bigint FK | |
| category_id | bigint FK | |
| allocated_cents | integer | stored in cents to avoid float issues |
| created_at / updated_at | timestamps | |

> Unique constraint on `(budget_id, category_id)`.

---

### `transactions`
| column | type | notes |
|---|---|---|
| id | bigint PK | |
| team_id | bigint FK | |
| category_id | bigint FK nullable | null until categorized |
| csv_import_id | bigint FK nullable | set when imported via CSV |
| transacted_at | date | the actual transaction date |
| description | string | raw description from bank or manual entry |
| amount_cents | integer | positive = income, negative = expense |
| notes | text nullable | user notes |
| categorized_by | enum | `user`, `ai`, `rule` |
| created_at / updated_at | timestamps | |

> Budget assignment is automatic: a transaction belongs to the budget whose `month` matches `transacted_at`. No explicit FK needed — queried by date range. Manual override is not stored on the transaction; instead the user can change `transacted_at` to move it to a different month.

---

### `csv_imports`
| column | type | notes |
|---|---|---|
| id | bigint PK | |
| team_id | bigint FK | |
| user_id | bigint FK | who uploaded |
| filename | string | original filename |
| row_count | integer | total rows parsed |
| status | enum | `pending`, `processing`, `complete`, `failed` |
| created_at / updated_at | timestamps | |

---

## Feature Scope

### Phase 1 — MVP

1. **Budgets**
   - Create a monthly budget for the current team
   - Add budget lines per category with an allocated amount
   - View budget vs. actual (sum of transactions in that month per category)
   - Over/under indicator per line and overall

2. **Transactions**
   - Manual transaction entry (date, description, amount, category)
   - List view with sort (date, amount, category, description)
   - Filter by category, date range, income/expense
   - Edit / delete transactions

3. **CSV Import** *(high priority)*
   - Upload a CSV file exported from a bank
   - Map CSV columns to fields (date, description, amount) via a UI mapping step
   - Parse and preview rows before confirming import
   - AI categorizes each imported transaction (described below)
   - Duplicate detection: skip rows that match existing `(team_id, transacted_at, amount_cents, description)`

4. **Categories**
   - Default categories seeded per team on creation
   - Create / rename / delete custom categories
   - Mark a category as income

5. **Dashboard**
   - Current month budget summary (budget vs. actual, % used)
   - Recent transactions list
   - Quick "add transaction" button

### Phase 2 — Post-MVP

- Savings goals (see model below)
- Reports (monthly trends, category breakdown charts)
- Income tracking summary
- Budget templates (copy last month's budget)

---

## AI Categorization

**Goal:** Classify each transaction description into a category with minimal token usage.

**Approach:**
- Single API call per CSV import batch (not per transaction)
- Send all uncategorized transaction descriptions + the team's category list in one prompt
- Model returns a JSON mapping: `{ "description": "category_name" }`
- Small, fast model (e.g. `claude-haiku-4-5`) for low cost
- Store result as `categorized_by = 'ai'`; user can override (`categorized_by = 'user'`)
- **Rule-based pre-pass:** before hitting the AI, check if description matches a previously user-confirmed categorization for the same team (a simple `description → category` lookup table). This avoids AI calls for known patterns.

> Future: persist confirmed AI categorizations as rules automatically.

---

## Routing Plan

```
GET  /dashboard                          → Dashboard
GET  /budgets                            → Budget list
GET  /budgets/create                     → Create budget
GET  /budgets/{budget}                   → Budget detail (lines + actuals)
PUT  /budgets/{budget}                   → Update budget
GET  /transactions                       → Transaction list (filterable/sortable)
POST /transactions                       → Store transaction (manual)
PUT  /transactions/{transaction}         → Update transaction
DEL  /transactions/{transaction}         → Delete transaction
GET  /imports                            → Import history
POST /imports                            → Upload CSV (step 1)
GET  /imports/{import}/map               → Column mapping (step 2)
POST /imports/{import}/confirm           → Confirm + categorize (step 3)
GET  /categories                         → Manage categories
POST /categories                         → Create category
PUT  /categories/{category}              → Update category
DEL  /categories/{category}             → Delete category
```

All routes are team-scoped via middleware (`auth`, `verified`, current team on user).

---

## Pages (Inertia/React)

| Page | Route |
|---|---|
| `Dashboard` | `/dashboard` |
| `Budgets/Index` | `/budgets` |
| `Budgets/Create` | `/budgets/create` |
| `Budgets/Show` | `/budgets/{budget}` |
| `Transactions/Index` | `/transactions` |
| `Imports/Index` | `/imports` |
| `Imports/Map` | `/imports/{import}/map` |
| `Categories/Index` | `/categories` |

---

## Development Approach — TDD

All features are built test-first using Pest 4:

1. Write failing feature tests that describe the behaviour
2. Write the minimum code to make tests pass
3. Run `vendor/bin/pint --dirty --format agent` to fix style
4. Run `vendor/bin/phpstan analyse` — must pass at level 9
5. All tests must be green before moving to the next feature

Test files live in `tests/Feature/` (one file per feature area, e.g. `CategoryTest.php`).
Use `LazilyRefreshDatabase` (not `RefreshDatabase`) for speed.

---

## Build Order

1. **Categories** — seed defaults, CRUD (foundation everything else depends on)
2. **Budgets** — create/show with budget lines and allocated amounts
3. **Transactions** — manual entry, list, sort, filter
4. **Budget vs. Actual** — wire transactions into budget show page
5. **CSV Import** — upload → map → preview → confirm
6. **AI Categorization** — hook into import confirm step
7. **Dashboard** — assemble from above pieces
8. **Savings Goals + Reports** — Phase 2

---

## Savings Goals (Phase 2)

A separate model, not a category type — goals have their own lifecycle (target, deadline, progress) that doesn't fit cleanly onto a category.

### `savings_goals`
| column | type | notes |
|---|---|---|
| id | bigint PK | |
| team_id | bigint FK | |
| name | string | e.g. "Emergency Fund" |
| target_cents | integer | goal amount |
| deadline | date nullable | optional target date |
| created_at / updated_at | timestamps | |

> Progress is computed: sum of transactions linked to a dedicated "Savings" category (or a category the user pins to this goal). No stored `current_cents` — always derived.

---

## Decisions Log

| # | Question | Decision |
|---|---|---|
| 1 | Category defaults | Global `default_categories` table; copied to each team on creation. Teams can freely customize their copy. |
| 2 | CSV column mapping | Always manual — user maps date, description, amount columns before import. |
| 3 | Budget assignment | Automatic by `transacted_at` month. Override by editing the transaction date. |
| 4 | Savings goals | Separate model (`savings_goals`), not a category type. Phase 2. |
| 5 | UI components | shadcn/ui (already installed, new-york style). Use existing primitives, don't build custom ones. |
| 6 | Static analysis | Larastan at level 9. All PHP must pass before a feature is complete. |
| 7 | Development workflow | TDD — write failing Pest tests first, then implement. |
| 8 | Frontend routing | Ziggy — exposes named Laravel routes to React via `route()`. Never hardcode URLs in components. |
