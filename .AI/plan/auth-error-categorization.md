# Plan: Categorise Errors for Login / Register / Verify / Forgot Password

> Date: 2026-09-10
> Author: Cursor Assistant (per user request)
> Status: **Implemented** (helper + 8 auth files refactored + 5 views). This
> document is kept as the source of truth for review and future expansion.

## 1. Context & Problem

Previously, the FE auth flows (login / register / verify / forgot password)
**could not distinguish error types**, causing these user-facing issues:

- Wrong email / wrong password → toast only said `"Login failed. Please try again."`
  (vague — user did not know whether the email or the password was wrong).
- Unknown email on login → no prompt to register.
- Locked account → toast only said `"Dang ky that bai"` (unaccented Vietnamese,
  wrong flow).
- OTP wrong / expired → no "Resend OTP" CTA.
- Network / timeout during register → looked identical to a validation error;
  user could not tell it was a connectivity issue.
- Form relied on `toast` as the only channel → user lost focus, did not know
  which field to fix.
- ARIA / a11y attributes were missing (screen readers did not announce inline
  errors).

## 2. Goals

1. **Categorise errors clearly** by status code + BE message + flow: unknown
   email, wrong password, locked account, already-registered email,
   wrong/expired OTP, already-verified account, network, timeout, 5xx, etc.
2. **Render inline below the offending field** (not only a toast) so the user
   sees exactly what to fix.
3. **Provide follow-up CTAs** when relevant: "Create account", "Forgot
   password?", "Resend OTP", "Log in instead", "Retry".
4. **Single consistent language** — English, action-oriented, short.
5. **ARIA**: `aria-invalid`, `aria-describedby`, `role="alert"` so screen
   readers announce the error immediately when it appears.
6. **Soft anti-brute-force UX**: count failed login attempts; after N failures
   surface a banner suggesting a password reset (no hard lockout because BE
   rate-limiting is not in place yet).

## 3. Architecture

```text
┌── BE error ──┐
│ axios throw  │──► ApiError (status, code, data.message, ...)
└──────────────┘
       │
       ▼
┌── lib/auth-error-message.ts ──────────────────────────────┐
│ getAuthErrorMessage(error, flow) → { message, field,     │
│   fieldErrors, action }                                   │
│  • TABLE per flow: status → friendly English message     │
│  • parseZod422Message(): splits Zod concatenation into  │
│    per-field errors (e.g. email, password, name)          │
│  • detectField(): guess field from message text          │
│  • pickAuthAction(): choose a CTA based on status        │
└───────────────────────────────────────────────────────────┘
       │
       ▼
┌── Hook (auth/useLogin, useRegister, …) ───────────────────┐
│ No error handling in the hook (avoids React-19           │
│ `set-state-in-effect`). The view passes                   │
│ `mutate(payload, { onError })`.                           │
└───────────────────────────────────────────────────────────┘
       │
       ▼
┌── View (login-view, register-view, verifyOtp-view…) ──────┐
│ onError:                                                   │
│  1) toast.error(mapped.message)                           │
│  2) setFieldErrors({ ...mapped.fieldErrors ?? mapped.field│
│     → message })                                          │
│                                                           │
│ <FormFieldError message={...} /> renders inline under    │
│ the input, with aria-describedby & role="alert".         │
│                                                           │
│ <AuthErrorAlert action={...} /> renders the top-of-form  │
│ summary + CTA (Link for navigation, Button for retry).   │
│                                                           │
│ After BE error: focus the first errored input so SR      │
│ users land on the right place.                           │
└───────────────────────────────────────────────────────────┘
```

### 3.1 Status → message table

| Flow | Status | BE message | UI message (EN) | Field | CTA |
|---|---|---|---|---|---|
| login | 401 | `invalid password` | Incorrect password. Please try again. | password | – |
| login | 403 | `your account has been locked` | Your account has been locked. Please contact the administrator. | form | Forgot password? |
| login | 404 | `email not found` | This email is not registered. Please check or create a new account. | email | Create a new account |
| login | 409 | (defensive) | This email is already registered. Please log in. | email | – |
| login | 429 | (rate-limit BE) | Too many login attempts. Please wait a moment and try again. | form | – |
| login | 5xx / network / timeout | – | Network error / timeout / generic EN | form | – |
| register | 400 | (validation) | Invalid registration details. Please check the fields. | – | – |
| register | 409 | `ConflictException("email")` | This email is already registered. Please log in or use another email. | email | Log in instead |
| register | 422 | (Zod validation) | Some details are invalid. Please review the highlighted fields. | per-field | – |
| register | 429 | (rate-limit) | You have registered too many times. Please wait a moment and try again. | form | – |
| register | 500 | – | The server ran into a problem creating your account. Please try again later. | form | – |
| sendOtp | 404 | `email not found` | This email is not registered. Please double-check. | email | Create a new account |
| sendOtp | 400 | (validation) | Invalid email. | email | – |
| sendOtp | 429 | (rate-limit) | You have requested OTP too many times. Please wait and try again. | email | – |
| verifyOtp | 400 | `Invalid OTP` | The OTP code is incorrect or has expired. Please try again. | otp | Resend OTP code |
| verifyOtp | 404 | `Email not found` | This email does not exist in our system. | otp | – |
| verifyOtp | 429 | (rate-limit) | You have verified too many times. Please wait and try again. | otp | – |
| verifyAccount | 400 | `Invalid OTP` | The OTP code is incorrect or has expired. Please try again. | otp | Resend OTP code |
| verifyAccount | 404 | `not account` | The account to be verified could not be found. Please register again. | otp | – |
| verifyAccount | 409 | `Account is already verified` | This account has already been verified. You can log in now. | otp | → login |
| verifyAccount | 429 | (rate-limit) | You have verified too many times. Please wait and try again. | otp | – |
| resetPassword | 400 | `Invalid OTP` | The OTP code is incorrect or has expired. Please request a new code. | newPassword | Resend OTP code |
| resetPassword | 404 | `Email not found` | This email does not exist in our system. | form | – |
| resetPassword | 422 | (validation) | The new password is not valid. | newPassword | – |
| resetPassword | 429 | (rate-limit) | You have tried resetting your password too many times. Please wait and try again. | form | – |

