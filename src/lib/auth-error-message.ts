import type { ApiError } from "./api-error";
import { getApiErrorMessage } from "./error-message";

/**
 * Auth-specific error helpers.
 *
 * Why a dedicated helper instead of reusing only `getApiErrorMessage`?
 * - Auth endpoints have well-known failure modes that need a precise, friendly
 *   message (wrong email vs wrong password vs locked account vs already
 *   verified, etc). Generic fallback messages hide the real cause from users.
 * - The backend `auth.service.ts` throws a handful of specific exceptions with
 *   short English messages. We translate them to plain English and add
 *   follow-up CTAs by detecting the error status + payload shape.
 * - Zod validation (HTTP 422) returns a concatenated string like
 *   "email Invalid email address; password Too small: expected string to have
 *   >=6 characters" (Zod 4). We split that into a `fieldErrors` map so the
 *   form can light up the offending inputs individually.
 *
 * The mapping below mirrors the BE codes in `Manage -Task/BE/src/modules/auth/auth.service.ts`
 * and `Manage -Task/BE/src/common/middlewares/validationRequest.middleware.ts`.
 * Any new auth error thrown by BE must be added to the tables below so the UI
 * keeps showing a sensible message.
 */

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type AuthFieldKey =
  | "email"
  | "password"
  | "confirmPassword"
  | "name"
  | "otp";

/**
 * Result of mapping an auth error: a user-facing message + (optional) the
 * field the error belongs to so the form can highlight the right input.
 *
 * `fieldErrors` covers the case where a single error mentions multiple fields
 * (typical for Zod 422) — the view can render each inline in its respective
 * `<FormFieldError>` slot.
 */
export type AuthErrorResult = {
  message: string;
  /** Single-field hint (legacy/simple case). Use `fieldErrors` for multi-field. */
  field?: AuthFieldKey;
  /** Per-field errors extracted from a multi-field message (e.g. Zod 422). */
  fieldErrors?: Partial<Record<AuthFieldKey, string>>;
};

// ----------------------------------------------------------------------------
// Per-flow status mapping (single-field messages)
// ----------------------------------------------------------------------------
//
// Each key is the BE status code (or axios `code`) that the corresponding flow
// can throw. The value is the localized message. Messages are short,
// action-oriented, and consistent with `error-message.ts` style (English).

const LOGIN_MESSAGE: Partial<Record<number, string>> = {
  400: "Incorrect email or password.",
  401: "Incorrect password. Please try again.",
  403: "Your account has been locked. Please contact the administrator.",
  404: "This email is not registered. Please check or create a new account.",
  409: "This email is already registered. Please log in.",
  422: "Email or password is invalid.",
  429: "Too many login attempts. Please wait a moment and try again.",
};

// 422 errors on register come from Zod validation middleware. We keep the
// generic message here as a fallback; the real per-field messages are
// extracted in `parseZod422Message()`.
const REGISTER_MESSAGE: Partial<Record<number, string>> = {
  400: "Invalid registration details. Please check the fields.",
  409: "This email is already registered. Please log in or use another email.",
  422: "Some details are invalid. Please review the highlighted fields.",
  429: "You have registered too many times. Please wait a moment and try again.",
  500: "The server ran into a problem creating your account. Please try again later.",
};

const SEND_OTP_MESSAGE: Partial<Record<number, string>> = {
  400: "Invalid email.",
  404: "This email is not registered. Please check again.",
  409: "An OTP was already sent. Please wait a moment and try again.",
  429: "You have requested OTP too many times. Please wait and try again.",
};

const VERIFY_OTP_MESSAGE: Partial<Record<number, string>> = {
  400: "The OTP code is incorrect or has expired. Please try again.",
  // BE (otp.service.ts `verifyOtp`) returns 401 UNAUTHORIZED "Otp expired"
  // once the code has passed `expiresAt`.
  401: "The OTP code has expired. Please request a new one.",
  404: "This email does not exist in our system.",
  429: "You have verified too many times. Please wait and try again.",
};

const VERIFY_ACCOUNT_MESSAGE: Partial<Record<number, string>> = {
  400: "The OTP code is incorrect or has expired. Please try again.",
  401: "The OTP code has expired. Please request a new one.",
  404: "The account to be verified could not be found. Please register again.",
  409: "This account has already been verified. You can log in now.",
  429: "You have verified too many times. Please wait and try again.",
};

