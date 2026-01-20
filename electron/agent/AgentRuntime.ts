import Anthropic from '@anthropic-ai/sdk';
import { BrowserWindow } from 'electron';

import { FileSystemTools, ReadFileSchema, WriteFileSchema, ListDirSchema, RunCommandSchema } from './tools/FileSystemTools';
import { SkillManager } from './skills/SkillManager';
import { MCPClientService } from './mcp/MCPClientService';
import { permissionManager } from './security/PermissionManager';
import { configStore } from '../config/ConfigStore';
import os from 'os';


export type AgentMessage = {
    role: 'user' | 'assistant';
    content: string | Anthropic.ContentBlock[];
    id?: string;
};

export class AgentRuntime {
    private anthropic: Anthropic;
    private history: Anthropic.MessageParam[] = [];
    private windows: BrowserWindow[] = [];
    private fsTools: FileSystemTools;
    private skillManager: SkillManager;
    private mcpService: MCPClientService;
    private abortController: AbortController | null = null;
    private isProcessing = false;
    private pendingConfirmations: Map<string, { resolve: (approved: boolean) => void }> = new Map();
    private artifacts: { path: string; name: string; type: string }[] = [];

    private model: string;

    constructor(apiKey: string, window: BrowserWindow, model: string = 'claude-3-5-sonnet-20241022', apiUrl: string = 'https://api.anthropic.com') {
        this.anthropic = new Anthropic({ apiKey, baseURL: apiUrl });
        this.model = model;
        this.windows = [window];
        this.fsTools = new FileSystemTools();
        this.skillManager = new SkillManager();
        this.mcpService = new MCPClientService();
        // Note: IPC handlers are now registered in main.ts, not here
    }

    // Add a window to receive updates (for floating ball)
    public addWindow(win: BrowserWindow) {
        if (!this.windows.includes(win)) {
            this.windows.push(win);
        }
    }

    public async initialize() {
        console.log('Initializing AgentRuntime...');
        try {
            await this.skillManager.loadSkills();
            await this.mcpService.loadClients();
            console.log('AgentRuntime initialized (Skills & MCP loaded)');
        } catch (error) {
            console.error('Failed to initialize AgentRuntime:', error);
        }
    }

    public removeWindow(win: BrowserWindow) {
        this.windows = this.windows.filter(w => w !== win);
    }

    // Handle confirmation response
    public handleConfirmResponse(id: string, approved: boolean) {
        const pending = this.pendingConfirmations.get(id);
        if (pending) {
            pending.resolve(approved);
            this.pendingConfirmations.delete(id);
        }
    }

    // Clear history for new session
    public clearHistory() {
        this.history = [];
        this.artifacts = [];
        this.notifyUpdate();
    }

    // Load history from saved session
    public loadHistory(messages: Anthropic.MessageParam[]) {
        this.history = messages;
        this.artifacts = [];
        this.notifyUpdate();
    }

