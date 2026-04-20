import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import { StreamableHTTPError } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import {
  classifyMcpAuthenticationError,
  classifyMcpConnectFailure,
} from "./error-classification";
import { McpAuthenticationError, McpConnectionError } from "./errors";

describe("classifyMcpAuthenticationError", () => {
  it.effect("maps UnauthorizedError to McpAuthenticationError", () =>
    Effect.sync(() => {
      const error = classifyMcpAuthenticationError(
        "streamable-http",
        new UnauthorizedError("Unauthorized"),
      );

      expect(error).toBeInstanceOf(McpAuthenticationError);
      expect(error?.transport).toBe("streamable-http");
      expect(error?.message).toContain("Authentication failed");
    }),
  );

  it.effect("maps HTTP 401 streamable errors to McpAuthenticationError", () =>
    Effect.sync(() => {
      const error = classifyMcpAuthenticationError(
        "streamable-http",
        new StreamableHTTPError(401, "Unauthorized"),
      );

      expect(error).toBeInstanceOf(McpAuthenticationError);
      expect(error?.transport).toBe("streamable-http");
    }),
  );
});

describe("classifyMcpConnectFailure", () => {
  it.effect("keeps non-auth failures as McpConnectionError", () =>
    Effect.sync(() => {
      const error = classifyMcpConnectFailure("sse", new Error("boom"));

      expect(error).toBeInstanceOf(McpConnectionError);
      expect(error).not.toBeInstanceOf(McpAuthenticationError);
      expect(error.transport).toBe("sse");
      expect(error.message).toContain("boom");
    }),
  );
});
