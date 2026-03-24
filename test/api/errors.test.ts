import { describe, it, expect } from "vitest";
import {
  classifyError,
  formatToolError,
  AppStoreConnectError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
} from "../../src/api/errors.js";

describe("classifyError", () => {
  it("returns AuthenticationError for 401", () => {
    const error = classifyError(401, "Unauthorized");
    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toContain("Unauthorized");
    expect(error.message).toContain("reconfigure");
  });

  it("returns AuthorizationError for 403", () => {
    const error = classifyError(403, "Forbidden");
    expect(error).toBeInstanceOf(AuthorizationError);
    expect(error.statusCode).toBe(403);
    expect(error.message).toContain("Forbidden");
    expect(error.message).toContain("required role");
  });

  it("returns NotFoundError for 404", () => {
    const error = classifyError(404, "Not found");
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.statusCode).toBe(404);
    expect(error.message).toContain("Not found");
    expect(error.message).toContain("deleted or the ID is incorrect");
  });

  it("returns ConflictError for 409", () => {
    const error = classifyError(409, "Conflict");
    expect(error).toBeInstanceOf(ConflictError);
    expect(error.statusCode).toBe(409);
    expect(error.message).toContain("Conflict");
  });

  it("returns RateLimitError for 429", () => {
    const error = classifyError(429, "Too many requests");
    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.statusCode).toBe(429);
    expect(error.message).toBe("Too many requests");
  });

  it("returns generic AppStoreConnectError for 500", () => {
    const error = classifyError(500, "Internal server error");
    expect(error).toBeInstanceOf(AppStoreConnectError);
    expect(error).not.toBeInstanceOf(AuthenticationError);
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe("Internal server error");
  });
});

describe("formatToolError", () => {
  it("formats AppStoreConnectError", () => {
    const error = new AppStoreConnectError("Something went wrong", 500);
    const result = formatToolError(error);

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toBe("Error: Something went wrong");
  });

  it("formats AuthenticationError with guidance", () => {
    const error = new AuthenticationError("Token expired. Your API key may be expired or invalid — run /xcode-cloud:setup to reconfigure.");
    const result = formatToolError(error);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Token expired");
    expect(result.content[0].text).toContain("reconfigure");
  });

  it("formats plain Error", () => {
    const error = new Error("Network timeout");
    const result = formatToolError(error);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Error: Network timeout");
  });

  it("formats string error", () => {
    const result = formatToolError("something broke");

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Error: something broke");
  });

  it("formats non-standard error value", () => {
    const result = formatToolError(42);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Error: 42");
  });
});