    public async processUserMessage(input: string | { content: string, images: string[] }) {
        if (this.isProcessing) {
            throw new Error('Agent is already processing a message');
        }

        this.isProcessing = true;
        this.abortController = new AbortController();

        try {
            await this.skillManager.loadSkills();
            await this.mcpService.loadClients();

            let userContent: string | Anthropic.ContentBlockParam[] = '';

            if (typeof input === 'string') {
                userContent = input;
            } else {
                const blocks: Anthropic.ContentBlockParam[] = [];
                // Process images
                if (input.images && input.images.length > 0) {
                    for (const img of input.images) {
                        // format: data:image/png;base64,......
                        const match = img.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
                        if (match) {
                            blocks.push({
                                type: 'image',
                                source: {
                                    type: 'base64',
                                    media_type: match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                                    data: match[2]
                                }
                            });
                        }
                    }
                }
                // Add text
                if (input.content && input.content.trim()) {
                    blocks.push({ type: 'text', text: input.content });
                } else if (blocks.some(b => b.type === 'image')) {
                    // [Fix] If only images are present, add a default prompt to satisfy API requirements
                    blocks.push({ type: 'text', text: "Please analyze this image." });
                }
                userContent = blocks;
            }

            // Add user message to history
            this.history.push({ role: 'user', content: userContent });
            this.notifyUpdate();

            // Start the agent loop
            await this.runLoop();

        } catch (error: unknown) {
            const err = error as { status?: number; message?: string };
            console.error('Agent Loop Error:', error);

            let errorMessage = err.message || 'An unknown error occurred';

            // [Fix] Handle MiniMax/provider sensitive content errors gracefully
            if (err.status === 500 && (err.message?.includes('sensitive') || JSON.stringify(error).includes('1027'))) {
                errorMessage = 'AI Provider Error: The generated content was flagged as sensitive and blocked by the provider.';
            }

            this.broadcast('agent:error', errorMessage);

            // Add error to history so user sees it in the UI
            this.history.push({ 
                role: 'assistant', 
                content: `❌ **Error**: ${errorMessage}\n\nPlease check your settings (API Key, Model, URL) or try again.` 
            });
            this.notifyUpdate();
        } finally {
            this.isProcessing = false;
            this.abortController = null;
            this.notifyUpdate();
            // Broadcast done event to signal processing is complete
            this.broadcast('agent:done', { timestamp: Date.now() });
        }
    }

