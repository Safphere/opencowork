---
name: MCP Manager
description: A specialized skill for managing, validating, and debugging Model Context Protocol (MCP) servers.
---

# MCP Manager Skill

This skill allows the Agent to intelligently manage MCP server configurations. Instead of relying on simple regex parsers, this skill uses the Agent's reasoning capabilities to understand, validate, and fix MCP configurations.

## Capabilities

### 1. Intelligent Configuration Parsing
Analyze raw input from users (JSON, shell commands, documentation snippets) and extract valid MCP server configurations.

- **Input**: 
  - Raw JSON (Claude Desktop/VSCode format)
  - Shell commands (e.g., `npx -y @modelcontextprotocol/server-filesystem ...`)
  - Natural language descriptions (e.g., "Install the filesystem server for my Desktop")
- **Action**: 
  - Identify the executable (`npx`, `uvx`, `python`, `node`).
  - construct the correct arguments.
  - Handle environment variables.
- **Output**: Standardized MCP JSON configuration.

### 2. Environment Validation & Fixes
Before adding a server, ensure the environment supports it.

- **Check**:
  - Is `npx` / `node` available?
  - Is `uv` / `python` available?
  - Are paths absolute and valid for the current OS (Windows vs Posix)?
- **Fix**:
  - Auto-correct Windows paths (e.g., escape backslashes).
  - Add `.cmd` extension for npm/npx on Windows if missing.

### 3. Security & Safety Review
Review configurations for potential security risks.

- **Check**: Is the server trying to access sensitive directories (e.g., root, whole user folder) without explicit user intent?
- **Action**: Warn the user or restrict the scope (e.g., suggest limiting filesystem scope).

## Deployment Workflow

When the user requests to add an MCP server, follow this process:

1.  **Analyze**: detailed examination of the input string.
2.  **Validate**: Run `run_command` with `--version` or `--help` (dry run) to check if the tool exists.
    - Example: `npx -y @pkg/server --help`
3.  **Construct**: Build the JSON config.
4.  **Install/Write**: Update the `config.json` file via `mcp_config` tool (or file editing).

## Example Scenarios

### Scenario 1: User pastes a `npx` command
**Input**: `npx -y @modelcontextprotocol/server-filesystem e:\Desktop`
**Agent Action**:
1.  Detects `npx` command.
2.  Checks OS. If Windows, ensures `npx.cmd` is used internally or handled by shell.
3.  Detects path `e:\Desktop`.
4.  Generates JSON:
    ```json
    {
      "mcpServers": {
        "filesystem": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-filesystem", "e:\\Desktop"]
        }
      }
    }
    ```

### Scenario 2: User pastes Claude Desktop Config
**Input**: 
```json
{
  "mcpServers": {
    "git": { "command": "uvx", "args": ["mcp-server-git"] }
  }
}
```
**Agent Action**:
1.  Extracts the `git` server config.
2.  Verifies `uvx` is installed.
3.  Adds it to the local MCP configuration.
