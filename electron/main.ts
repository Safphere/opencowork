import { app, BrowserWindow, shell, ipcMain, screen, dialog, globalShortcut, Tray, Menu, nativeImage } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'
import dotenv from 'dotenv'
import { AgentRuntime } from './agent/AgentRuntime'
import { configStore } from './config/ConfigStore'
import { sessionStore } from './config/SessionStore'
import Anthropic from '@anthropic-ai/sdk'

// Extend App type to include isQuitting property
declare global {
  namespace Electron {
    interface App {
      isQuitting?: boolean
    }
  }
}

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

// Helper to get icon path for both dev and prod
function getIconPath(): string {
  // Try PNG first as it's always available
  const pngName = 'icon.png'

  if (app.isPackaged) {
    // In production, icon is in extraResources
    const pngPath = path.join(process.resourcesPath, pngName)
    if (fs.existsSync(pngPath)) return pngPath
    // Fallback to app directory
    return path.join(process.resourcesPath, 'app.asar.unpacked', pngName)
  } else {
    // In development, use public folder
    return path.join(process.env.APP_ROOT!, 'public', 'icon.png')
  }
}

// [Fix] Set specific userData path for dev mode to avoid permission/locking issues
if (VITE_DEV_SERVER_URL) {
  const devUserData = path.join(process.env.APP_ROOT, '.vscode', 'electron-userdata');
  if (!fs.existsSync(devUserData)) {
    fs.mkdirSync(devUserData, { recursive: true });
  }
  app.setPath('userData', devUserData);
}

// Internal MCP Server Runner
// MiniMax startup removed
// --- Normal App Initialization ---

let mainWin: BrowserWindow | null = null
let floatingBallWin: BrowserWindow | null = null
let tray: Tray | null = null
let agent: AgentRuntime | null = null

// Ball state
let isBallExpanded = false
const BALL_SIZE = 64
const EXPANDED_WIDTH = 340    // Match w-80 (320px) + padding
const EXPANDED_HEIGHT = 320   // Compact height for less dramatic expansion

app.on('before-quit', () => {
  app.isQuitting = true
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
})

app.whenReady().then(() => {
  // Set App User Model ID for Windows notifications
  // app.setAppUserModelId('com.opencowork.app')

  // Register Protocol Client
  if (app.isPackaged) {
    app.setAsDefaultProtocolClient('opencowork')
  } else {
    console.log('Skipping protocol registration in Dev mode.')
  }

  // 1. Setup IPC handlers FIRST
  // 1. Setup IPC handlers FIRST
  // setupIPCHandlers() - handlers are defined at top level now

  // 2. Create windows
  createMainWindow()
  createFloatingBallWindow()

  // 3. Initialize agent AFTER windows are created
  initializeAgent()

  // 4. Create system tray
  createTray()

  // 5. Register global shortcut
  globalShortcut.register('Alt+Space', () => {
    if (floatingBallWin) {
      if (floatingBallWin.isVisible()) {
        if (isBallExpanded) {
          toggleFloatingBallExpanded()
        }
        floatingBallWin.hide()
      } else {
        floatingBallWin.show()
        floatingBallWin.focus()
      }
    }
  })

  // Show main window in dev mode
  if (VITE_DEV_SERVER_URL) {
    mainWin?.show()
  }

  console.log('OpenCowork started. Press Alt+Space to toggle floating ball.')
})


//Functions defined outside the block to ensure proper hoisiting and scope access (vars are global to file)

// IPC Handlers

ipcMain.handle('agent:send-message', async (_event, message: string | { content: string, images: string[] }) => {
  if (!agent) throw new Error('Agent not initialized')
  return await agent.processUserMessage(message)
})

ipcMain.handle('agent:abort', () => {
  agent?.abort()
})

