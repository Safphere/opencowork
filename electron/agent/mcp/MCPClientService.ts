import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { configStore } from '../../config/ConfigStore';

// @ts-ignore - Import new transport type
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { ipcMain } from 'electron';

// Polyfill EventSource for Node environment to support headers in SSE
// @ts-ignore



// Based on Claude Agent SDK documentation
// https://platform.claude.com/docs/zh-CN/agent-sdk/typescript#mcpserverconfig

export interface McpStdioServerConfig {
    type: 'stdio';
    command: string;
    args?: string[];
    env?: Record<string, string>;
    name: string; // Internal App Requirement
    disabled?: boolean; // App specific
    source?: 'builtin' | 'user'; // App specific
}

export interface McpSSEServerConfig {
    type: 'sse';
    url: string;
    headers?: Record<string, string>;
    name: string; // Internal App Requirement
    disabled?: boolean;
    source?: 'builtin' | 'user';
}

export interface McpHttpServerConfig {
    type: 'http';
    url: string;
    headers?: Record<string, string>;
    name: string; // Internal App Requirement
    disabled?: boolean;
    source?: 'builtin' | 'user';
}

export type MCPServerConfig =
    | McpStdioServerConfig
    | McpSSEServerConfig
    | McpHttpServerConfig;


export interface MCPStatus {
    name: string;
    status: 'connected' | 'connecting' | 'error' | 'stopped';
    error?: string;
    config: MCPServerConfig;
}

// --- Built-in Defaults ---
const DEFAULT_MCP_CONFIGS: Record<string, MCPServerConfig> = {
    // === 1. GLM (Zhipu) Suite (4) ===
    "glm-mcp-server": {
        name: "glm-mcp-server",
        type: "stdio",
        command: "npx",
        args: ["-y", "@z_ai/mcp-server"],
        env: { "Z_AI_API_KEY": "{{GLM_API_KEY}}", "Z_AI_MODE": "ZHIPU" },
        source: 'builtin'
    },
    "glm-web-search": {
        name: "glm-web-search",
        type: "http",
        url: "https://open.bigmodel.cn/api/mcp/web_search_prime/mcp",
        headers: { "Authorization": "Bearer {{GLM_API_KEY}}" },
        source: 'builtin'
    },
    "glm-web-reader": {
        name: "glm-web-reader",
        type: "http",
        url: "https://open.bigmodel.cn/api/mcp/web_reader/mcp",
        headers: { "Authorization": "Bearer {{GLM_API_KEY}}" },
        source: 'builtin'
    },
    "glm-zread": {
        name: "glm-zread",
        type: "http",
        url: "https://open.bigmodel.cn/api/mcp/zread/mcp",
        headers: { "Authorization": "Bearer {{GLM_API_KEY}}" },
        source: 'builtin'
    },

    // === 2. ZAI (Overseas) Suite (4) ===
    "zai-mcp-server": {
        name: "zai-mcp-server",
        type: "stdio",
        command: "npx",
        args: ["-y", "@z_ai/mcp-server"],
        env: { "Z_AI_API_KEY": "{{ZAI_API_KEY}}", "Z_AI_MODE": "ZAI" },
        source: 'builtin'
    },
    "zai-web-search": {
        name: "zai-web-search",
        type: "http",
        url: "https://api.z.ai/api/mcp/web_search_prime/mcp",
        headers: { "Authorization": "Bearer {{ZAI_API_KEY}}" },
        source: 'builtin'
    },
    "zai-web-reader": {
        name: "zai-web-reader",
        type: "http",
        url: "https://api.z.ai/api/mcp/web_reader/mcp",
        headers: { "Authorization": "Bearer {{ZAI_API_KEY}}" },
        source: 'builtin'
    },
    "zai-zread": {
        name: "zai-zread",
        type: "http",
        url: "https://api.z.ai/api/mcp/zread/mcp",
        headers: { "Authorization": "Bearer {{ZAI_API_KEY}}" },
        source: 'builtin'
    },

    // === 3. MiniMax Suite (2) ===
    "minimax-cn": {
        name: "minimax-cn",
        type: "stdio",
        command: "uvx",
        args: ["minimax-coding-plan-mcp", "-y"],
        env: {
            "MINIMAX_API_KEY": "{{MINIMAX_CN_API_KEY}}",
            "MINIMAX_API_HOST": "https://api.minimaxi.com"
        },
        source: 'builtin'
    },
    "minimax-intl": {
        name: "minimax-intl",
        type: "stdio",
        command: "uvx",
        args: ["minimax-coding-plan-mcp", "-y"],
        env: {
            "MINIMAX_API_KEY": "{{MINIMAX_INTL_API_KEY}}",
            "MINIMAX_API_HOST": "https://api.minimax.io"
        },
        source: 'builtin'
    }
};

