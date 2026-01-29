/**
 * GitHub Pull Requests MCP Server
 *
 * Provides tools for listing and merging GitHub Pull Requests.
 */
import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
  registerAppTool,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { Octokit } from "@octokit/rest";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

// Works both from source (server.ts) and compiled (dist/server.js)
const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "dist")
  : import.meta.dirname;

const resourceUri = "ui://github-pr/mcp-app.html";

// Octokit instance for GitHub API
const octokit = new Octokit({
  auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
});

// =============================================================================
// Server Setup
// =============================================================================

/**
 * Creates a new MCP server instance with tools and resources registered.
 * Each HTTP session needs its own server instance because McpServer only supports one transport.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "GitHub PR Server",
    version: "1.0.0",
  });

  // Tool 1: show_pull_requests - UI tool to display PRs
  registerAppTool(
    server,
    "show_pull_requests",
    {
      title: "Show Pull Requests",
      description:
        "Display a list of open pull requests for a GitHub repository with merge buttons.",
      inputSchema: {
        owner: z.string().describe("Repository owner (username or organization)"),
        repo: z.string().describe("Repository name"),
      },
      outputSchema: z.object({
        success: z.boolean(),
        count: z.number(),
      }),
      _meta: { ui: { resourceUri } },
    },
    async ({ owner, repo }) => {
      // Fetch PRs to return count
      const { data: pulls } = await octokit.rest.pulls.list({
        owner,
        repo,
        state: "open",
      });

      return {
        content: [
          {
            type: "text",
            text: `Found ${pulls.length} open pull request(s) for ${owner}/${repo}`,
          },
        ],
        structuredContent: { success: true, count: pulls.length },
      };
    },
  );

  // Tool 2: list_pull_requests - Get PR data (called by UI)
  server.registerTool(
    "list_pull_requests",
    {
      title: "List Pull Requests",
      description: "Get a list of open pull requests for a repository",
      inputSchema: {
        owner: z.string().describe("Repository owner"),
        repo: z.string().describe("Repository name"),
      },
    },
    async ({ owner, repo }) => {
      const { data: pulls } = await octokit.rest.pulls.list({
        owner,
        repo,
        state: "open",
      });

      const pullRequests = pulls.map((pr) => ({
        number: pr.number,
        title: pr.title,
        user: pr.user?.login ?? "unknown",
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        html_url: pr.html_url,
        head_ref: pr.head.ref,
        base_ref: pr.base.ref,
        draft: pr.draft,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(pullRequests, null, 2),
          },
        ],
      };
    },
  );

  // Tool 3: merge_pull_request - Merge a PR (called by UI)
  server.registerTool(
    "merge_pull_request",
    {
      title: "Merge Pull Request",
      description: "Merge a pull request",
      inputSchema: {
        owner: z.string().describe("Repository owner"),
        repo: z.string().describe("Repository name"),
        pull_number: z.number().describe("Pull request number"),
        merge_method: z
          .enum(["merge", "squash", "rebase"])
          .default("merge")
          .describe("Merge method"),
      },
    },
    async ({ owner, repo, pull_number, merge_method }) => {
      try {
        const { data } = await octokit.rest.pulls.merge({
          owner,
          repo,
          pull_number,
          merge_method,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                merged: data.merged,
                message: data.message,
                sha: data.sha,
              }),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: message,
              }),
            },
          ],
        };
      }
    },
  );

  // Resource registration
  registerAppResource(
    server,
    resourceUri,
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE, description: "GitHub PR List UI" },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(
        path.join(DIST_DIR, "mcp-app.html"),
        "utf-8",
      );

      return {
        contents: [
          {
            uri: resourceUri,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
          },
        ],
      };
    },
  );

  return server;
}
