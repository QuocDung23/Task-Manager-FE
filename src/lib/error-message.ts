import type { ApiError } from "./api-error";

const NETWORK_MESSAGE =
  "Network error. Please check your internet connection and try again.";
const TIMEOUT_MESSAGE = "Connection timed out. Please try again.";
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
  if (!isApiError(error)) return fallback;

  // 1. Timeout
  if (error.code === "ECONNABORTED" || error.timeout === true) {
    return TIMEOUT_MESSAGE;
  }

  // 2. Network failure / no server response
  if (error.code === "ERR_NETWORK" || !error.response) {
    return NETWORK_MESSAGE;
  }

  // 3-5. Backend message → axios fallback → caller fallback
  const fromBackend =
    error.response.data?.message ?? error.response.data?.error ?? error.message;

  return fromBackend && fromBackend.trim().length > 0 ? fromBackend : fallback;
}

export function getHttpStatusMessage(status?: number): string | null {
  switch (status) {
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 409:
    case 422:
      return "The data is invalid or already exists.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "Server error. Please try again later.";
    default:
      return null;
  }
}

export const DEFAULT_QUERY_ERROR_MESSAGE = FALLBACK_QUERY;
export const DEFAULT_MUTATION_ERROR_MESSAGE = FALLBACK_MUTATION;