> **Suggested BE follow-up (out of scope here):** BE could return English
> messages from `auth.service.ts` so the UI keeps the same wording everywhere.
> The helper currently translates EN → EN using the table above; if BE
> changes its message, the helper still prefers the BE message first and only
> falls back to the table when BE sends nothing.

### 3.2 Display channels

| Channel | When to use |
|---|---|
| **Inline `<FormFieldError>`** under the input | always — keeps the user anchored to the field. |
| **`toast.error`** | always (alongside inline) so the user still sees feedback when away from the form. |
| **Top-of-form `<AuthErrorAlert>`** | for non-field errors (network, 5xx, 429, retry CTA). |
| **Auto navigate** | only for `verifyAccount` 409 — push the user to `/login` since the account is already verified. |

## 4. Files Changed

### 4.1 New

| File | Role |
|---|---|
| `src/lib/auth-error-message.ts` | Central helper: per-flow status table, Zod 422 parser, field detection, CTA picker. |
| `src/components/ui/form-field-error.tsx` | Reusable inline error component (`role="alert"`, `AlertCircle` icon, `aria-describedby`). |
| `src/components/ui/auth-error-alert.tsx` | Block-level alert with optional CTA (renders `<Link>` for navigation, `<Button>` for retry). |

### 4.2 Modified

| File | Change |
|---|---|
| `src/features/auth/hooks/useLogin.ts` | Removed legacy `onError` (`"Dang nhap that bai"`); hook now only handles success / navigation. |
| `src/features/auth/hooks/useRegister.ts` | Removed local `type ApiError`; error mapping delegated to the view via `mutate({ onError })`. |
| `src/features/auth/hooks/useSendOtp.ts` | Removed fallback `"Email does not exist!"`. |
| `src/features/auth/hooks/useVerifyOtp.ts` | Removed legacy fallback. |
| `src/features/auth/hooks/useVerifyAccount.ts` | Removed legacy fallback. |
| `src/features/auth/hooks/useResetPassword.ts` | Removed legacy fallback. |
| `src/features/auth/hooks/useResendOtp.ts` | Uses the `sendOtp` flow (same endpoint). |
| `src/components/auth/login-view.tsx` | Inline errors + ARIA + brute-force warning banner. |
| `src/components/auth/register-view.tsx` | Inline errors + ARIA + Zod 422 per-field mapping + focus + retry. |
| `src/components/auth/forgotPassword-view.tsx` | Inline errors + ARIA. |
| `src/components/auth/verifyOtp-view.tsx` | Inline error under OTP. |
| `src/components/auth/verifyAccount-view.tsx` | Inline error under OTP + auto-redirect on 409. |
| `src/components/auth/resetPassword-view.tsx` | Inline errors + ARIA. |
| `src/hooks/auth/useResetPasswordForm.ts` | Returns `fieldErrors` + `clearFieldError` for the view. |

## 5. Architectural Decisions

### 5.1 Why does the helper return `{ message, field, fieldErrors, action }` instead of just a string?

Two display channels (toast + inline) need different data:

- `toast` only needs `message`.
- Field-level rendering needs to know **which input to attach to** and
  potentially a **map of per-field messages** when the BE returns a single
  string covering multiple fields (Zod 422).
- `action` is the CTA shown next to the toast / inline (e.g. "Log in instead").

Returning a structured object is the smallest API that gives the view enough
to render either way.

### 5.2 Why remove `onError` from hooks and use `mutate(..., { onError })` in the view?

- React 19 enforces `react-hooks/set-state-in-effect`. The old pattern of
  `useEffect(() => { if (mutation.error) setState(...) })` triggered the lint
  error.
- Passing an `onError` to `mutate()` is React-Query's official way to handle
  per-call errors, and the callback runs outside any effect so `setState` is
  safe.
- Bonus: each view can have its own error handling (verifyAccount auto-
  redirects on 409, login counts attempts) without modifying the hook.

### 5.3 Why keep `toast.error` even though we have inline errors?