    private async runLoop() {
        let keepGoing = true;
        let iterationCount = 0;
        const MAX_ITERATIONS = 30;

        while (keepGoing && iterationCount < MAX_ITERATIONS) {
            iterationCount++;
            console.log(`[AgentRuntime] Loop iteration: ${iterationCount}`);
            if (this.abortController?.signal.aborted) break;

            const tools: Anthropic.Tool[] = [
                ReadFileSchema,
                WriteFileSchema,
                ListDirSchema,
                RunCommandSchema,
                ...(this.skillManager.getTools() as Anthropic.Tool[]),
                ...(await this.mcpService.getTools() as Anthropic.Tool[])
            ];

            // Build working directory context
            const authorizedFolders = permissionManager.getAuthorizedFolders();
            const workingDirContext = authorizedFolders.length > 0
                ? `\n\nWORKING DIRECTORY:\n- Primary: ${authorizedFolders[0]}\n- All authorized: ${authorizedFolders.join(', ')}\n\nYou should primarily work within these directories. Always use absolute paths.`
                : '\n\nNote: No working directory has been selected yet. Ask the user to select a folder first.';

            const skillsDir = os.homedir() + '/.opencowork/skills';
            const systemPrompt = `You are OpenCowork, an advanced AI agent capable of managing files, executing complex tasks, and assisting the user.
            
            TOOL USAGE:
            - Use 'read_file', 'write_file', and 'list_dir' for file operations.
            - Use 'run_command' to execute shell commands, Python scripts, npm commands, etc.
            - You can use skills defined in ~/.opencowork/skills/ - when a skill is loaded, follow its instructions immediately.
            - Skills with a 'core/' directory (like slack-gif-creator) have Python modules you can import directly.
              Example: Set PYTHONPATH to the skill directory and run your script.
            - You can access external tools provided by MCP servers (prefixed with server name).

SKILLS DIRECTORY: ${skillsDir}
${workingDirContext}

            PLANNING:
            - For complex requests, you MUST start with a <plan> block.
            - Inside <plan>, list the steps you will take as <task> items.
            - Mark completed tasks with [x] and pending with [ ] if you update the plan.
            - Example:
              <plan>
                <task>Analyze requirements</task>
                <task>Create implementation plan</task>
                <task>Write code</task>
              </plan>
            
            IMPORTANT:
            - If you use a skill/tool that provides instructions or context (like web-artifacts-builder), you MUST proceed to the NEXT logical step immediately in the subsequent turn. Do NOT stop to just "acknowledge" receipt of instructions.
            - When using skills with core/ modules, create a Python script in the working directory that imports from the skill's core (add skill dir to PYTHONPATH).
            - Provide clear, concise updates.`;

            console.log('Sending request to API...');
            console.log('Model:', this.model);
            console.log('Base URL:', this.anthropic.baseURL);

            try {
                // Pass abort signal to the API for true interruption
                const stream: any = await this.anthropic.messages.create({
                    model: this.model,
                    max_tokens: 131072,
                    system: systemPrompt,
                    messages: this.history,
                    stream: true,
                    tools: tools
                } as any, {
                    signal: this.abortController?.signal
                });

                const finalContent: Anthropic.ContentBlock[] = [];
                let currentToolUse: { id: string; name: string; input: string } | null = null;
                let textBuffer = "";

                for await (const chunk of stream) {
                    if (this.abortController?.signal.aborted) {
                        stream.controller.abort();
                        break;
                    }

                    switch (chunk.type) {
                        case 'content_block_start':
                            if (chunk.content_block.type === 'tool_use') {
                                if (textBuffer) {
                                    finalContent.push({ type: 'text', text: textBuffer, citations: null });
                                    textBuffer = "";
                                }
                                currentToolUse = { ...chunk.content_block, input: "" };
                            }
                            break;
                        case 'content_block_delta':
                            if (chunk.delta.type === 'text_delta') {
                                textBuffer += chunk.delta.text;
                                // Broadcast streaming token to ALL windows
                                this.broadcast('agent:stream-token', chunk.delta.text);
                            } else if (chunk.delta.type === 'input_json_delta' && currentToolUse) {
                                currentToolUse.input += chunk.delta.partial_json;
                            }
                            break;
                        case 'content_block_stop':
                            if (currentToolUse) {
                                try {
                                    const parsedInput = JSON.parse(currentToolUse.input);
                                    finalContent.push({
                                        type: 'tool_use',
                                        id: currentToolUse.id,
                                        name: currentToolUse.name,
                                        input: parsedInput
                                    });
                                } catch (e) {
                                    console.error("Failed to parse tool input", e);
                                    // Treat as a failed tool use so the model knows it messed up
                                    finalContent.push({
                                        type: 'tool_use',
                                        id: currentToolUse.id,
                                        name: currentToolUse.name,
                                        input: { error: "Invalid JSON input", raw: currentToolUse.input }
                                    });
                                }
                                currentToolUse = null;
                            } else if (textBuffer) {
                                // [Fix] Flush text buffer on block stop
                                finalContent.push({ type: 'text', text: textBuffer, citations: null });
                                textBuffer = "";
                            }
                            break;
                        case 'message_stop':
                            if (textBuffer) {
                                finalContent.push({ type: 'text', text: textBuffer, citations: null });
                                textBuffer = "";
                            }
                            break;
                    }
                }

                // If aborted, save any partial content that was generated
                if (this.abortController?.signal.aborted) {
                    if (textBuffer) {
                        finalContent.push({ type: 'text', text: textBuffer + '\n\n[已中断]', citations: null });
                    }
                    if (finalContent.length > 0) {
                        const assistantMsg: Anthropic.MessageParam = { role: 'assistant', content: finalContent };
                        this.history.push(assistantMsg);
                        this.notifyUpdate();
                    }
                    return; // Stop execution completely
                }

                // [Fix] Ensure any remaining buffer is captured (in case message_stop didn't fire)
                if (textBuffer) {
                    finalContent.push({ type: 'text', text: textBuffer, citations: null });
                }

                if (finalContent.length > 0) {
                    const assistantMsg: Anthropic.MessageParam = { role: 'assistant', content: finalContent };
                    this.history.push(assistantMsg);
                    this.notifyUpdate();

                    const toolUses = finalContent.filter(c => c.type === 'tool_use');
                    if (toolUses.length > 0) {
                        const toolResults: Anthropic.ToolResultBlockParam[] = [];
                        for (const toolUse of toolUses) {
                            // Check abort before each tool execution
                            if (this.abortController?.signal.aborted) {
                                console.log('[AgentRuntime] Aborted before tool execution');
                                return;
                            }

                            if (toolUse.type !== 'tool_use') continue;

                            console.log(`Executing tool: ${toolUse.name}`);
                            let result = "Tool execution failed or unknown tool.";

                            try {
                                if (toolUse.name === 'read_file') {
                                    const args = toolUse.input as { path: string };
                                    if (!permissionManager.isPathAuthorized(args.path)) {
                                        result = `Error: Path ${args.path} is not in an authorized folder.`;
                                    } else {
                                        result = await this.fsTools.readFile(args);
                                    }
                                } else if (toolUse.name === 'write_file') {
                                    const args = toolUse.input as { path: string, content: string };
                                    if (!permissionManager.isPathAuthorized(args.path)) {
                                        result = `Error: Path ${args.path} is not in an authorized folder.`;
                                    } else {
                                        const approved = await this.requestConfirmation(toolUse.name, `Write to file: ${args.path}`, args);
                                        if (approved) {
                                            result = await this.fsTools.writeFile(args);
                                            const fileName = args.path.split(/[\\/]/).pop() || 'file';
                                            this.artifacts.push({ path: args.path, name: fileName, type: 'file' });
                                            this.broadcast('agent:artifact-created', { path: args.path, name: fileName, type: 'file' });
                                        } else {
                                            result = 'User denied the write operation.';
                                        }
                                    }
                                } else if (toolUse.name === 'list_dir') {
                                    const args = toolUse.input as { path: string };
                                    if (!permissionManager.isPathAuthorized(args.path)) {
                                        result = `Error: Path ${args.path} is not in an authorized folder.`;
                                    } else {
                                        result = await this.fsTools.listDir(args);
                                    }
                                } else if (toolUse.name === 'run_command') {
                                    const args = toolUse.input as { command: string, cwd?: string };
                                    const defaultCwd = authorizedFolders[0] || process.cwd();

                                    // Require confirmation for command execution
                                    const approved = await this.requestConfirmation(toolUse.name, `Execute command: ${args.command}`, args);
                                    if (approved) {
                                        result = await this.fsTools.runCommand(args, defaultCwd);
                                    } else {
                                        result = 'User denied the command execution.';
                                    }
                                } else {
                                    const skillInfo = this.skillManager.getSkillInfo(toolUse.name);
                                    console.log(`[Runtime] Skill ${toolUse.name} info found? ${!!skillInfo} (len: ${skillInfo?.instructions?.length})`);
                                    if (skillInfo) {
                                        // Return skill content following official Claude Code Skills pattern
                                        // The model should create scripts and run them from the skill directory
                                        result = `[SKILL LOADED: ${toolUse.name}]

SKILL DIRECTORY: ${skillInfo.skillDir}

Follow these instructions to complete the user's request. When the instructions reference Python modules in core/, create your script in the working directory and run it from the skill directory:

run_command: cd "${skillInfo.skillDir}" && python /path/to/your_script.py

Or add to the top of your script:
import sys; sys.path.insert(0, r"${skillInfo.skillDir}")

---
${skillInfo.instructions}
---`;
                                    } else if (toolUse.name.includes('__')) {
                                        result = await this.mcpService.callTool(toolUse.name, toolUse.input as Record<string, unknown>);
                                    }
                                }
                                // Check if input has parse error
                                const inputObj = toolUse.input as Record<string, unknown>;
                                if (inputObj && inputObj.error === "Invalid JSON input") {
                                    // Provide simpler error, just raw info
                                    result = `Error: The tool input was not valid JSON. Please fix the JSON format and retry. Raw input length: ${(inputObj.raw as string)?.length || 0}`;
                                }
                            } catch (toolErr: unknown) {
                                result = `Error executing tool: ${(toolErr as Error).message}`;
                            }

                            toolResults.push({
                                type: 'tool_result',
                                tool_use_id: toolUse.id,
                                content: result
                            });
                        }

                        this.history.push({ role: 'user', content: toolResults });
                        this.notifyUpdate();
                    } else {
                        keepGoing = false;
                    }
                } else {
                    keepGoing = false;
                }

            } catch (loopError: unknown) {
                // Check if this is an abort error - handle gracefully
                if (this.abortController?.signal.aborted) {
                    console.log('[AgentRuntime] Request was aborted');
                    return; // Exit cleanly on abort
                }

                const loopErr = loopError as { status?: number; message?: string; name?: string };
                console.error("Agent Loop detailed error:", loopError);

                // Check for abort-related errors (different SDK versions may throw different errors)
                if (loopErr.name === 'AbortError' || loopErr.message?.includes('abort')) {
                    console.log('[AgentRuntime] Caught abort error');
                    return;
                }

                // Handle Sensitive Content Error (1027)
                if (loopErr.status === 500 && (loopErr.message?.includes('sensitive') || JSON.stringify(loopError).includes('1027'))) {
                    console.log("Caught sensitive content error, asking Agent to retry...");

                    // Add a system-like user message to prompt the agent to fix its output
                    this.history.push({
                        role: 'user',
                        content: `[SYSTEM ERROR] Your previous response was blocked by the safety filter (Error Code 1027: output new_sensitive). \n\nThis usually means the generated content contained sensitive, restricted, or unsafe material.\n\nPlease generate a NEW response that:\n1. Addresses the user's request safely.\n2. Avoids the sensitive topic or phrasing that triggered the block.\n3. Acknowledges the issue briefly if necessary.`
                    });
                    this.notifyUpdate();

                    // Allow the loop to continue to the next iteration
                    continue;
                } else {
                    // Re-throw other errors to be caught effectively by the outer handler
                    throw loopError;
                }
            }
        }
    }