ipcMain.handle('agent:confirm-response', (_, { id, approved, remember, tool, path }: { id: string, approved: boolean, remember?: boolean, tool?: string, path?: string }) => {
  if (approved && remember && tool) {
    configStore.addPermission(tool, path)
    console.log(`[Permission] Saved: ${tool} for path: ${path || '*'}`)
  }
  agent?.handleConfirmResponse(id, approved)
})

ipcMain.handle('agent:new-session', () => {
  agent?.clearHistory()
  const session = sessionStore.createSession()
  return { success: true, sessionId: session.id }
})

// Session Management
ipcMain.handle('session:list', () => {
  return sessionStore.getSessions()
})

ipcMain.handle('session:get', (_, id: string) => {
  return sessionStore.getSession(id)
})

ipcMain.handle('session:load', (_, id: string) => {
  const session = sessionStore.getSession(id)
  if (session && agent) {
    agent.loadHistory(session.messages)
    sessionStore.setCurrentSession(id)
    return { success: true }
  }
  return { error: 'Session not found' }
})

ipcMain.handle('session:save', (_, messages: Anthropic.MessageParam[]) => {
  const currentId = sessionStore.getCurrentSessionId()
  if (currentId) {
    sessionStore.updateSession(currentId, messages)
    return { success: true }
  }
  // Create new session if none exists
  const session = sessionStore.createSession()
  sessionStore.updateSession(session.id, messages)
  return { success: true, sessionId: session.id }
})

ipcMain.handle('session:delete', (_, id: string) => {
  sessionStore.deleteSession(id)
  return { success: true }
})

ipcMain.handle('session:current', () => {
  const id = sessionStore.getCurrentSessionId()
  return id ? sessionStore.getSession(id) : null
})

ipcMain.handle('agent:authorize-folder', (_, folderPath: string) => {
  const folders = configStore.getAll().authorizedFolders || []
  if (!folders.includes(folderPath)) {
    folders.push(folderPath)
    configStore.set('authorizedFolders', folders)
  }
  return true
})

ipcMain.handle('agent:get-authorized-folders', () => {
  return configStore.getAll().authorizedFolders || []
})

// Permission Management
ipcMain.handle('permissions:list', () => {
  return configStore.getAllowedPermissions()
})

ipcMain.handle('permissions:revoke', (_, { tool, pathPattern }: { tool: string, pathPattern?: string }) => {
  configStore.removePermission(tool, pathPattern)
  return { success: true }
})

ipcMain.handle('permissions:clear', () => {
  configStore.clearAllPermissions()
  return { success: true }
})

ipcMain.handle('agent:set-working-dir', (_, folderPath: string) => {
  // Set as first (primary) in the list
  const folders = configStore.getAll().authorizedFolders || []
  const newFolders = [folderPath, ...folders.filter(f => f !== folderPath)]
  configStore.set('authorizedFolders', newFolders)
  return true
})

ipcMain.handle('config:get-all', () => configStore.getAll())
ipcMain.handle('config:set-all', (_, cfg) => {
  if (cfg.apiKey) configStore.setApiKey(cfg.apiKey)
  if (cfg.apiUrl) configStore.setApiUrl(cfg.apiUrl)
  if (cfg.model) configStore.setModel(cfg.model)
  configStore.set('authorizedFolders', cfg.authorizedFolders || [])
  configStore.setNetworkAccess(cfg.networkAccess || false)
  if (cfg.shortcut) configStore.set('shortcut', cfg.shortcut)

  // Reinitialize agent
  initializeAgent()
})

// Shortcut update handler
ipcMain.handle('shortcut:update', (_, newShortcut: string) => {
  try {
    globalShortcut.unregisterAll()
    globalShortcut.register(newShortcut, () => {
      if (floatingBallWin) {
        if (floatingBallWin.isVisible()) {
          if (isBallExpanded) {
            toggleFloatingBallExpanded()
          }
          floatingBallWin.hide()
        } else {
          floatingBallWin.show()
          floatingBallWin.focus()
        }
      }
    })
    configStore.set('shortcut', newShortcut)
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
})

ipcMain.handle('dialog:select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWin!, {
    properties: ['openDirectory']
  })
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