- Toast is a **fallback**: if the user has switched tabs / opened a popup,
  the toast still fires.
- Dropping toasts would lose feedback when the user is not looking at the
  form.
- We accept the minor double-message and rely on the existing
  `query-client.ts` 1-second dedupe window to keep things sane when the same
  message appears from multiple layers.

### 5.4 Why is 429 / brute-force UX a hint rather than a hard lockout?

- The BE does not currently return 429 for login (see `auth.service.ts`).
- A client-side hard lockout is trivially bypassed — it's a UX hint, not
  security.
- When BE adds rate limiting, the helper maps 429 to a friendly message and
  the view can hide the form after N failures without code changes here.

## 6. Verification

- `npx tsc -b --noEmit` — pass
- `npx eslint` on the changed files — pass (0 errors, 0 warnings)
- `npm run build` — pass
- Manual tests:
  - Login with unknown email → "This email is not registered..." under email + toast + CTA "Create a new account".
  - Login with wrong password → "Incorrect password..." under password.
  - Login to a LOCKED account → toast + red banner + CTA "Forgot password?".
  - Login fails 5 times → warning banner + submit button disabled.
  - Register with duplicate email → "This email is already registered..." under email + CTA "Log in instead".
  - Forgot password with unknown email → "This email is not registered..." under email.
  - Verify OTP with wrong code → "The OTP code is incorrect or has expired." under OTP + CTA "Resend OTP code".
  - Verify account 409 (already verified) → toast + auto-navigate to `/login`.
  - Reset password with wrong OTP → "The OTP code is incorrect or has expired." under newPassword.
  - Toggle the network off mid-submit → "Network error. Please check your connection..." + Retry button.

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| BE changes its message / status → English message goes out of sync. | Helper prefers `response.data.message` from BE first, then falls back to the table. |
| BE adds a new status code we haven't catalogued → generic fallback. | The table has a default for every flow; extending the table is mechanical when BE ships a new error. |
| Screen reader reads both toast and inline duplicates. | Both use `role="alert"` but with different content (toast = full, inline = field-specific). SR users still understand which field is wrong. |
| Helper becomes a "god file" if many flows are added. | Already split by `AuthFlow` enum + per-flow tables; adding a new flow is just a new entry. |

## 8. Future Work (not done yet)

- **Server-side rate limit** + UI auto-cooldown after N attempts (when BE is ready).
- **Password strength meter** in register / reset (zxcvbn or custom rules).
- **i18n** if the team later wants EN/VN switch — move the TABLE out into
  `locales/en.json` + `locales/vi.json` and look up by `flow + status`.
- **Captcha** after N failed login attempts (see suggestion in
  `.AI/review-code/project-review-2026-08-26.md`).

## 9. Update Log

### 2026-09-10 — Register hardening (Round 1)

Initial implementation. See `§4` for the file inventory.

### 2026-09-10 — Register hardening (Round 2)

A second review surfaced five issues specific to the register flow:

1. **Zod 422 not split by field**: BE returned
   `"email Invalid email; password String must contain at least 6 character(s); name Required"`
   but the view previously showed only
   `"Invalid registration details. Please check the fields."` — the user
   could not tell which field was wrong.
2. **409 had no CTA**: user had to click "Sign in" in the header manually.
3. **Network errors had no Retry**: user had to re-type everything after the
   connection came back.
4. **No field focus after BE error**: screen reader / keyboard users had to
   hunt for the offending input.
5. **Single-character name passed client-side validation** even though BE
   could later reject it.

Fixes shipped:

- `auth-error-message.ts`: added `parseZod422Message()` which splits the Zod
  concatenation into `fieldErrors: { email, password, ... }` with English
  translations; added `onClickKey: "goToLogin"` for `register` 409; added
  `onClickKey: "retry"` for network/timeout when callers pass `isRetry: true`.
- `components/ui/auth-error-alert.tsx` (new): shared component that renders
  the alert and the CTA, using `<Link>` for navigation and `<Button>` for
  retry.
- `components/auth/register-view.tsx`: handles multi-field errors, focuses
  the first errored input via `requestAnimationFrame`, stores `lastPayload`
  to allow retry without re-typing, validates `name.length >= 2` client-side.

Extra verification: ran an inline Node script against the Zod parser for
four input shapes — all 4/4 produced the expected per-field English message
map.

### 2026-09-10 — Language switch to English

Per user request, all comments, log strings, and user-facing UI strings were
converted from Vietnamese to English across the auth scope:

- `lib/auth-error-message.ts` (helper + tables)
- `components/auth/login-view.tsx`
- `components/auth/register-view.tsx`
- `components/auth/forgotPassword-view.tsx`
- `components/auth/verifyOtp-view.tsx`
- `components/auth/verifyAccount-view.tsx`
- `components/auth/resetPassword-view.tsx`
- `hooks/auth/useResetPasswordForm.ts`

`components/ui/form-field-error.tsx` and `components/ui/auth-error-alert.tsx`
were already in English from the original commit, so they required no
changes.

Verification:

- `npx tsc -b --noEmit` — pass
- `npx eslint` on changed files — pass
- `npm run build` — pass
