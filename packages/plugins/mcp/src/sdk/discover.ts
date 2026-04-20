// ---------------------------------------------------------------------------
// MCP tool discovery — connect to an MCP server and list its tools
// ---------------------------------------------------------------------------

import { Effect } from "effect";

import type { McpConnector } from "./connection";
import { McpAuthenticationError, McpToolDiscoveryError } from "./errors";
import { classifyMcpAuthenticationError } from "./error-classification";
import { extractManifestFromListToolsResult, type McpToolManifest } from "./manifest";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Connect to an MCP server and discover all available tools.
 * Returns the parsed manifest containing server metadata and tool entries.
 */
export const discoverTools = (
  connector: McpConnector,
): Effect.Effect<McpToolManifest, McpAuthenticationError | McpToolDiscoveryError> =>
  Effect.gen(function* () {
    const connection = yield* connector.pipe(
      Effect.mapError((err) =>
        err instanceof McpAuthenticationError
          ? err
          : new McpToolDiscoveryError({
              stage: "connect",
              message: `Failed connecting to MCP server: ${err.message}`,
            }),
      ),
    );

    const listResult = yield* Effect.tryPromise({
      try: () => connection.client.listTools(),
      catch: (cause) => {
        const authenticationError = classifyMcpAuthenticationError("remote", cause);
        return authenticationError
          ? authenticationError
          : new McpToolDiscoveryError({
              stage: "list_tools",
              message: `Failed listing MCP tools: ${
                cause instanceof Error ? cause.message : String(cause)
              }`,
            });
      },
    });

    const manifest = extractManifestFromListToolsResult(listResult, {
      serverInfo: connection.client.getServerVersion?.(),
    });

    yield* Effect.promise(() => connection.close().catch(() => {}));

    return manifest;
  });
