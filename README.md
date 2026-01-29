# Merge Pull MCP App

GitHub Pull Request management MCP (Model Context Protocol) application. Lists open pull requests and provides merge functionality through an interactive UI.

## Features

- Display list of open pull requests for a repository
- Merge pull requests directly from the UI
- Support for different merge methods (merge, squash, rebase)
- Real-time status updates during merge operations
- Draft PR detection (merge disabled for drafts)

## Prerequisites

- Node.js 18+
- pnpm
- GitHub Personal Access Token with repo permissions

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Set environment variable:

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN=your_token_here
```

## Usage

### Development mode

```bash
pnpm run dev
```

This runs vite in watch mode and the MCP server concurrently.

### Production mode

```bash
pnpm run start
```

This builds the project and starts the server.

The MCP server listens on `http://localhost:3001/mcp` by default.

## MCP Tools

### show_pull_requests

Displays an interactive UI with the list of pull requests.

**Input:**
- `owner` (string): Repository owner (username or organization)
- `repo` (string): Repository name

### list_pull_requests

Returns JSON data of open pull requests.

**Input:**
- `owner` (string): Repository owner
- `repo` (string): Repository name

### merge_pull_request

Merges a specific pull request.

**Input:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `pull_number` (number): Pull request number
- `merge_method` (string): "merge", "squash", or "rebase" (default: "merge")

## Project Structure

```
merge-pull-mcp-app/
├── main.ts              # Server entry point
├── server.ts            # MCP server with tool definitions
├── mcp-app.html         # HTML entry point for UI
├── src/
│   ├── mcp-app-wrapper.tsx  # MCP App connection wrapper
│   ├── pr-list-app.tsx      # PR list UI component
│   └── global.css           # Styles
├── dist/                # Built files (generated)
├── vite.config.ts       # Vite build configuration
├── tsconfig.json        # TypeScript config (client)
└── tsconfig.server.json # TypeScript config (server)
```

## License

ISC
