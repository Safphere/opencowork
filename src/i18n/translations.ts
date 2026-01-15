export const translations = {
    en: {
        // Navigation
        cowork: 'Cowork',
        chat: 'Chat',
        settings: 'Settings',
        taskWorkspace: 'Task Workspace',
        chatAssistant: 'Chat Assistant',

        // Cowork View
        currentPlan: 'Current Plan',
        describeTask: 'Describe a task or a change...',
        noMessagesYet: 'No messages yet',
        startByDescribing: 'Start by describing what you want to accomplish',

        // Settings
        apiConfiguration: 'API Configuration',
        apiKey: 'API Key',
        apiKeyPlaceholder: 'sk-ant-api03-...',
        apiKeyHint: 'Your Anthropic API key. Get one at console.anthropic.com',
        apiUrl: 'API URL',
        apiUrlHint: 'Base URL for API requests. Use default unless using a proxy.',
        modelSelection: 'Model Selection',
        authorizedFolders: 'Authorized Folders',
        authorizedFoldersHint: 'Claude can only access files within these folders.',
        noFoldersYet: 'No folders authorized yet',
        addFolder: 'Add Folder',
        networkAccess: 'Network Access',
        allowNetworkAccess: 'Allow Network Access',
        networkAccessHint: 'Enable Claude to make web requests (for MCP, research, etc.)',
        save: 'Save',
        saved: 'Saved!',

        // Confirmation Dialog
        actionConfirmation: 'Action Confirmation',
        reviewBeforeProceeding: 'Review before proceeding',
        tool: 'Tool',
        description: 'Description',
        arguments: 'Arguments',
        deny: 'Deny',
        allow: 'Allow',

        // Artifacts
        generatedArtifacts: 'Generated Artifacts',
        filesGenerated: 'files generated',
        fileGenerated: 'file generated',

        // Theme
        appearance: 'Appearance',
        theme: 'Theme',
        light: 'Light',
        dark: 'Dark',
        system: 'System',
        accentColor: 'Accent Color',
        language: 'Language',

        // Models
        modelSonnet: 'Claude 3.5 Sonnet (Latest)',
        modelHaiku: 'Claude 3.5 Haiku (Fast)',
        modelOpus: 'Claude 3 Opus (Most Capable)',
        modelGLM4: 'GLM 4.7 (Custom)',

        // Additional UI
        runningCommand: 'Running command',
        steps: 'steps',
        reply: 'Reply...',
        aiDisclaimer: 'AI can make mistakes. Please verify important information.',
        minimize: 'Minimize',
        expand: 'Expand',
        close: 'Close',
        openInExplorer: 'Open in Explorer',
    },
    zh: {
        // Navigation
        cowork: '协作',
        chat: '对话',
        settings: '设置',
        taskWorkspace: '任务工作区',
        chatAssistant: '对话助手',

        // Cowork View
        currentPlan: '当前计划',
        describeTask: '描述一个任务或变更...',
        noMessagesYet: '暂无消息',
        startByDescribing: '开始描述你想要完成的任务',

        // Settings
        apiConfiguration: 'API 配置',
        apiKey: 'API 密钥',
        apiKeyPlaceholder: 'sk-ant-api03-...',
        apiKeyHint: '你的 Anthropic API 密钥，可在 console.anthropic.com 获取',
        apiUrl: 'API 地址',
        apiUrlHint: 'API 请求的基础 URL，使用代理时可修改',
        modelSelection: '模型选择',
        authorizedFolders: '授权文件夹',
        authorizedFoldersHint: 'Claude 只能访问这些文件夹内的文件',
        noFoldersYet: '尚未授权任何文件夹',
        addFolder: '添加文件夹',
        networkAccess: '网络访问',
        allowNetworkAccess: '允许网络访问',
        networkAccessHint: '允许 Claude 进行网络请求（用于 MCP、研究等）',
        save: '保存',
        saved: '已保存！',

        // Confirmation Dialog
        actionConfirmation: '操作确认',
        reviewBeforeProceeding: '执行前请确认',
        tool: '工具',
        description: '描述',
        arguments: '参数',
        deny: '拒绝',
        allow: '允许',

        // Artifacts
        generatedArtifacts: '生成的文件',
        filesGenerated: '个文件已生成',
        fileGenerated: '个文件已生成',

        // Theme
        appearance: '外观',
        theme: '主题',
        light: '浅色',
        dark: '深色',
        system: '跟随系统',
        accentColor: '强调色',
        language: '语言',

        // Models
        modelSonnet: 'Claude 3.5 Sonnet (最新)',
        modelHaiku: 'Claude 3.5 Haiku (快速)',
        modelOpus: 'Claude 3 Opus (最强)',
        modelGLM4: 'GLM 4.7 (自定义)',

        // Additional UI
        runningCommand: '正在执行命令',
        steps: '个步骤',
        reply: '回复...',
        aiDisclaimer: 'AI 可能会犯错，请核实重要信息。',
        minimize: '最小化',
        expand: '展开',
        close: '关闭',
        openInExplorer: '在资源管理器中打开',
    }
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;