const RESET_PASSWORD_MESSAGE: Partial<Record<number, string>> = {
  400: "The OTP code is incorrect or has expired. Please request a new code.",
  401: "The OTP code has expired. Please request a new one.",
  404: "This email does not exist in our system.",
  422: "The new password is not valid.",
  429: "You have tried resetting your password too many times. Please wait and try again.",
};

// ----------------------------------------------------------------------------
// Per-flow error entry points
// ----------------------------------------------------------------------------

export type AuthFlow =
  | "login"
  | "register"
  | "sendOtp"
  | "verifyOtp"
  | "verifyAccount"
  | "resetPassword";

const TABLE: Record<AuthFlow, Partial<Record<number, string>>> = {
  login: LOGIN_MESSAGE,
  register: REGISTER_MESSAGE,
  sendOtp: SEND_OTP_MESSAGE,
  verifyOtp: VERIFY_OTP_MESSAGE,
  verifyAccount: VERIFY_ACCOUNT_MESSAGE,
  resetPassword: RESET_PASSWORD_MESSAGE,
};

const FALLBACK: Record<AuthFlow, string> = {
  login: "Login failed. Please try again.",
  register: "Registration failed. Please try again.",
  sendOtp: "We could not send the OTP. Please try again.",
  verifyOtp: "The OTP code is incorrect or has expired.",
  verifyAccount: "We could not verify your account. Please try again.",
  resetPassword: "Password reset failed. Please try again.",
};

// ----------------------------------------------------------------------------
// Zod 422 parser
// ----------------------------------------------------------------------------
//
// Backend (Zod 4.3.6) returns: "email Invalid email address; password Too
// small: expected string to have >=6 characters; confirmPassword Password
// confirmation does not match". We split on `;` then on the first space to get
// `(path, rest)`. We map known paths to `AuthFieldKey` and translate the
// message to a friendly string. Zod 3 formats ("String must contain at least…")
// are kept for backward compatibility with older deployment variants.

const ZOD_FIELD_TRANSLATIONS: Record<
  string,
  Partial<Record<AuthFieldKey, string>>
> = {
  "invalid email": { email: "Please enter a valid email address." },
  "must contain at least": {
    password: "Password must be at least 6 characters.",
    confirmPassword: "Confirm password must be at least 6 characters.",
  },
  required: {
    name: "Please enter your name.",
    email: "Please enter your email.",
    password: "Please enter a password.",
    confirmPassword: "Please confirm your password.",
  },
  "string must contain": {
    password: "Password must be at least 6 characters.",
    confirmPassword: "Confirm password must be at least 6 characters.",
  },
  // Zod 4 formats (zod@4.3.6 — also pinned in FE package.json).
  "too small": {
    password: "Password must be at least 6 characters.",
    confirmPassword: "Confirm password must be at least 6 characters.",
    name: "Name must be at least 2 characters.",
    otp: "The OTP code must be 6 characters.",
  },
  "too big": {
    password: "Password must be at most 20 characters.",
    confirmPassword: "Confirm password must be at most 20 characters.",
    otp: "The OTP code must be 6 characters.",
  },
  "password confirmation does not match": {
    confirmPassword: "Passwords do not match.",
  },
  "invalid input: expected string": {
    name: "Please enter your name.",
    email: "Please enter your email.",
    password: "Please enter a password.",
    confirmPassword: "Please confirm your password.",
  },
};

/**
 * Parse a Zod 422 error message into a `field → message` map.
 * Returns `null` if the message doesn't look like a Zod concatenation.
 */
