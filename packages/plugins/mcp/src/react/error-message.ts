import { Effect } from "effect";

type TaggedExecutorError = {
  readonly _tag?: unknown;
  readonly message?: unknown;
  readonly error?: unknown;
  readonly traceId?: unknown;
};

const MCP_ERROR_TAGS = new Set([
  "McpAuthenticationError",
  "McpConnectionError",
  "McpToolDiscoveryError",
  "McpOAuthError",
]);

const humanizeMcpErrorMessage = (message: string): string => {
  if (
    message.includes("Authentication failed while connecting via streamable-http") &&
    message.includes("\"error\":\"invalid_token\"")
  ) {
    return "Missing or Invalid Access Token";
  }

  return message;
};

const parseStructuredErrorMessage = (value: unknown): string | null => {
  if (typeof value !== "object" || value === null) return null;

  const parsed = value as TaggedExecutorError;
  if (parsed._tag === "InternalError") {
    return typeof parsed.traceId === "string" && parsed.traceId.trim()
      ? `Request failed (${parsed.traceId})`
      : "Request failed";
  }

  if (
    typeof parsed._tag === "string" &&
    MCP_ERROR_TAGS.has(parsed._tag) &&
    typeof parsed.message === "string" &&
    parsed.message.trim()
  ) {
    return humanizeMcpErrorMessage(parsed.message);
  }

  if (typeof parsed.message === "string" && parsed.message.trim()) {
    return humanizeMcpErrorMessage(parsed.message);
  }
  if (typeof parsed.error === "string" && parsed.error.trim()) {
    return parsed.error;
  }
  return null;
};

const parseErrorText = (raw: string): string | null => {
  try {
    return parseStructuredErrorMessage(JSON.parse(raw));
  } catch {
    return raw.trim() ? raw.trim() : null;
  }
};

export const extractMcpClientErrorMessage = async (
  error: unknown,
  fallback: string,
): Promise<string> => {
  const direct = parseStructuredErrorMessage(error);
  if (direct) return direct;

  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { text?: unknown } }).response;
    if (response?.text) {
      try {
        const raw = await Effect.runPromise(response.text as Effect.Effect<string>);
        const parsed = parseErrorText(raw);
        if (parsed) return parsed;
      } catch {
        // Fall through to generic handling below.
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return humanizeMcpErrorMessage(error.message);
  }

  return fallback;
};