export class MCPClientService {
    private clients: Map<string, Client> = new Map();
    private clientStatus: Map<string, MCPStatus> = new Map();
    private activeConfigPath: string; // The standard mcp.json
    private storageConfigPath: string; // The internal storage (mcp_storage.json)

    getActiveServers(): string[] {
        return Array.from(this.clients.keys());
    }

    constructor() {
        const configDir = path.join(os.homedir(), '.opencowork');
        this.activeConfigPath = path.join(configDir, 'mcp.json');
        this.storageConfigPath = path.join(configDir, 'mcp_storage.json');
        this.registerIPC();
    }

    private registerIPC() {
        ipcMain.removeHandler('mcp:get-all');
        ipcMain.removeHandler('mcp:add-server');
        ipcMain.removeHandler('mcp:remove-server');
        ipcMain.removeHandler('mcp:toggle-server');
        ipcMain.removeHandler('mcp:retry-connection');
        ipcMain.removeHandler('mcp:analyze-config');
        ipcMain.removeHandler('mcp:diagnose-server');

        ipcMain.handle('mcp:get-all', () => this.getAllServers());
        ipcMain.handle('mcp:add-server', (_, jsonConfig) => this.addServer(jsonConfig));
        ipcMain.handle('mcp:remove-server', (_, name) => this.removeServer(name));
        ipcMain.handle('mcp:toggle-server', (_, name, enabled) => this.toggleServer(name, enabled));
        ipcMain.handle('mcp:retry-connection', (_, name) => this.connectToServer(name, this.clientStatus.get(name)!.config));
        ipcMain.handle('mcp:analyze-config', (_, input) => this.analyzeConfig(input));
        ipcMain.handle('mcp:diagnose-server', (_, name) => {
            const status = this.clientStatus.get(name);
            if (status) {
                return this.diagnoseServer(name, status.config);
            }
            return { success: false, message: 'Server not found' };
        });
    }

    public dispose() {
        // Close all clients
        for (const client of this.clients.values()) {
            client.close().catch(console.error);
        }
        this.clients.clear();
    }

