/**
 * PR List App Component
 *
 * Displays a list of GitHub Pull Requests with merge buttons.
 */
import { useState, useEffect, useCallback } from "react";
import type { ViewProps } from "./mcp-app-wrapper.tsx";

// =============================================================================
// Types
// =============================================================================

interface PRToolInput {
  owner?: string;
  repo?: string;
}

interface PullRequest {
  number: number;
  title: string;
  user: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  head_ref: string;
  base_ref: string;
  draft: boolean;
}

type MergeStatus = "idle" | "merging" | "merged" | "error";

interface PRMergeState {
  status: MergeStatus;
  message?: string;
}

type PRListAppProps = ViewProps<PRToolInput>;

// =============================================================================
// Helper Functions
// =============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}m ago`;
    }
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// =============================================================================
// Main Component
// =============================================================================

export default function PRListApp({
  toolInputs,
  toolInputsPartial,
  hostContext,
  callServerTool,
  openLink,
  sendLog,
}: PRListAppProps) {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mergeStates, setMergeStates] = useState<Record<number, PRMergeState>>({});

  const owner = toolInputs?.owner ?? toolInputsPartial?.owner;
  const repo = toolInputs?.repo ?? toolInputsPartial?.repo;
  const isStreaming = !toolInputs && !!toolInputsPartial;

  const safeAreaInsets = hostContext?.safeAreaInsets;
  const containerStyle = {
    paddingTop: safeAreaInsets?.top,
    paddingRight: safeAreaInsets?.right,
    paddingBottom: safeAreaInsets?.bottom,
    paddingLeft: safeAreaInsets?.left,
  };

  // Fetch PRs when owner/repo are available
  const fetchPRs = useCallback(async () => {
    if (!owner || !repo) return;

    setIsLoading(true);
    setError(null);

    try {
      sendLog({ level: "info", data: `Fetching PRs for ${owner}/${repo}` });

      const result = await callServerTool({
        name: "list_pull_requests",
        arguments: { owner, repo },
      });

      if (result.content && result.content.length > 0) {
        const textContent = result.content.find((c) => c.type === "text");
        if (textContent && "text" in textContent) {
          const prs = JSON.parse(textContent.text) as PullRequest[];
          setPullRequests(prs);
          sendLog({ level: "info", data: `Loaded ${prs.length} PRs` });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch PRs";
      setError(message);
      sendLog({ level: "error", data: message });
    } finally {
      setIsLoading(false);
    }
  }, [owner, repo, callServerTool, sendLog]);

  // Fetch PRs when inputs change
  useEffect(() => {
    if (owner && repo && !isStreaming) {
      fetchPRs();
    }
  }, [owner, repo, isStreaming, fetchPRs]);

  // Handle merge
  const handleMerge = useCallback(
    async (pr: PullRequest) => {
      if (!owner || !repo) return;

      setMergeStates((prev) => ({
        ...prev,
        [pr.number]: { status: "merging" },
      }));

      try {
        sendLog({ level: "info", data: `Merging PR #${pr.number}` });

        const result = await callServerTool({
          name: "merge_pull_request",
          arguments: {
            owner,
            repo,
            pull_number: pr.number,
            merge_method: "merge",
          },
        });

        if (result.content && result.content.length > 0) {
          const textContent = result.content.find((c) => c.type === "text");
          if (textContent && "text" in textContent) {
            const response = JSON.parse(textContent.text);
            if (response.success) {
              setMergeStates((prev) => ({
                ...prev,
                [pr.number]: { status: "merged", message: response.message },
              }));
              sendLog({ level: "info", data: `PR #${pr.number} merged successfully` });

              // Remove merged PR from list after a delay
              setTimeout(() => {
                setPullRequests((prev) => prev.filter((p) => p.number !== pr.number));
              }, 2000);
            } else {
              setMergeStates((prev) => ({
                ...prev,
                [pr.number]: { status: "error", message: response.error },
              }));
              sendLog({ level: "error", data: `Failed to merge PR #${pr.number}: ${response.error}` });
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Merge failed";
        setMergeStates((prev) => ({
          ...prev,
          [pr.number]: { status: "error", message },
        }));
        sendLog({ level: "error", data: `Merge error: ${message}` });
      }
    },
    [owner, repo, callServerTool, sendLog],
  );

  // Handle view PR
  const handleView = useCallback(
    (pr: PullRequest) => {
      openLink({ url: pr.html_url });
    },
    [openLink],
  );

  // Loading state
  if (isStreaming || (!owner && !repo)) {
    return (
      <div className="pr-container" style={containerStyle}>
        <div className="loading">Loading repository info...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="pr-container" style={containerStyle}>
        <div className="error">{error}</div>
        <button className="refresh-btn" onClick={fetchPRs}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="pr-container" style={containerStyle}>
      <div className="pr-header">
        <h2>
          {owner}/{repo}
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="pr-count">{pullRequests.length} open</span>
          <button
            className="refresh-btn"
            onClick={fetchPRs}
            disabled={isLoading}
          >
            {isLoading ? "..." : "Refresh"}
          </button>
        </div>
      </div>

      {isLoading && pullRequests.length === 0 ? (
        <div className="loading">Loading pull requests...</div>
      ) : pullRequests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">PR</div>
          <p>No open pull requests</p>
        </div>
      ) : (
        <div className="pr-list">
          {pullRequests.map((pr) => {
            const mergeState = mergeStates[pr.number] ?? { status: "idle" };
            const isMerging = mergeState.status === "merging";
            const isMerged = mergeState.status === "merged";
            const hasError = mergeState.status === "error";

            return (
              <div key={pr.number} className="pr-item">
                <div className="pr-info">
                  <div className="pr-title-row">
                    <span className="pr-number">#{pr.number}</span>
                    <span className="pr-title">{pr.title}</span>
                    {pr.draft && <span className="pr-draft">Draft</span>}
                  </div>
                  <div className="pr-meta">
                    <span>by {pr.user}</span>
                    <span>{formatDate(pr.updated_at)}</span>
                    <span className="pr-branch">
                      {pr.head_ref} -&gt; {pr.base_ref}
                    </span>
                  </div>
                  {hasError && mergeState.message && (
                    <div style={{ color: "#da3633", fontSize: 12, marginTop: 4 }}>
                      {mergeState.message}
                    </div>
                  )}
                </div>
                <div className="pr-actions">
                  <button
                    className="view-btn"
                    onClick={() => handleView(pr)}
                  >
                    View
                  </button>
                  <button
                    className={`merge-btn ${mergeState.status}`}
                    onClick={() => handleMerge(pr)}
                    disabled={isMerging || isMerged || pr.draft}
                    title={pr.draft ? "Cannot merge draft PR" : undefined}
                  >
                    {isMerging && <span className="spinner" />}
                    {isMerging ? "Merging..." : isMerged ? "Merged" : hasError ? "Retry" : "Merge"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
