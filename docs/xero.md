# Xero (frontend)

The backend owns all Xero logic. Full architecture, flows and runbook:
`dooit-finance-api/docs/xero/DEVELOPER_GUIDE.md` (see §12 for this repo).

## Files
| File | Purpose |
|---|---|
| `app/dashboard/client/system-settings/xero/{page.js,actions.js}` | Settings route + server actions |
| `views/xero/index.jsx` | Connect / Sync Now / Disconnect card, status polling, Sync activity (Errors / All) |
| `views/xero/XeroMappingCard.jsx` | Finish setup / Bill settings: expense account, tax rate, bill status, payments, customers — dropdowns fed by `GET /xero/settings`, saved with `PUT /xero/settings` |
| `app/auth/xero/{page.js,actions.js}` | Public sign-up landing + server actions |
| `views/auth/xero/index.jsx` | Pre-filled signup form + automatic sign-in; "waiting for confirmation" screen when the org already belongs to a client |
| `app/auth/xero/confirm/[token]/page.js`, `views/auth/xero/confirm/index.jsx` | Approval page opened from the email sent to the existing client's admin |
| `auth.js` | NextAuth `xero` Credentials provider (redeems a one-time login code) |
| `components/login-form.jsx` | "Continue with Xero" button |
| `components/…/ClientSidebar.js` | System Settings → Xero entry |

## What the integration does
The connected organisation is the client's own Xero, so Dooit invoices go in as **bills** from a Dooit.ai supplier contact, coded to the account and tax rate the client picks. Nothing is sent until the mapping is saved; customer contacts and payments are opt-in; nothing in Xero changes Dooit data. Xero certification forbids typed or assumed account codes — keep every code field a dropdown.

## Conventions
- Calls go through server actions (`fetchWithAuth` / `BASE_URL`) so the JWT never reaches client code. Every action returns `{ ok, status, ...body }`.
- `/auth/*` is public in `middleware.js`, so `/auth/xero` works signed-out.
- On-mount effects that consume single-use secrets (`ticket`, `loginCode`) are guarded with a `useRef` — React StrictMode would otherwise burn them in dev.

## Entry points (`/auth/xero`)
| URL | Meaning |
|---|---|
| `/auth/xero` | Start the flow (also the Xero App Store launch URL) |
| `?ticket=…` | New visitor → pre-filled registration form |
| `?pending=…` | Organisation already belongs to a Dooit client → "waiting for confirmation" (polls every 4 s; the handle is moved to `sessionStorage` and stripped from the URL) |
| `?loginCode=…` | One-time code → signed in, redirected to `/dashboard/client` (after an approved request, only for someone who is already a member of that client) |
| `?error=…&message=…` | Cancelled / already registered / failed → retry |

## Config
- `NEXT_PUBLIC_API_BASE_URL` must end in `/api/v1/`.
- API side: `XERO_POST_CONNECT_URL` = `<web>/dashboard/client/system-settings/xero`, `XERO_SIGNUP_URL` = `<web>/auth/xero`.

## Try it
Run the API with `XERO_*` set (guide §5), `npm run dev` (port 8001), log in as a client admin → **System Settings → Xero**. For signup, sign out and use **Continue with Xero** on `/auth/login`.

## Approval page (`/auth/xero/confirm/<token>`)
Opened from the email to the existing client's registered address. Public route, so signed-out visitors can read the request (organisation + who asked — nothing about the client) and **reject** it. **Approve** goes through `fetchWithAuth` and needs a signed-in client administrator; the API enforces this, the UI mirrors it (signed-out users see "Sign in to approve" — after signing in, reopen the email link). Opening the link never changes anything; only the buttons do.