    async loadClients() {
        // Strategy:
        // 1. Load Master Storage (mcp_storage.json).
        // 2. If missing, import from existing mcp.json (Migration).
        // 3. Sync Active Config (mcp.json) from Master.
        // 4. Connect enabled servers.

        let masterConfig: Record<string, MCPServerConfig> = {};

        try {
            const storageContent = await fs.readFile(this.storageConfigPath, 'utf-8');
            const json = JSON.parse(storageContent);
            masterConfig = json.mcpServers || {};
        } catch {
            // Migration: Try reading mcp.json
            console.log('No storage found, migrating from mcp.json');
            try {
                const activeContent = await fs.readFile(this.activeConfigPath, 'utf-8');
                const json = JSON.parse(activeContent);
                masterConfig = json.mcpServers || {};
                // Determine 'disabled' state isn't in standard mcp.json, so assume all are enabled
            } catch {
                masterConfig = {};
            }
            // Save initial storage
            await this.writeStorageConfig({ mcpServers: masterConfig });
        }

        // --- MERGE DEFAULTS (Green Version Logic) ---
        // If built-in servers are missing, add them (unless explicitly disabled? standard json doesn't track deleted well, so checking existence is safer for "built-in" re-add)
        // Actually, if user deleted it, we might not want to re-add. But user asked for "Green version open, it is already configured".
        // A simple heuristic: if map is completely empty, definitely add.
        // Or check each default key, if missing, add it.
        for (const [key, defaultConfig] of Object.entries(DEFAULT_MCP_CONFIGS)) {
            if (!masterConfig[key]) {
                masterConfig[key] = { ...defaultConfig };
                // Default enabled logic is implicit (no 'disabled' prop)
            }
        }

        // Save initial storage with merged defaults
        await this.writeStorageConfig({ mcpServers: masterConfig });


        // Initialize Status Map
        // Initialize Status Map & Collect Connection Promises
        const connectionPromises: Promise<void>[] = [];

        for (const [key, serverConfig] of Object.entries(masterConfig)) {
            // Ensure name property exists or inject key
            if (!serverConfig.name) serverConfig.name = key;

            this.updateStatus(key, 'stopped', undefined, serverConfig);

            if (!serverConfig.disabled) {
                // [Optimization] Push to array instead of awaiting sequentially
                // Relaxed Timeout: Just log warning if slow, but don't fail.
                // This allows background loading for slow servers without blocking.
                const connectWithSafeTimeout = async () => {
                    // No rigid timeout rejection. Just fire and forget (from the perspective of "blocking").
                    // But we want to await it in Promise.all so we know when "init" is theoretically done.
                    // User said "Some need to be slower".
                    // So we simply await the connection.
                    try {
                        console.log(`[MCP] Initiating connection to ${key}...`);
                        await this.connectToServer(key, serverConfig);
                    } catch (e: any) {
                        console.error(`[MCP] ${key} connection failed: ${e.message}`);
                        this.updateStatus(key, 'error', `Connection Failed: ${e.message}`);
                    }
                };
                connectionPromises.push(connectWithSafeTimeout());
            }
        }

        // [Optimization] Execute all connections in parallel
        await Promise.all(connectionPromises);

        // Ensure mcp.json is in sync
        await this.syncActiveConfig(masterConfig);
    }

    private updateStatus(name: string, status: MCPStatus['status'], error?: string, config?: MCPServerConfig) {
        const current = this.clientStatus.get(name) || { name, status: 'stopped', config: config! };

        this.clientStatus.set(name, {
            ...current,
            status,
            error,
            config: config || current.config
        });
    }

    async analyzeConfig(input: string) {
        return this.smartParse(input);
    }

    async getAllServers(): Promise<MCPStatus[]> {
        return Array.from(this.clientStatus.values());
    }

    // New Helper: Syncs Storage -> mcp.json
    private async syncActiveConfig(masterServers: Record<string, MCPServerConfig>) {
        const activeServers: Record<string, MCPServerConfig> = {};

        for (const [name, config] of Object.entries(masterServers)) {
            if (!config.disabled) {
                // Create a clean copy without the 'disabled' property for standard tools
                // And we should inject the keys into mcp.json? NO.
                // Standard mcp.json usually has placeholders or actual keys. 
                // If we want "Green version" where user edits keys in Settings, mcp.json works better with Env Vars or placeholder.
                // Claude Desktop uses Env vars.
                // Let's write the config AS IS (with placeholders) to mcp.json, so specific tooling doesn't see secrets?
                // OR we can choose to inject purely runtime.
                // Existing logic: Write clean config.

                const { disabled: _disabled, ...cleanConfig } = config;
                activeServers[name] = cleanConfig as MCPServerConfig;
            }
        }

        await fs.writeFile(this.activeConfigPath, JSON.stringify({ mcpServers: activeServers }, null, 2));
    }

    private async writeStorageConfig(config: { mcpServers: Record<string, MCPServerConfig> }) {
        await fs.writeFile(this.storageConfigPath, JSON.stringify(config, null, 2));
    }