ipcMain.handle('shell:open-path', async (_, filePath: string) => {
  return shell.showItemInFolder(filePath)
})

// Floating Ball specific handlers
ipcMain.handle('floating-ball:toggle', () => {
  toggleFloatingBallExpanded()
})

ipcMain.handle('floating-ball:show-main', () => {
  mainWin?.show()
  mainWin?.focus()
})

ipcMain.handle('floating-ball:start-drag', () => {
  // Enable window dragging
  if (floatingBallWin) {
    floatingBallWin.setMovable(true)
  }
})

ipcMain.handle('floating-ball:move', (_, { deltaX, deltaY }: { deltaX: number, deltaY: number }) => {
  if (floatingBallWin) {
    const [x, y] = floatingBallWin.getPosition()
    floatingBallWin.setPosition(x + deltaX, y + deltaY)
    // Enforce fixed size when expanded to prevent any resizing
    if (isBallExpanded) {
      floatingBallWin.setSize(EXPANDED_WIDTH, EXPANDED_HEIGHT)
    }
  }
})

// Window controls for custom titlebar
ipcMain.handle('window:minimize', () => mainWin?.minimize())
ipcMain.handle('window:maximize', () => {
  if (mainWin?.isMaximized()) {
    mainWin.unmaximize()
  } else {
    mainWin?.maximize()
  }
})
ipcMain.handle('window:close', () => mainWin?.hide())

// MCP Configuration Handlers
const mcpConfigPath = path.join(os.homedir(), '.opencowork', 'mcp.json');

ipcMain.handle('mcp:get-config', async () => {
  try {
    if (!fs.existsSync(mcpConfigPath)) return '{}';
    return fs.readFileSync(mcpConfigPath, 'utf-8');
  } catch (e) {
    console.error('Failed to read MCP config:', e);
    return '{}';
  }
});

