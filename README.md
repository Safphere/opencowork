<p align="center">
  <img src="./public/icon.png" width="100" height="100" alt="OpenCowork Logo">
</p>

<h1 align="center">OpenCowork</h1>

<p align="center">
  Open Source Desktop AI Assistant
</p>

<p align="center">
  <a href="./README.md">English</a> · <a href="./README_CN.md">中文</a>
</p>

<p align="center">
  <a href="https://github.com/Safphere/opencowork/releases"><img src="https://img.shields.io/github/v/release/Safphere/opencowork?style=flat-square&color=orange" alt="Release"></a>
  <a href="https://github.com/Safphere/opencowork/actions"><img src="https://img.shields.io/github/actions/workflow/status/Safphere/opencowork/release.yml?style=flat-square" alt="Build"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/Safphere/opencowork?style=flat-square" alt="License"></a>
</p>

---

## ⚠️ Risk Notice

OpenCowork allows AI to operate on local file systems and terminals. Please note:

- AI may accidentally delete files or execute incorrect commands
- Prompt injection risks may exist
- AI can read all files within authorized directories

**Recommendations:** Only authorize necessary directories, backup data regularly, review operation requests.

> **Disclaimer:** This software is provided "as-is" for learning and development purposes only. Developers are not liable for any losses caused by using this software.

---

## Introduction

<p align="center">
  <img src="https://i.meee.com.tw/uA5H9yG.png" width="400" alt="OpenCowork Demo">
</p>

**OpenCowork** is the open-source edition of Cowork, turning your PC into an AI-powered work assistant.

Supports any Agent-capable model (MiniMax, Claude, GPT, etc.) with no vendor lock-in.

### Key Features

- **Model Agnostic** — Works with various Agent models
- **File Operations** — Read, write, create, and modify local files
- **Terminal Control** — Execute command-line operations
- **Skill Extensions** — Extend via Skills and MCP protocol
- **Cross-Platform** — Windows, macOS, Linux

---

## Installation

### Download

Download the latest release for your platform from the [Releases](https://github.com/Safphere/opencowork/releases) page:

- **Windows:** `.exe` installer or portable version
- **macOS:** `.dmg` installer
- **Linux:** `.AppImage` or `.deb` package

### Build from Source

**Prerequisites:** Node.js v18+ (v20 LTS recommended)

```bash
# Clone the repository
git clone https://github.com/Safphere/opencowork.git
cd opencowork

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

Build outputs are located in the `release/` directory.

---

## Core Features

### Skills System

Built-in common skills with custom extension support.

<p align="center">
  <img src="https://i.meee.com.tw/vAfes9C.png" width="400" alt="Skills">
</p>

### Floating Ball

Quick access via `Alt+Space` hotkey.

<p align="center">
  <img src="https://i.meee.com.tw/iKBLLFA.gif" width="400" alt="Floating Ball">
</p>

---

## Partners

Thanks to **MiniMax** for supporting this project.

<p align="center">
  <img src="https://i.meee.com.tw/vWOPQjd.png" height="50" alt="MiniMax">
</p>

<p align="center">
  <a href="https://platform.minimaxi.com/subscribe/coding-plan?code=HhNfBTQDNq&source=link">
    <img src="https://i.meee.com.tw/5iu8MHC.png" width="220" alt="MiniMax Coding Plan">
  </a>
</p>

<p align="center">
  <sub>🤝 We welcome partnerships with AI model providers to advance the Agent ecosystem together. <a href="mailto:a976466014@gmail.com">Contact Us</a></sub>
</p>

---

## Documentation

- [Configuration Guide](./docs/configuration.md)
- [Development Guide](./docs/development.md)

---

## About Us

<p align="center">
  <img src="https://github.com/Safphere/.github/raw/main/profile/src/wechat.svg" width="280" alt="Safphere"><br>
  <img src="https://i.meee.com.tw/ZvKkdrT.jpg" width="180" alt="Discussion Group">
</p>

---

<p align="center">
  Copyright © 2024 <a href="https://github.com/Safphere">Safphere</a> · <a href="./LICENSE">Apache License 2.0</a>
</p>
