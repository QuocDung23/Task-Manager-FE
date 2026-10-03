import type { ApiError } from "./api-error";
import { getLocale, t } from "@/services/i18n";

const FALLBACK_QUERY = "Failed to load data. Please try again.";
const FALLBACK_MUTATION = "Action failed. Please try again.";

type AnyError = ApiError | unknown;

function isApiError(error: AnyError): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    ("response" in error || "code" in error || "message" in error)
  );
}

export function getApiErrorMessage(
  error: AnyError,
  fallback: string = FALLBACK_MUTATION,
): string {
  if (!isApiError(error)) return getLocale() === "vi" ? t("error.unknown") : fallback;

  // 1. Timeout
  if (error.code === "ECONNABORTED" || error.timeout === true) {
    return t("error.timeout");
  }

  // 2. Network failure / no server response
  if (error.code === "ERR_NETWORK" || !error.response) {
    return t("error.network");
  }

  // 3-5. Backend message → axios fallback → caller fallback
  const fromBackend =
    error.response.data?.message ?? error.response.data?.error ?? error.message;

  if (getLocale() === "vi") {
    return getHttpStatusMessage(error.response.status) ?? t("error.unknown");
  }
  return fromBackend && fromBackend.trim().length > 0 ? fromBackend : fallback;
}

export function getHttpStatusMessage(status?: number): string | null {
  switch (status) {
    case 401:
      return t("error.session");
    case 403:
      return t("error.forbidden");
    case 404:
      return t("error.notFound");
    case 409:
    case 422:
      return t("error.invalid");
    case 500:
    case 502:
    case 503:
    case 504:
      return t("error.server");
    default:
      return null;
  }
}

export const DEFAULT_QUERY_ERROR_MESSAGE = FALLBACK_QUERY;
export const DEFAULT_MUTATION_ERROR_MESSAGE = FALLBACK_MUTATION;