    // Broadcast to all windows
    private broadcast(channel: string, data: unknown) {
        for (const win of this.windows) {
            if (!win.isDestroyed()) {
                win.webContents.send(channel, data);
            }
        }
    }

    private notifyUpdate() {
        this.broadcast('agent:history-update', this.history);
    }

    private async requestConfirmation(tool: string, description: string, args: Record<string, unknown>): Promise<boolean> {
        // Extract path from args if available
        const path = (args?.path || args?.cwd) as string | undefined;

        // Check if permission is already granted
        if (configStore.hasPermission(tool, path)) {
            console.log(`[AgentRuntime] Auto-approved ${tool} (saved permission)`);
            return true;
        }

        const id = `confirm-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        return new Promise((resolve) => {
            this.pendingConfirmations.set(id, { resolve });
            this.broadcast('agent:confirm-request', { id, tool, description, args });
        });
    }

    public handleConfirmResponseWithRemember(id: string, approved: boolean, remember: boolean): void {
        const pending = this.pendingConfirmations.get(id);
        if (pending) {
            if (approved && remember) {
                // Extract tool and path from the confirmation request
                // The tool name is in the id or we need to pass it
                // For now we'll extract from the most recent confirm request
            }
            pending.resolve(approved);
            this.pendingConfirmations.delete(id);
        }
    }

    public abort() {
        if (!this.isProcessing) return;

        this.abortController?.abort();

        // Clear any pending confirmations - respond with 'denied'
        for (const [, pending] of this.pendingConfirmations) {
            pending.resolve(false);
        }
        this.pendingConfirmations.clear();

        // Broadcast abort event to all windows
        this.broadcast('agent:aborted', {
            aborted: true,
            timestamp: Date.now()
        });

        // Mark processing as complete
        this.isProcessing = false;
        this.abortController = null;
    }
}
