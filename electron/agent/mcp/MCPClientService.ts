import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
// app import removed

export interface MCPServerConfig {
    name: string;
    command: string;
    args: string[];
    env?: Record<string, string>;
}

export class MCPClientService {
    private clients: Map<string, Client> = new Map();
    private configPath: string;

    constructor() {
        this.configPath = path.join(os.homedir(), '.opencowork', 'mcp.json');
    }

    async loadClients() {
        let config: { mcpServers: Record<string, MCPServerConfig> } = { mcpServers: {} };
        try {
            const content = await fs.readFile(this.configPath, 'utf-8');
            config = JSON.parse(content);
        } catch (e) {
            // No config, create default
            console.log('Creating default MCP config');
        }

        if (!config.mcpServers) {
            config.mcpServers = {};
        }

        // Default config logic for MiniMax removed

        for (const [key, serverConfig] of Object.entries(config.mcpServers || {})) {
            await this.connectToServer(key, serverConfig);
        }
    }

    private async connectToServer(name: string, config: MCPServerConfig) {
        if (this.clients.has(name)) return;

        try {
            const finalEnv = { ...(process.env as Record<string, string>), ...config.env };

            // [Restored] Sync API Key from ConfigStore if Base URL matches MiniMax
            // This allows users to use the app's configured key without duplicating it in mcp.json
            const { configStore } = await import('../../config/ConfigStore'); // Dynamic import to avoid cycles if any
            const appApiKey = configStore.getApiKey();
            const appApiUrl = configStore.getApiUrl() || '';

            // Check if we should inject the app's key
            if (name === 'MiniMax' && appApiUrl.includes('minimax') && appApiKey) {
                // Only override if the config env key is placeholder or missing
                const configKey = config.env?.MINIMAX_API_KEY;
                if (!configKey || configKey === "YOUR_API_KEY_HERE" || configKey.includes("API密钥")) {
                    console.log('Injecting App API Key for MiniMax MCP Server');
                    finalEnv['MINIMAX_API_KEY'] = appApiKey;
                }
            }

            const transport = new StdioClientTransport({
                command: config.command,
                args: config.args || [],
                env: finalEnv
            });

            const client = new Client({
                name: "opencowork-client",
                version: "1.0.0",
            }, {
                capabilities: {
                    // Start with empty capabilities
                },
            });

            await client.connect(transport);
            this.clients.set(name, client);
            console.log(`Connected to MCP server: ${name}`);
        } catch (e) {
            console.error(`Failed to connect to MCP server ${name}:`, e);
        }
    }

    async getTools(): Promise<{ name: string; description?: string; input_schema: Record<string, unknown> }[]> {
        const allTools: { name: string; description?: string; input_schema: Record<string, unknown> }[] = [];
        for (const [name, client] of this.clients) {
            try {
                const toolsList = await client.listTools();
                const tools = toolsList.tools.map(t => ({
                    name: `${name}__${t.name}`, // Namespacing tools
                    description: t.description,
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
        // Parse namespaced tool name "server__tool"
        const [serverName, toolName] = name.split('__');
        const client = this.clients.get(serverName);
        if (!client) throw new Error(`MCP Server ${serverName} not found`);

        const result = await client.callTool({
            name: toolName,
            arguments: args
        });

        // Convert MCP result to Anthropic ToolResult
        return JSON.stringify(result);
    }
}
