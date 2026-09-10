import {
  MutationCache,
  QueryCache,
  QueryClient,
  type QueryMeta,
} from "@tanstack/react-query";
import { toast } from "sonner";

import type { ApiError } from "./api-error";
import {
  DEFAULT_MUTATION_ERROR_MESSAGE,
  DEFAULT_QUERY_ERROR_MESSAGE,
  getApiErrorMessage,
} from "./error-message";

const DEDUPE_WINDOW_MS = 1000;

const lastToastByMessage = new Map<string, number>();

function shouldSkipToastForStatus(error: unknown): boolean {
  const status = (error as ApiError | undefined)?.response?.status;
  return status === 401;
}

function showToastOnce(message: string): void {
  const now = Date.now();
  const previous = lastToastByMessage.get(message);
  if (previous && now - previous < DEDUPE_WINDOW_MS) return;
  lastToastByMessage.set(message, now);
  toast.error(message);
}

function showToast(message: string): void {
  toast.error(message);
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        const meta = (query.meta ?? {}) as QueryMeta & {
          silentError?: boolean;
        };
        if (meta.silentError) return;
        if (shouldSkipToastForStatus(error)) return;
        showToastOnce(getApiErrorMessage(error, DEFAULT_QUERY_ERROR_MESSAGE));
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        // Hook đã tự xử lý → không toast double.
        if (mutation.options.onError) return;
        if (shouldSkipToastForStatus(error)) return;
        showToast(getApiErrorMessage(error, DEFAULT_MUTATION_ERROR_MESSAGE));
      },
    }),
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
