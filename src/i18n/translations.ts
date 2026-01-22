export const translations = {
    en: {
        // Navigation
        cowork: 'Cowork',
        chat: 'Chat',
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
        getApiKey: 'Get Key',
        customKeyRisk: 'Please ensure you use a trusted API service',
        apiKeyPlaceholder: 'sk-ant-api03-...',
        apiKeyHint: 'Your Anthropic API key. Get one at console.anthropic.com',
        apiUrl: 'API URL',
        apiUrlHint: 'Base URL for API requests. Use default unless using a proxy.',
        modelSelection: 'Model Selection',
        authorizedFolders: 'Authorized Folders',
        authorizedFoldersHint: 'Claude can only access files within these folders.',
        noFoldersYet: 'No folders authorized yet',
        addFolder: 'Add Folder',
        folderPermissionDesc: 'AI can only access authorized folders for security.',
        testConnection: 'Test Connection',
        connectionSuccess: 'Connection successful!',
        connectionFailed: 'Connection failed',

        networkAccess: 'Network Access',
        allowNetworkAccess: 'Allow Network Access',
        networkAccessHint: 'Enable Claude to make web requests (for MCP, research, etc.)',
        save: 'Save',
        saving: 'Saving...',
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

        // Settings Tabs
        tabGeneral: 'General',
        tabPermissions: 'Permissions',
        tabMCP: 'MCP',
        tabSkills: 'Skills',
        tabAdvanced: 'Advanced',
        tabAbout: 'About',

        // Settings - Common
        settings: 'Settings',
        providerSelection: 'Provider',
        inputModelName: 'Input model name',
        builtInReadOnly: 'Built-in Read-only',
        confirmClearPermissions: 'Are you sure you want to clear all granted permissions?',
        confirmDeleteSkill: 'Are you sure you want to delete skill',
        unknownProvider: 'Unknown',

        // Settings - Folders
        securityNote: 'For security, AI can only access these authorized folders and their subfolders.',
        noAuthorizedFolders: 'No folders authorized',
        addAuthorizedFolder: 'Add Folder',

        // Settings - Skills
        openCoworkHub: 'OpenCowork Hub',
        trustedSkills: 'Trusted AI Skills',
        customSkills: 'Custom AI Skills',
        newSkill: 'New Skill',
        noSkills: 'No skills yet',
        builtIn: 'Built-in',
        view: 'View',
        edit: 'Edit',
        delete: 'Delete',
        builtinServices: 'Built-in Services',
        builtinSkills: 'Built-in Skills',

        // Settings - Advanced
        browserAutomation: 'Browser Automation',
        browserAutomationDesc: 'Allow AI to control browser (Experimental)',
        shortcut: 'Shortcut',
        shortcutDesc: 'Toggle Floating Ball',
        pressShortcut: 'Press shortcut...',
        grantedPermissions: 'Granted Permissions',
        noPermissions: 'No saved permissions',
        revoke: 'Revoke',
        clearAllPermissions: 'Clear All Permissions',
        allPaths: 'All Paths',

        // Additional UI
        runningCommand: 'Running command',
        steps: 'steps',
        reply: 'Reply...',
        aiDisclaimer: 'AI can make mistakes. Please verify important information.',
        minimize: 'Minimize',
        expand: 'Expand',
        close: 'Close',
        hide: 'Hide',
        show: 'Show',
        openInExplorer: 'Open in Explorer',

        // Settings - MCP
        trustedMCPServices: 'Trusted MCP Services',
        inDevelopment: 'In Development',
        serviceManagement: 'Service Management',
        addService: 'Add Service',
        noMCPServices: 'No MCP Services',
        addServiceHint: 'Click top-right button to import Claude Desktop config or add new service',
        clickToEnable: 'Click to enable',
        clickToDisable: 'Click to disable',
        removeService: 'Remove Service',
        confirmDeleteMCP: 'Are you sure you want to delete MCP service',
        startLogicFailed: 'Start Logic Failed',
        invalidConfig: 'Invalid configuration. Check JSON format or command.',
        parseFailed: 'Parse failed, please retry',
        importFailed: 'Import failed',
        openMCPConfigFolder: 'Open MCP Config Folder',
        editService: 'Edit Service',
        importNewService: 'Import New Service',
        modifyServiceParams: 'Modify service startup parameters',
        mcpConfigHint: 'Supports Claude/Cursor MCP config (JSON) or npx command, auto-parsed by Agent',
        ready: 'Ready',
        clear: 'Clear',
        parsing: 'Parsing...',
        cancel: 'Cancel',
        smartParse: 'Smart Parse',
        saveChanges: 'Save Changes',
        confirmAdd: 'Confirm Add',
        active: 'ACTIVE',
        error: 'ERROR',
        booting: 'BOOTING',
        stopped: 'STOPPED',

        // Skill Editor
        viewSkill: 'View Skill',
        editSkill: 'Edit Skill',
        filenameId: 'Filename (ID)',
        skillDefinition: 'Skill Definition (Markdown)',
        saveSkill: 'Save Skill',
        yamlError: 'Skill must start with YAML frontmatter (---)',
        openSkillsFolder: 'Open Skills Folder',

        // Cowork View - Additional
        newSession: 'New Session',
        history: 'History',
        taskHistory: 'Task History',
        noHistorySessions: 'No history sessions',
        load: 'Load',
        thinking: 'Thinking...',
        inputMessage: 'Input message... (Shift+Enter for new line)',
        describeTaskPlaceholder: 'Describe task... (Shift+Enter for new line)',
        selectWorkingDirFirst: 'Please select working directory first',
        selectWorkingDir: 'Select Working Directory',
        uploadImage: 'Upload Image',
        switchModel: 'Switch Model',
        stop: 'Stop',
        path: 'Path:',
        skillLoaded: 'Skill loaded into context',

        // Floating Ball
        home: 'Home',
        describeTaskPlaceholderFloating: 'Describe task... (Enter to send, Shift+Enter for new line)',
        continueConversationPlaceholder: 'Continue conversation... (Enter to send, Shift+Enter for new line)',
        noHistory: 'No history',
        untitledSession: 'Untitled Session',
        startChatHint: 'Start a new conversation',

        // Confirm Dialog
        // actionConfirmation reused
        confirmActionDesc: 'Please confirm whether to perform this action',
        // tool, description, args already exist in 'Skills' section or similar? 
        // Let's rename them to specific ones if needed, or remove if they conflict with existing ones.
        // The error said "multiple properties with the same name". 
        // Only remove the ones I just added if they are duplicates.
        // Actually, I will check what are the duplicates. 'tool', 'description', 'args' are likely common strings.
        rememberChoice: 'Remember this choice, execute automatically in future',

        // Markdown Renderer
        copyCode: 'Copy code',
        copied: 'Copied',
        copy: 'Copy',
        openInFileManager: 'Open in File Manager',
        startConversation: 'Start a conversation',
        minimizeToBall: 'Minimize to ball',
        author: 'Author',
        homepage: 'Homepage',
        checkUpdate: 'Check for Updates',
        checking: 'Checking...',
        updateAvailable: 'Update Available',
        upToDate: 'Up to Date',
        download: 'Download',
        newVersion: 'New version available: ',

        aboutDesc: 'Your intelligent work partner.',
    },
    zh: {
        // Navigation
        cowork: '协作',
        chat: '对话',
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
        getApiKey: '获取 Key',
        customKeyRisk: '请确保使用可信的 API 服务',
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
        saving: '保存中...',
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

        // Settings Tabs
        tabGeneral: '通用',
        tabPermissions: '权限',
        tabMCP: 'MCP',
        tabSkills: 'Skills',
        tabAdvanced: '高级',
        tabAbout: '关于',

        // Settings - Common
        settings: '设置',
        providerSelection: '选择厂商',
        inputModelName: '输入模型名称',
        builtInReadOnly: '内置只读',
        confirmClearPermissions: '确定要清除所有已授权的权限吗？',
        confirmDeleteSkill: '确定要删除技能',
        unknownProvider: '未知',

        // Settings - Folders
        securityNote: '出于安全考虑，AI 只能访问以下授权的文件夹及其子文件夹。',
        noAuthorizedFolders: '暂无授权文件夹',
        folderPermissionDesc: '出于安全考虑，AI 只能访问以下授权的文件夹及其子文件夹。',
        testConnection: '测试连接',
        connectionSuccess: '连接成功！',
        connectionFailed: '连接失败',
        addAuthorizedFolder: '添加文件夹',

        // Settings - Skills
        openCoworkHub: 'OpenCowork Hub', // English in both
        trustedSkills: '可信的 AI 技能',
        customSkills: '自定义 AI 技能',
        newSkill: '新建技能',
        noSkills: '暂无技能',
        builtIn: '内置',
        view: '查看',
        edit: '编辑',
        delete: '删除',
        builtinServices: '内置服务',
        builtinSkills: '内置技能',

        // Settings - Advanced
        browserAutomation: '浏览器操作',
        browserAutomationDesc: '允许 AI 操作浏览器（开发中）',
        shortcut: '快捷键',
        shortcutDesc: '呼出悬浮球',
        pressShortcut: '按下快捷键...',
        grantedPermissions: '已授权的权限',
        noPermissions: '暂无已保存的权限',
        revoke: '撤销',
        clearAllPermissions: '清除所有权限',
        allPaths: '所有路径',

        // Additional UI
        runningCommand: '正在执行命令',
        steps: '个步骤',
        reply: '回复...',
        aiDisclaimer: 'AI 可能会犯错，请核实重要信息。',
        minimize: '最小化',
        expand: '展开',
        close: '关闭',
        hide: '隐藏',
        show: '显示',
        openInExplorer: '在资源管理器中打开',

        // Settings - MCP
        trustedMCPServices: '可信的 MCP 服务',
        inDevelopment: '开发中',
        serviceManagement: '服务管理',
        addService: '添加服务',
        noMCPServices: '暂无 MCP 服务',
        addServiceHint: '点击右上角按钮导入 Claude Desktop 配置或添加新服务',
        clickToEnable: '点击启用服务',
        clickToDisable: '点击停用服务',
        removeService: '移除服务',
        confirmDeleteMCP: '确定要移除 MCP 服务',
        startLogicFailed: '启动逻辑失败',
        invalidConfig: '未能识别有效配置。请检查 JSON 格式或命令拼写。',
        parseFailed: '解析失败，请重试',
        importFailed: '导入失败',
        openMCPConfigFolder: '打开 MCP 配置文件目录',
        editService: '编辑服务',
        importNewService: '导入新服务',
        modifyServiceParams: '修改服务的启动参数',
        mcpConfigHint: '支持 Claude、Cursor 等 MCP 配置 (JSON) 或 npx 命令，Agent 自动解析',
        ready: 'Ready',
        clear: '清空',
        parsing: '正在解析...',
        cancel: '取消',
        smartParse: '智能解析',
        saveChanges: '保存修改',
        confirmAdd: '确认添加',
        active: '运行中',
        error: '错误',
        booting: '启动中',
        stopped: '已停止',

        // Skill Editor
        viewSkill: '查看技能',
        editSkill: '编辑技能',
        filenameId: '文件名 (ID)',
        skillDefinition: '技能定义 (Markdown)',
        saveSkill: '保存技能',
        yamlError: '技能定义必须以 YAML Frontmatter (---) 开头',
        openSkillsFolder: '打开技能文件夹',

        // Cowork View - Additional
        newSession: '新会话',
        history: '历史记录',
        taskHistory: '历史任务',
        noHistorySessions: '暂无历史会话',
        load: '加载',
        thinking: '思考中...',
        inputMessage: '输入消息... (Shift+Enter 换行)',
        describeTaskPlaceholder: '描述任务... (Shift+Enter 换行)',
        selectWorkingDirFirst: '请先选择工作目录',
        selectWorkingDir: '选择工作目录',
        uploadImage: '上传图片',
        switchModel: '切换模型',
        stop: '停止',
        path: '路径:',
        skillLoaded: '技能已加载到上下文',

        // Floating Ball
        home: '首页',
        describeTaskPlaceholderFloating: '描述任务... (Enter 发送, Shift+Enter 换行)',
        continueConversationPlaceholder: '继续对话... (Enter 发送, Shift+Enter 换行)',
        noHistory: '暂无历史',
        untitledSession: '未命名会话',
        startChatHint: '开始一个新的对话',

        // Confirm Dialog
        // actionConfirmation reused
        confirmActionDesc: '请确认是否执行此操作',
        rememberChoice: '记住此选择，以后自动执行',

        // Markdown Renderer
        copyCode: '复制代码',
        copied: '已复制',
        copy: '复制',
        openInFileManager: '点击在文件管理器中打开',
        startConversation: '开始一段对话',
        minimizeToBall: '最小化为悬浮球',
        author: '作者',
        homepage: '主页',
        checkUpdate: '检查更新',
        checking: '正在检查...',
        updateAvailable: '发现新版本',
        upToDate: '已是最新版本',
        download: '去下载',
        newVersion: '发现新版本: ',

        aboutDesc: '你的智能工作伙伴。',
    }
};


export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;