ipcMain.handle('mcp:save-config', async (_, content: string) => {
  try {
    const dir = path.dirname(mcpConfigPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(mcpConfigPath, content, 'utf-8');

    // Update agent services
    if (agent) {
      // We might need to reload MCP client here, but for now just saving is enough.
      // The user might need to restart app or we can add a reload capability later.
    }
    return { success: true };
  } catch (e) {
    console.error('Failed to save MCP config:', e);
    return { success: false, error: (e as Error).message };
  }
});

ipcMain.handle('mcp:open-config-folder', async () => {
  if (fs.existsSync(mcpConfigPath)) {
    shell.showItemInFolder(mcpConfigPath);
  } else {
    // If file doesn't exist, try opening the directory
    const dir = path.dirname(mcpConfigPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    shell.openPath(dir);
  }
});

// Skills Management Handlers
const skillsDir = path.join(os.homedir(), '.opencowork', 'skills');

// Helper to get built-in skill names
const getBuiltinSkillNames = () => {
  try {
    let sourceDir = path.join(process.cwd(), 'resources', 'skills');
    if (app.isPackaged) {
      const possiblePath = path.join(process.resourcesPath, 'resources', 'skills');
      if (fs.existsSync(possiblePath)) sourceDir = possiblePath;
      else sourceDir = path.join(process.resourcesPath, 'skills');
    }
    if (fs.existsSync(sourceDir)) {
      return fs.readdirSync(sourceDir).filter(f => fs.statSync(path.join(sourceDir, f)).isDirectory());
    }
  } catch (e) { console.error(e) }
  return [];
};

ipcMain.handle('skills:list', async () => {
  try {
    if (!fs.existsSync(skillsDir)) return [];
    const builtinSkills = getBuiltinSkillNames();
    const files = fs.readdirSync(skillsDir);

    return files.filter(f => {
      try { return fs.statSync(path.join(skillsDir, f)).isDirectory(); } catch { return false; }
    }).map(f => ({
      id: f,
      name: f,
      path: path.join(skillsDir, f),
      isBuiltin: builtinSkills.includes(f)
    }));
  } catch (e) {
    console.error('Failed to list skills:', e);
    return [];
  }
});

ipcMain.handle('skills:get', async (_, skillId: string) => {
  try {
    const skillPath = path.join(skillsDir, skillId);
    if (!fs.existsSync(skillPath)) return '';

    // Look for MD file inside
    const files = fs.readdirSync(skillPath);
    const mdFile = files.find(f => f.toLowerCase().endsWith('.md'));

    if (!mdFile) return '';
    return fs.readFileSync(path.join(skillPath, mdFile), 'utf-8');
  } catch (e) {
    console.error('Failed to read skill:', e);
    return '';
  }
});

ipcMain.handle('skills:save', async (_, { filename, content }: { filename: string, content: string }) => {
  try {
    const skillId = filename.replace('.md', ''); // normalized id

    // Check if built-in
    const builtinSkills = getBuiltinSkillNames();
    if (builtinSkills.includes(skillId)) {
      return { success: false, error: 'Cannot modify built-in skills' };
    }

    if (!fs.existsSync(skillsDir)) fs.mkdirSync(skillsDir, { recursive: true });
    const skillPath = path.join(skillsDir, skillId);
    if (!fs.existsSync(skillPath)) fs.mkdirSync(skillPath, { recursive: true });

    // Save to README.md or existing md
    let targetFile = 'README.md';
    if (fs.existsSync(skillPath)) {
      const existing = fs.readdirSync(skillPath).find(f => f.toLowerCase().endsWith('.md'));
      if (existing) targetFile = existing;
    }

    fs.writeFileSync(path.join(skillPath, targetFile), content, 'utf-8');

    return { success: true };
  } catch (e) {
    console.error('Failed to save skill:', e);
    return { success: false, error: (e as Error).message };
  }
});

ipcMain.handle('skills:delete', async (_, skillId: string) => {
  try {
    // Check if built-in
    const builtinSkills = getBuiltinSkillNames();
    if (builtinSkills.includes(skillId)) {
      return { success: false, error: 'Cannot delete built-in skills' };
    }

    const skillPath = path.join(skillsDir, skillId);
    if (fs.existsSync(skillPath)) {
      fs.rmSync(skillPath, { recursive: true, force: true });
      return { success: true };
    }
    return { success: false, error: 'Skill not found' };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
});


function initializeAgent() {
  const apiKey = configStore.getApiKey() || process.env.ANTHROPIC_API_KEY
  if (apiKey && mainWin) {
    agent = new AgentRuntime(apiKey, mainWin, configStore.getModel(), configStore.getApiUrl())
    // Add floating ball window to receive updates
    if (floatingBallWin) {
      agent.addWindow(floatingBallWin)
    }
    (global as Record<string, unknown>).agent = agent

    // Trigger async initialization for MCP and Skills
    agent.initialize().catch(err => console.error('Agent initialization failed:', err));

    console.log('Agent initialized with model:', configStore.getModel())
    console.log('API URL:', configStore.getApiUrl())
  } else {
    console.warn('No API Key found. Please configure in Settings.')
  }
}

function createTray() {
  try {
    const iconPath = getIconPath()
    console.log('Tray icon path:', iconPath)
    tray = new Tray(iconPath)
  } catch (e) {
    console.error('Failed to load tray icon:', e)
    const blankIcon = nativeImage.createEmpty()
    tray = new Tray(blankIcon)
  }

  tray.setToolTip('OpenCowork')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        mainWin?.show()
        mainWin?.focus()
      }
    },
    {
      label: '显示悬浮球',
      click: () => {
        floatingBallWin?.isVisible() ? floatingBallWin?.hide() : floatingBallWin?.show()
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWin) {
      if (mainWin.isVisible()) {
        mainWin.hide()
      } else {
        mainWin.show()
        mainWin.focus()
      }
    }
  })
}

