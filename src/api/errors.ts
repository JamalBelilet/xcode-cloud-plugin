export class AppStoreConnectError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "AppStoreConnectError";
    this.statusCode = statusCode;
  }
}

export class AuthenticationError extends AppStoreConnectError {
  constructor(message: string) {
    super(message, 401);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppStoreConnectError {
  constructor(message: string) {
    super(message, 403);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends AppStoreConnectError {
  constructor(message: string) {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppStoreConnectError {
  constructor(message: string) {
    super(message, 409);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppStoreConnectError {
  constructor(message: string) {
    super(message, 429);
    this.name = "RateLimitError";
  }
}

/**
 * Classify an HTTP status code into the appropriate error type.
 */
export function classifyError(
  status: number,
  message: string,
): AppStoreConnectError {
  switch (status) {
    case 401:
      return new AuthenticationError(
        `${message}. Your API key may be expired or invalid — run /xcode-cloud:setup to reconfigure.`,
      );
    case 403:
      return new AuthorizationError(
        `${message}. Check that your API key has the required role (Admin, App Manager, or Developer) in App Store Connect.`,
      );
    case 404:
      return new NotFoundError(
        `${message}. The resource may have been deleted or the ID is incorrect.`,
      );
    case 409:
      return new ConflictError(
        `${message}. The resource may be in a state that conflicts with this operation.`,
      );
    case 429:
      return new RateLimitError(message);
    default:
      return new AppStoreConnectError(message, status);
  }
}

/**
 * Format an error into a user-friendly MCP error response.
 */
export function formatToolError(error: unknown): {
  content: { type: "text"; text: string }[];
  isError: true;
} {
  let message: string;

  if (error instanceof AppStoreConnectError) {
    message = error.message;
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    message = String(error);
  }

  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true,
  };
}
