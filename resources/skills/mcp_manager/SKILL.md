---
name: MCP Manager
description: A specialized skill for managing Model Context Protocol (MCP) servers by editing the standard mcp.json configuration file.
---

# MCP Manager Skill

You are an expert in Model Context Protocol (MCP) configuration. Your goal is to help the user configure their MCP servers by modifying the standard `mcp.json` file.

**Principle**: ALWAYS follow the [Claude Agent SDK](https://platform.claude.com/docs/zh-CN/agent-sdk/typescript#mcpserverconfig) standards. Do not invent new tools.

## 1. Locate Configuration

The MCP configuration is stored in `~/.opencowork/mcp.json` (or `mcp.json` in the user's config directory).

- **Action**: Use `read_file` to check the current configuration.


## 2. Platform Intelligence (Reasoning)

**Crucial**: You MUST detect the User's OS to generate valid configurations.
- **Action**: Use `run_command` -> `node -e "console.log(process.platform)"` if unsure.

### A. OS-Specific Rules
| OS | Command Suffix | Path Separator | Env Var Example |
| :--- | :--- | :--- | :--- |
| **Windows** (`win32`) | `.cmd` (for npm/npx), `.exe` | `\\` (Must Escape in JSON) | `set KEY=VALUE` |
| **macOS/Linux** | None (usually) | `/` | `export KEY=VALUE` |

**Windows Naming Fix**:
- If `command` is `npx`, `npm`, `pnpm` -> CHANGE TO `npx.cmd`, `npm.cmd` etc.
- If `command` is an absolute path -> Ensure drive letter allows access (e.g. `c:\\...`).

### B. Configuration Normalization (Auto-Fix)
Users often provide loose commands. You MUST normalize them into `StartIO` format.

**Rule 1: Separate Command & Args**
- ❌ BAD: `"command": "uvx -v mcp-server-git"`
- ✅ GOOD: `"command": "uvx", "args": ["-v", "mcp-server-git"]`

**Rule 2: Path Escaping (JSON Strictness)**
- ❌ BAD: `"args": ["C:\Users\admin\data"]` (JSON syntax error)
- ✅ GOOD: `"args": ["C:\\Users\\admin\\data"]`

### C. Config Migration Intelligence (Copy-Paste Magic)
**Scenario**: User pastes a JSON config from **Cursor**, **VSCode**, or **Claude Desktop**.
**Goal**: Adapt it INSTANTLY to the local environment.

**Heuristics**:
1.  **Command Validation**:
    - If incoming config has `command: "docker"`, check local docker availability.
    - If `command` is an absolute path (e.g. `/Users/name/...`), **WARNING**: This path likely doesn't exist on the current machine.
    - **Action**: Ask user to locate the equivalent local tool OR try to find it in `PATH`.
2.  **Env Var Syntax**:
    - Cursor/VSCode might use `${env:KEY}` syntax.
    - **Action**: Convert to standard `process.env` logic or ask user to set the env var in `mcp.json` 'env' block.
3.  **Argument Cleaning**:
    - Some editors use proprietary flags. Review `args` and remove editor-specific flags if they cause errors.

**Example Migration**:
*Input (Cursor Mac Config)*:
```json
"filesystem": { "command": "/opt/homebrew/bin/uvx", "args": ["mcp-server-filesystem", "/Users/me/work"] }
```
*Reasoning*:
- OS is Windows. `/opt/homebrew/...` is invalid.
- Tool is `uvx`. Check `uvx --version`. Exists? Yes.
- Path `/Users/me/work` is invalid.
*Output (OpenCowork Windows Config)*:
```json
"filesystem": { "command": "uvx.cmd", "args": ["mcp-server-filesystem", "C:\\Users\\Current\\Desktop"] }
```

## 3. Configuration Templates

### StdIO Server (Local)
```json
{
  "server-name": {
    "type": "stdio",
    "command": "npx.cmd",  // <--- Note the .cmd for Windows
    "args": ["-y", "@pkg/server", "arg1"],
    "env": {
      "API_KEY": "..." // Use env vars for secrets
    }
  }
}
```

### HTTP/SSE Server (Remote)
**Validation**: URL must be reachable.
```json
{
  "remote-server": {
    "type": "http", // or "sse"
    "url": "https://api.example.com/mcp", 
    "headers": { "Authorization": "Bearer key" }
  }
}
```

## 4. Apply Configuration (Action)

Once you have the valid JSON object:
1.  Read `mcp.json`.
2.  Parse the JSON.
3.  Add/Update the server entry under `mcpServers`.
4.  Write the file back using `write_file` (or `replace_file_content` if preserving other parts).
5.  **Notify User**: Ask the user to Restart the application to load the new servers.

## Example Workflow

**User**: "Add the git server using uvx."

**Agent**:
1.  **Check**: `run_command` -> `uvx --version` (Ensure it exists).
2.  **Plan**: Config is `{"git": {"type": "stdio", "command": "uvx", "args": ["mcp-server-git"]}}`.
3.  **Read**: `read_file` -> `~/.opencowork/mcp.json`.
4.  **Edit**: Insert the git config into `mcpServers`.
5.  **Write**: Save file.
6.  **Reply**: "Configuration added. Please restart OpenCowork."