function parseZod422Message(
  message: string,
): Partial<Record<AuthFieldKey, string>> | null {
  const lowered = message.toLowerCase();
  const looksLikeZod =
    lowered.includes("invalid email") ||
    lowered.includes("must contain at least") ||
    lowered.includes("string must contain") ||
    lowered.includes("too small") ||
    lowered.includes("too big") ||
    lowered.includes("password confirmation does not match") ||
    lowered.includes("invalid input: expected string") ||
    /\bemail\s+invalid\b/i.test(message) ||
    /\bpassword\s+string/i.test(message);

  if (!looksLikeZod) return null;

  const result: Partial<Record<AuthFieldKey, string>> = {};
  const parts = message.split(/;\s*/).filter(Boolean);

  for (const rawPart of parts) {
    const part = rawPart.trim();
    const spaceIdx = part.indexOf(" ");
    if (spaceIdx === -1) continue;
    const pathRaw = part.slice(0, spaceIdx).trim().toLowerCase();
    const rest = part
      .slice(spaceIdx + 1)
      .trim()
      .toLowerCase();
    const field = pathRaw as AuthFieldKey;
    if (!isAuthFieldKey(field)) continue;

    // Pick the best matching translation.
    const translation = pickZodTranslation(field, rest);
    if (translation && !result[field]) {
      result[field] = translation;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

function pickZodTranslation(
  field: AuthFieldKey,
  zodRest: string,
): string | undefined {
  for (const [keyword, byField] of Object.entries(ZOD_FIELD_TRANSLATIONS)) {
    if (zodRest.includes(keyword) && byField[field]) {
      return byField[field];
    }
  }
  // Generic fallback per-field for cases Zod emits we haven't catalogued.
  const generic: Record<AuthFieldKey, string> = {
    name: "Name is invalid.",
    email: "Email is invalid.",
    password: "Password is invalid.",
    confirmPassword: "Confirm password is invalid.",
    otp: "OTP code is invalid.",
  };
  return generic[field];
}

function isAuthFieldKey(value: string): value is AuthFieldKey {
  return (
    value === "email" ||
    value === "password" ||
    value === "confirmPassword" ||
    value === "name" ||
    value === "otp"
  );
}

// ----------------------------------------------------------------------------
// Heuristic for "which field should the message attach to?"
// ----------------------------------------------------------------------------

function detectField(
  message: string,
  status?: number,
): AuthFieldKey | undefined {
  const lower = message.toLowerCase();
  if (status === 404) return "email";
  // Check the most specific keywords first so a message mentioning several
  // fields (e.g. a login 422 "Email or password is invalid.") binds to the
  // most actionable input instead of always the email.
  if (lower.includes("otp")) return "otp";
  if (lower.includes("confirm")) return "confirmPassword";
  if (lower.includes("password")) return "password";
  if (lower.includes("name") || lower.includes("user name")) return "name";
  if (lower.includes("email") || lower.includes("mail")) return "email";
  return undefined;
}

// ----------------------------------------------------------------------------
// Public entry point
// ----------------------------------------------------------------------------

/**
 * Translate an auth-related error into a structured result.
 *
 * @param error     unknown thrown by axios / mutation
 * @param flow      which auth endpoint the call belongs to
 * @param options.preferField  force the `field` regardless of message detection
 */
export function getAuthErrorMessage(
  error: unknown,
  flow: AuthFlow,
  options?: {
    preferField?: AuthFieldKey;
  },
): AuthErrorResult {
  const apiError = error as ApiError | undefined;
  const status = apiError?.response?.status;
  const table = TABLE[flow];
  const localizedFromTable = status ? table[status] : undefined;

  const backendMessage =
    apiError?.response?.data?.message ?? apiError?.response?.data?.error ?? "";

  // 1. Network / timeout — keep the wording consistent with `error-message.ts`
  //    so the whole app speaks the same way about connectivity problems.
  const isNetworkOrTimeout =
    apiError?.code === "ECONNABORTED" ||
    apiError?.timeout === true ||
    apiError?.code === "ERR_NETWORK" ||
    !apiError?.response;

  if (isNetworkOrTimeout) {
    return { message: getApiErrorMessage(error, FALLBACK[flow]) };
  }

  // 2. 422 from Zod → return per-field errors AND a generic summary.
  if (status === 422 && backendMessage) {
    const fieldErrors = parseZod422Message(backendMessage);
    if (fieldErrors) {
      return {
        message: localizedFromTable ?? FALLBACK[flow],
        fieldErrors,
        field: firstField(fieldErrors),
      };
    }
  }

  // 3. Pick final message: localized table → backend message → fallback.
  let message: string;
  if (localizedFromTable) {
    message = localizedFromTable;
  } else if (backendMessage && backendMessage.trim().length > 0) {
    message = backendMessage;
  } else {
    message = FALLBACK[flow];
  }

  // 4. Field hint
  const field = options?.preferField ?? detectField(message, status);

  return { message, field };
}

function firstField(
  fieldErrors: Partial<Record<AuthFieldKey, string>>,
): AuthFieldKey | undefined {
  // Prefer email → password → confirmPassword → name → otp ordering so the
  // view knows which field to focus first.
  const order: AuthFieldKey[] = [
    "email",
    "password",
    "confirmPassword",
    "name",
    "otp",
  ];
  for (const key of order) {
    if (fieldErrors[key]) return key;
  }
  return undefined;
}
