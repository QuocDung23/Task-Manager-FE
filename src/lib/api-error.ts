export type ApiErrorResponseData = {
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
  statusCode?: number;
};

export type ApiError<T = ApiErrorResponseData> = {
  message?: string;
  code?: string;
  timeout?: boolean;
  response?: {
    status?: number;
    data?: T;
  };
};