    async addServer(input: string): Promise<{ success: boolean; error?: string; fixedConfig?: MCPServerConfig }> {
        try {
            // Use smart parser first
            const configs = this.smartParse(input);

            if (!configs || configs.length === 0) {
                return { success: false, error: "Could not parse input. Please provide valid JSON or a command string." };
            }

            // For addServer single call, we process the first valid config found.
            const config = configs[0];

            // Basic validation
            // Strict type check
            if (config.type === 'stdio') {
                if (!config.command) {
                    return { success: false, error: "Missing 'command' field for stdio server" };
                }
            } else if (config.type === 'sse' || config.type === 'http') {
                if (!config.url) {
                    return { success: false, error: "Missing 'url' field for remote server" };
                }
            } else {
                // Fallback if type is missing or invalid (though type shows it's discriminated)
                if (!(config as any).type) {
                    return { success: false, error: "Missing 'type' field" };
                }
            }

            // OS-Specific Fixes (Simple inline version of previous Validator logic)
            if (process.platform === 'win32' && config.type === 'stdio' && config.command) {
                const cmd = config.command.toLowerCase();
                if (['npx', 'npm'].includes(cmd) && !cmd.endsWith('.cmd')) {
                    config.command = `${cmd}.cmd`;
                }
            }

            const name = config.name;

            // 1. Update In-Memory Status
            this.updateStatus(name, 'stopped', undefined, config);

            // 2. Read Master Storage
            const storageContent = await fs.readFile(this.storageConfigPath, 'utf-8').catch(() => '{"mcpServers":{}}');
            const masterConfig = JSON.parse(storageContent);

            // 3. Update Master Storage
            if (!masterConfig.mcpServers) masterConfig.mcpServers = {};
            masterConfig.mcpServers[name] = config;
            await this.writeStorageConfig(masterConfig);

            // 4. Sync to Active (if enabled)
            await this.syncActiveConfig(masterConfig.mcpServers);

            // 5. Connect if enabled
            if (!config.disabled) {
                await this.connectToServer(name, config);
            }

            return { success: true, fixedConfig: config };

        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    async removeServer(name: string) {
        // 1. Disconnect
        const client = this.clients.get(name);
        if (client) {
            await client.close();
            this.clients.delete(name);
        }
        this.clientStatus.delete(name);

        // 2. Remove from Storage
        const storageContent = await fs.readFile(this.storageConfigPath, 'utf-8');
        const masterConfig = JSON.parse(storageContent);
        if (masterConfig.mcpServers?.[name]) {
            delete masterConfig.mcpServers[name];
            await this.writeStorageConfig(masterConfig);
        }

        // 3. Sync Active
        await this.syncActiveConfig(masterConfig.mcpServers || {});

        return true;
    }

    async toggleServer(name: string, enabled: boolean) {
        const status = this.clientStatus.get(name);
        if (!status) return;

        // 1. Update Config Object
        status.config.disabled = !enabled;

        // 2. Update Storage
        const storageContent = await fs.readFile(this.storageConfigPath, 'utf-8');
        const masterConfig = JSON.parse(storageContent);
        if (masterConfig.mcpServers?.[name]) {
            masterConfig.mcpServers[name].disabled = !enabled;
            await this.writeStorageConfig(masterConfig);
        }

        // 3. Sync Active (This adds/removes it from mcp.json)
        await this.syncActiveConfig(masterConfig.mcpServers || {});

        // 4. Handle Connection
        this.updateStatus(name, status.status, undefined, status.config); // Update UI state first

        if (enabled) {
            await this.connectToServer(name, status.config);
        } else {
            const client = this.clients.get(name);
            if (client) {
                await client.close();
                this.clients.delete(name);
            }
            this.updateStatus(name, 'stopped'); // Mark stopped
        }
        return this.clientStatus.get(name);
    }

    private async connectToServer(name: string, config: MCPServerConfig) {
        if (this.clients.has(name)) return;

        this.updateStatus(name, 'connecting');

        try {
            // === WINDOWS COMMAND FIX ===
            // Apply Windows-specific command fixes before connecting
            // Must cast or check type because 'command' is not on all types
            let workingConfig = { ...config };

            if (process.platform === 'win32' && workingConfig.type === 'stdio' && workingConfig.command) {
                const cmd = workingConfig.command.toLowerCase();
                if (['npx', 'npm'].includes(cmd) && !cmd.endsWith('.cmd')) {
                    workingConfig.command = `${cmd}.cmd`;
                    console.log(`[MCP] Windows fix: ${config.type === 'stdio' ? config.command : ''} -> ${workingConfig.command}`);
                }
            }

            // === DYNAMIC KEY INJECTION ===
            // 1. Get Global Config
            // const { configStore } = await import('../../config/ConfigStore');
            const allProviders = configStore.getAllProviders();

            // 2. Resolve Keys
            const getKey = (providerId: string) => {
                const p = allProviders[providerId];
                return p ? p.apiKey : '';
            };

            const glmKey = getKey('glm');
            const zaiKey = getKey('zai');
            const minimaxCnKey = getKey('minimax_cn');
            const minimaxIntlKey = getKey('minimax_intl');

            // 3. Helper to replace placeholders or inject known vars
            const injectKeys = (str: string | undefined): string | undefined => {
                if (!str) return str;
                let res = str;
                if (glmKey) res = res.replace(/{{GLM_API_KEY}}/g, glmKey);
                if (zaiKey) res = res.replace(/{{ZAI_API_KEY}}/g, zaiKey);

                // MiniMax Specific
                if (minimaxCnKey) res = res.replace(/{{MINIMAX_CN_API_KEY}}/g, minimaxCnKey);
                if (minimaxIntlKey) res = res.replace(/{{MINIMAX_INTL_API_KEY}}/g, minimaxIntlKey);

                // Fallback for generic MiniMax placeholder
                if (minimaxCnKey || minimaxIntlKey) {
                    res = res.replace(/{{MINIMAX_API_KEY}}/g, minimaxCnKey || minimaxIntlKey);
                }

                return res;
            };

            // 4. Check for Missing Keys (Graceful Failure)
            const hasUnreplacedPlaceholder = (str: string | undefined) => str && str.includes('{{') && str.includes('_API_KEY}}');

            // --- TRANSPORT SETUP ---
            let transport: any;

            if (workingConfig.type === 'sse' || workingConfig.type === 'http') {
                // HTTP/SSE config with Claude Code compatibility
                let urlStr = injectKeys(workingConfig.url);
                const headers = { ...workingConfig.headers };

                // Inject into headers
                let missingKey = false;
                for (const key in headers) {
                    headers[key] = injectKeys(headers[key]) || '';

                    // Specific check for Authorization header which is used for API Keys
                    if (key.toLowerCase() === 'authorization' && (headers[key] === 'Bearer ' || headers[key] === 'Bearer')) {
                        missingKey = true;
                    }

                    if (hasUnreplacedPlaceholder(headers[key])) {
                        missingKey = true;
                    }
                }

                if (missingKey) {
                    console.log(`[MCP] Skipping connection to ${name}: Missing API Key.`);
                    this.updateStatus(name, 'stopped', 'API Key not configured. Please check Settings.');
                    return;
                }

                if (!urlStr) {
                    this.updateStatus(name, 'error', 'Invalid URL configuration');
                    return;
                }

                console.log(`[MCP] Attempting to connect to ${name} (${config.type}): ${urlStr}`);

                try {
                    // Simplified HTTP MCP connection based on SDK source analysis
                    console.log(`[MCP] Connecting to ${name} via HTTP/SSE: ${urlStr}`);

                    // Dynamic import via createRequire to avoid build issues
                    try {
                        const { createRequire } = await import('module');
                        const require = createRequire(import.meta.url);
                        const esModule = require('eventsource');
                        const ES = esModule.default || esModule.EventSource || esModule;

                        // @ts-ignore
                        if (global.EventSource !== ES) {
                            // @ts-ignore
                            global.EventSource = ES;
                            console.log('[MCP] EventSource polyfilled successfully via createRequire for ' + name);
                        }
                    } catch (err) {
                        console.error('[MCP] Failed to import eventsource polyfill:', err);
                    }


                    // Minimal options to avoid complications
                    const transportOptions: any = {};

                    // Only add custom headers if provided


                    // Debug API Key and Headers
                    console.log(`[MCP] Preparing connection to ${name} (${urlStr})`);
                    if (headers['Authorization']) {
                        const authLen = headers['Authorization'].length;
                        // Mask key for safety in logs
                        console.log(`[MCP] Header Authorization present (length: ${authLen})`);
                        if (authLen < 15) {
                            console.warn(`[MCP] WARNING: Authorization header seems too short/invalid!`);
                            this.updateStatus(name, 'error', 'Invalid API Key configuration', config);
                        }
                    } else {
                        console.warn(`[MCP] No Authorization header found for ${name}`);
                    }

                    // Force User-Agent to avoid WAF 400 errors (node-eventsource default might be blocked)
                    headers['User-Agent'] = 'OpenCowork-Client/1.0';
                    headers['Cache-Control'] = 'no-cache';

                    transportOptions.eventSourceInit = {
                        headers: headers
                    };
                    transportOptions.requestInit = {
                        headers: headers
                    };



                    // Use StreamableHTTPClientTransport as recommended by SDK for 'http' and 'sse' types
                    // @ts-ignore
                    transport = new StreamableHTTPClientTransport(new URL(urlStr!), {
                        requestInit: transportOptions.requestInit,
                        // streamableHttp uses requestInit for initial request? or has specific options?
                        // checking source: requestInit is a property of StreamableHTTPClientTransportOptions
                    });


                    // Set up error handler similar to Claude Code
                    transport.onerror = (err: any) => {
                        const errorStr = String(err);
                        const fullErrorText = (err.message || '') + (err.event?.message || '') + errorStr;
                        const isHttpError = fullErrorText.includes('400') || fullErrorText.includes('401') || fullErrorText.includes('403') || fullErrorText.includes('404') || fullErrorText.includes('Non-200');

                        if (isHttpError) {
                            console.warn(`[MCP] Connection refused for ${name}: ${errorStr}`);
                        } else {
                            console.error(`[MCP] Transport error for ${name}:`, err);
                        }

                        // Handle different error types
                        if (fullErrorText.includes('401') || fullErrorText.includes('403')) {
                            this.updateStatus(name, 'error', `Authentication failed. Please check your API key.`, config);
                        } else if (fullErrorText.includes('404')) {
                            this.updateStatus(name, 'error', `MCP endpoint not found. The URL may be incorrect.`, config);
                        } else if (fullErrorText.includes('ECONNREFUSED') || fullErrorText.includes('ENOTFOUND')) {
                            this.updateStatus(name, 'error', `Cannot connect to server. Please check your network connection.`, config);
                        } else if (fullErrorText.includes('400') || fullErrorText.includes('Non-200')) {
                            // For 400 errors, provide helpful message
                            this.updateStatus(name, 'error', `Server rejected the request (400). Check configuration.`, config);
                        } else {
                            this.updateStatus(name, 'error', `Connection error: ${errorStr}`, config);
                        }
                    };


                    console.log(`[MCP] HTTP/SSE transport created for ${name}, connection initiated...`);

                } catch (httpError: any) {
                    console.warn(`[MCP] Failed to initiate HTTP transport for ${name}: ${httpError.message}`);
                    this.updateStatus(name, 'error', `Failed to create transport: ${httpError.message}`, config);
                    // Do not re-throw, just fail gracefully
                }

            } else if (workingConfig.type === 'stdio') {
                // Stdio config
                const finalEnv = { ...(process.env as Record<string, string>), ...workingConfig.env };

                // Inject into Env
                let missingKey = false;
                for (const key in finalEnv) {
                    const val = finalEnv[key];
                    finalEnv[key] = injectKeys(val) || '';

                    // Check if important keys are empty
                    if ((key.includes('API_KEY') || key.includes('TOKEN')) && !finalEnv[key]) {
                        missingKey = true;
                    }

                    if (hasUnreplacedPlaceholder(finalEnv[key])) {
                        missingKey = true;
                    }
                }

                if (missingKey) {
                    console.log(`[MCP] Skipping connection to ${name}: Missing API Key in ENV.`);
                    this.updateStatus(name, 'stopped', 'API Key not configured in Settings.');
                    return;
                }

                console.log(`[MCP] Connecting to ${name} with command: ${workingConfig.command} ${workingConfig.args?.join(' ')}`);
                transport = new StdioClientTransport({
                    command: workingConfig.command,
                    args: workingConfig.args || [],
                    env: finalEnv
                });
            }

            // Transport Error Handling
            transport.onerror = (err: any) => {
                console.error(`[MCP] Transport error for ${name}:`, err);
                this.updateStatus(name, 'error', `Transport Error: ${err.message}`);
            };

            // Client Capabilities Definition
            // Follows standard MCP client capabilities
            const capabilities: any = {
                sampling: {}, // Support model sampling if server requests it
                roots: {
                    listChanged: true // Allow server to ask for filesystem roots
                }
            };

            const client = new Client({
                name: "opencowork-client",
                version: "1.0.0",
            }, {
                capabilities: capabilities,
            });

            await client.connect(transport);
            this.clients.set(name, client);
            this.updateStatus(name, 'connected');
            console.log(`[MCP] Connected to MCP server: ${name}`);
        } catch (e: any) {
            const errorStr = String(e);
            const jsonError = JSON.stringify(e);
            let errorMsg = e.message || e.event?.message || errorStr;
            const fullErrorText = errorMsg + jsonError;
            const isHttpError = fullErrorText.includes('400') || fullErrorText.includes('401') || fullErrorText.includes('403') || fullErrorText.includes('404') || fullErrorText.includes('Non-200');

            if (isHttpError) {
                console.warn(`[MCP] Failed to connect to ${name}: ${errorStr}`);
            } else {
                console.error(`[MCP] Failed to connect to MCP server ${name}:`, e);
            }

            // More descriptive error
            if (errorMsg.includes('ENOENT')) {
                const cmd = config.type === 'stdio' ? config.command : 'unknown command';
                errorMsg = `Command not found: ${cmd}. Please check if the tool is installed.`;
            } else if (errorMsg.includes('Connection closed')) {
                errorMsg = `Connection closed immediately. Check configuration.`;
            }
            this.updateStatus(name, 'error', errorMsg);
        }
    }

    /**
     * Smartly parses any input string (JSON or Shell Command) into MCP Config(s)
     * Ensures compatibility with Claude Desktop config format where 'type' is inferred.
     */
    private smartParse(input: string): MCPServerConfig[] {
        input = input.trim();
        if (!input) return [];

        const configs: MCPServerConfig[] = [];

        // 1. Try JSON Parse
        let parsed: any;
        try {
            parsed = JSON.parse(input);
        } catch {
            // Retry: User might have pasted a JS object key-value pair without outer braces
            try {
                if (input.includes(':') || input.startsWith('"')) {
                    parsed = JSON.parse(`{${input}}`);
                }
            } catch {
                parsed = null;
            }
        }

        if (parsed) {
            // Helper to infer type if missing
            const inferType = (cfg: any): 'stdio' | 'http' | 'sse' => {
                if (cfg.type) return cfg.type;
                if (cfg.url) return 'http'; // Default to http for URLs (maps to StreamableHTTP)
                if (cfg.command) return 'stdio';
                return 'stdio'; // Fallback
            };

            // A. Standard internal format (Single Config Object)
            // Check if 'parsed' itself IS the config (has command OR url)
            if ((parsed.command || parsed.url) && typeof parsed === 'object') {
                const name = parsed.name || 'untitled-mcp';
                return [{
                    name,
                    type: inferType(parsed),
                    url: parsed.url,
                    headers: parsed.headers,
                    command: parsed.command,
                    args: Array.isArray(parsed.args) ? parsed.args : [],
                    env: parsed.env || {},
                    disabled: !!parsed.disabled,
                    source: 'user'
                } as MCPServerConfig];
            }

            // B. "mcpServers" wrapper (Common in Claude Desktop / VSCode)
            let target = parsed;
            if (parsed.mcpServers) {
                target = parsed.mcpServers;
            }

            // C. Iterate keys to find configs (Nested objects)
            const keys = Object.keys(target);
            for (const key of keys) {
                const val = target[key];
                if (val && typeof val === 'object' && (val.command || val.url || val.type)) {
                    configs.push({
                        name: key,
                        type: inferType(val),
                        url: val.url,
                        headers: val.headers,
                        command: val.command,
                        args: Array.isArray(val.args) ? val.args : [],
                        env: val.env || {},
                        disabled: !!val.disabled,
                        source: 'user'
                    } as MCPServerConfig);
                }
            }

            if (configs.length > 0) return configs;
        }

        // 2. Try Shell Command Parsing
        // Safety: If input starts with '{', it was meant to be JSON but failed. fail early.
        if (input.startsWith('{')) {
            console.warn('[MCP] Input looks like JSON but failed parsing. Aborting shell command check.');
            return [];
        }

        const keywords = ['npx', 'npm', 'uvx', 'python', 'python3', 'node', 'docker', 'java', 'cargo', 'deno', 'code'];
        const firstLine = input.split('\n')[0].trim();
        const firstWord = firstLine.split(/\s+/)[0];

        if (keywords.includes(firstWord) || firstLine.includes(' ') || firstLine.endsWith('.exe')) {
            const parts = this.parseArgs(firstLine);
            if (parts.length === 0) return configs;

            const command = parts[0];
            const args = parts.slice(1);

            // Generate Name from Args
            let name = 'untitled-server';
            const pkgName = args.find(a => a.startsWith('@') || a.includes('/'));
            if (pkgName) {
                const match = pkgName.split('/').pop()?.replace('server-', '');
                if (match) name = match;
            } else {
                const last = args[args.length - 1];
                if (last && !last.startsWith('-')) name = last.split(/[\\/]/).pop() || name;
            }
            name = name.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();

            return [{
                name,
                type: 'stdio',
                command,
                args,
                env: {},
                source: 'user'
            }];
        }

        return configs;
    }

    private parseArgs(commandStr: string): string[] {
        const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
        const args: string[] = [];
        let match;
        while ((match = regex.exec(commandStr)) !== null) {
            args.push(match[1] || match[2] || match[0]);
        }
        return args;
    }

    async diagnoseServer(name: string, config: MCPServerConfig): Promise<{ success: boolean; message: string; details?: any }> {
        console.log(`[MCP] Diagnosing server: ${name}`);

        try {
            if (config.type === 'http' || config.type === 'sse') {
                // Test HTTP/SSE server availability
                const urlStr = config.url;
                if (!urlStr) {
                    return { success: false, message: 'Missing URL configuration' };
                }

                try {
                    // Simple URL format check
                    new URL(urlStr);

                    // Check if it's a known problematic endpoint
                    if (urlStr.includes('bigmodel.cn') || urlStr.includes('api.z.ai')) {
                        return {
                            success: false,
                            message: 'This HTTP endpoint may not be a standard SSE-based MCP server. These endpoints typically require stdio-based connections using the @z_ai/mcp-server package.',
                            details: { suggestion: 'Use the zai-mcp-server stdio configuration instead' }
                        };
                    }

                    return { success: true, message: 'URL format is valid, but server availability cannot be guaranteed without connection attempt' };
                } catch (urlError) {
                    return { success: false, message: `Invalid URL format: ${urlStr}` };
                }
            } else if (config.type === 'stdio') {
                // Check if command is available
                if (!config.command) {
                    return { success: false, message: 'Missing command configuration' };
                }

                return {
                    success: true,
                    message: `Stdio configuration looks valid. Command: ${config.command} ${config.args?.join(' ') || ''}`
                };
            }

            return { success: false, message: 'Unknown server type' };
        } catch (error: any) {
            return { success: false, message: `Diagnosis failed: ${error.message}` };
        }
    }

    async getTools(): Promise<{ name: string; description?: string; input_schema: Record<string, unknown> }[]> {
        const allTools: { name: string; description?: string; input_schema: Record<string, unknown> }[] = [];
        for (const [name, client] of this.clients) {
            try {
                const toolsList = await client.listTools();
                const tools = toolsList.tools.map(t => ({
                    name: `${name}__${t.name}`,
                    description: t.description || '',
                    input_schema: t.inputSchema as Record<string, unknown>
                }));
                allTools.push(...tools);
            } catch (e) {
                console.error(`Error listing tools for ${name}:`, e);
            }
        }
        return allTools;
    }

    async callTool(name: string, args: Record<string, unknown>) {
        const [serverName, toolName] = name.split('__');
        const client = this.clients.get(serverName);
        if (!client) throw new Error(`MCP Server ${serverName} is not connected`);

        const result = await client.callTool({
            name: toolName,
            arguments: args
        });

        return JSON.stringify(result);
    }
}