function createMainWindow() {
  const iconPath = getIconPath()
  console.log('Main window icon path:', iconPath)
  console.log('Icon exists:', fs.existsSync(iconPath))

  // Load icon as nativeImage for better Windows taskbar support
  let iconImage = undefined
  try {
    iconImage = nativeImage.createFromPath(iconPath)
    if (iconImage.isEmpty()) {
      console.warn('Icon image is empty, falling back to default')
      iconImage = undefined
    }
  } catch (e) {
    console.error('Failed to load icon:', e)
  }

  mainWin = new BrowserWindow({
    width: 480,
    height: 720,
    minWidth: 400,
    minHeight: 600,
    icon: iconImage || iconPath,
    frame: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
    show: false,
  })

  // Remove menu bar
  mainWin.setMenu(null)

  mainWin.once('ready-to-show', () => {
    console.log('Main window ready.')
  })

  mainWin.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWin?.hide()
    }
  })

  mainWin.webContents.on('did-finish-load', () => {
    mainWin?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    mainWin.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWin.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

function createFloatingBallWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

  floatingBallWin = new BrowserWindow({
    width: BALL_SIZE,
    height: BALL_SIZE,
    x: screenWidth - BALL_SIZE - 20,
    y: screenHeight - BALL_SIZE - 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
    icon: getIconPath(),
  })

  if (VITE_DEV_SERVER_URL) {
    floatingBallWin.loadURL(`${VITE_DEV_SERVER_URL}#/floating-ball`)
  } else {
    floatingBallWin.loadFile(path.join(RENDERER_DIST, 'index.html'), { hash: 'floating-ball' })
  }

  floatingBallWin.on('closed', () => {
    if (agent && floatingBallWin) {
      agent.removeWindow(floatingBallWin)
    }
    floatingBallWin = null
  })

  // Add to agent after creation
  floatingBallWin.webContents.on('did-finish-load', () => {
    if (agent && floatingBallWin) {
      agent.addWindow(floatingBallWin)
    }
  })
}

function toggleFloatingBallExpanded() {
  if (!floatingBallWin) return

  const [currentX, currentY] = floatingBallWin.getPosition()
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

  if (isBallExpanded) {
    // Collapse - Calculate where ball should go based on current expanded window position
    // Ball's right edge should align with expanded panel's right edge
    // Ball position = (expanded right edge - BALL_SIZE), same Y
    const ballX = currentX + EXPANDED_WIDTH - BALL_SIZE
    const ballY = currentY

    // Clamp to screen bounds
    const finalX = Math.max(0, Math.min(ballX, screenWidth - BALL_SIZE))
    const finalY = Math.max(0, Math.min(ballY, screenHeight - BALL_SIZE))

    floatingBallWin.setSize(BALL_SIZE, BALL_SIZE)
    floatingBallWin.setPosition(finalX, finalY)
    isBallExpanded = false
  } else {
    // Expand
    // Horizontal-only expansion: Keep Y same, expand LEFT from ball

    // Keep Y the same - no vertical movement
    // Only move X to the left so ball's right edge stays at same position
    // Ball's right edge = currentX + BALL_SIZE
    // Panel's right edge = newX + EXPANDED_WIDTH = currentX + BALL_SIZE
    // So: newX = currentX + BALL_SIZE - EXPANDED_WIDTH

    let newX = currentX + BALL_SIZE - EXPANDED_WIDTH
    let newY = currentY  // Keep Y the same - NO upward movement

    // Ensure not going negative
    newX = Math.max(0, newX)
    newY = Math.max(0, newY)

    floatingBallWin.setSize(EXPANDED_WIDTH, EXPANDED_HEIGHT)
    floatingBallWin.setPosition(newX, newY)
    isBallExpanded = true
  }

  floatingBallWin.webContents.send('floating-ball:state-changed', isBallExpanded)
}

// Ensure the ball stays on top
setInterval(() => {
  if (floatingBallWin && !floatingBallWin.isDestroyed()) {
    floatingBallWin.setAlwaysOnTop(true, 'screen-saver')
  }
}, 2000)
