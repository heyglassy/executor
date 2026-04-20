import {
  UnauthorizedError,
  type OAuthClientProvider,
} from "@modelcontextprotocol/sdk/client/auth.js";
import { SseError } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPError } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { McpAuthenticationError, McpConnectionError } from "./errors";

export type McpConnectFailure = McpAuthenticationError | McpConnectionError;

const toErrorMessage = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

const authenticationMessage = (transport: string, cause: unknown): string => {
  if (cause instanceof UnauthorizedError) {
    return `Authentication failed while connecting via ${transport}: ${cause.message}`;
  }
  return `Authentication failed while connecting via ${transport}: ${toErrorMessage(cause)}`;
};

export const classifyMcpAuthenticationError = (
  transport: string,
  cause: unknown,
): McpAuthenticationError | null => {
  if (cause instanceof UnauthorizedError) {
    return new McpAuthenticationError({
      transport,
      message: authenticationMessage(transport, cause),
    });
  }
  if (cause instanceof SseError && cause.code === 401) {
    return new McpAuthenticationError({
      transport,
      message: authenticationMessage(transport, cause),
    });
  }
  if (cause instanceof StreamableHTTPError && cause.code === 401) {
    return new McpAuthenticationError({
      transport,
      message: authenticationMessage(transport, cause),
    });
  }
  return null;
};

export const classifyMcpConnectFailure = (
  transport: string,
  cause: unknown,
): McpConnectFailure => {
  const authenticationError = classifyMcpAuthenticationError(transport, cause);
  if (authenticationError) return authenticationError;

  return new McpConnectionError({
    transport,
    message: `Failed connecting via ${transport}: ${toErrorMessage(cause)}`,
  });
};

export const toMcpConnectionError = (
  transport: string,
  cause: unknown,
): McpConnectionError =>
  new McpConnectionError({
    transport,
    message: `Failed connecting via ${transport}: ${toErrorMessage(cause)}`,
  });

export type { OAuthClientProvider };
