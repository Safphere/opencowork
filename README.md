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
- **Multi-Session** — Manage multiple conversation contexts simultaneously
- **Skill Extensions** — Extend via Skills and **MCP Protocol**
- **Cross-Platform** — Windows, macOS, Linux

---

## Core Features

### Skills System

Built-in **11 Skills** and **10 MCP Services** (featuring **Coding Plan** services from MiniMax, Zhipu, etc.), enabling advanced capabilities like **Web Search**, **Web Reader**, and **Image Understanding** out of the box.

> Works with **ClaudeCode compatible interfaces** (e.g., Anthropic format) rather than standard OpenAI SDKs.

Fully extensible via standard **MCP Protocol** and custom Skills.

<p align="center">
  <img src="https://i.meee.com.tw/vAfes9C.png" width="400" alt="Skills">
</p>

### Floating Ball

Quick access via `Alt+Space` hotkey (customizable in Settings). Now with enhanced UI, smoother animations, and optimized performance.

<p align="center">
  <img src="https://i.meee.com.tw/iKBLLFA.gif" width="400" alt="Floating Ball">
</p>

---

## Partners

Special thanks to our partners for their support:

<div align="center">

| **MiniMax (CN)** | **MiniMax (Intl)** | **Zhipu AI** | **ZAI (Intl)** |
| :---: | :---: | :---: | :---: |
| <img src="https://i.meee.com.tw/vWOPQjd.png" height="40" alt="MiniMax Logo"> | <img src="https://i.meee.com.tw/vWOPQjd.png" height="40" alt="MiniMax Intl Logo"> | <img src="./public/partners/zhipu_logo.png" height="40" alt="Zhipu Logo"> | <img src="./public/partners/zai_logo.svg" height="40" alt="ZAI Logo"> |
| <a href="https://platform.minimaxi.com/subscribe/coding-plan?code=HhNfBTQDNq&source=link"><img src="https://i.meee.com.tw/5iu8MHC.png" height="200" alt="MiniMax CN Poster"></a> | <a href="https://platform.minimax.io/subscribe/coding-plan?code=DQlmOtIjX6&source=link"><img src="./public/partners/minimax_intl_poster.png" height="200" alt="MiniMax Intl Poster"></a> | <a href="https://www.bigmodel.cn/glm-coding?ic=QBPPSNQ5JT"><img src="./public/partners/zhipu_poster.png" height="200" alt="Zhipu Poster"></a> | <a href="https://z.ai/subscribe?ic=9GTHAGUUX1"><img src="./public/partners/zai_poster.png" height="200" alt="ZAI Poster"></a> |

</div>

<p align="center">
  <sub>🤝 We welcome partnerships with AI model providers to advance the Agent ecosystem together. <a href="mailto:a976466014@gmail.com">Contact Us</a></sub>
</p>

---

## Installation

### ⚠️ macOS Users - Important Notice

**The app may show as "damaged" on first launch**

**Why:** macOS blocks unsigned apps from the internet. This app is not signed with an official Apple developer certificate (requires paid account).

**Solutions (choose one):**

**Method 1: Right-click to Open (Recommended)**
```
Right-click OpenCowork.app → Select "Open" → Click "Open"
```

**Method 2: System Settings**
```
System Settings → Privacy & Security → Click "Open Anyway"
```

**Method 3: Command Line (if already installed)**
```bash
sudo xattr -rd com.apple.quarantine /Applications/OpenCowork.app
```

> **Safety Guarantee:** The app is completely safe and open-source:
> - View source code: [github.com/Safphere/opencowork](https://github.com/Safphere/opencowork)
> - Build it yourself: `npm install && npm run build`
> - Join our community to ask other users

### Windows and Linux

Simply download and install the appropriate package for your platform.

---

## Documentation

- [Configuration Guide](./docs/configuration.md)
- [Development Guide](./docs/development.md)

---

## About Us

<p align="center">
  <img src="https://github.com/Safphere/.github/raw/main/profile/src/wechat.svg" width="280" alt="Safphere"><br>
  <img src="./public/discussion_group.png" width="180" alt="Discussion Group">
</p>

---

<p align="center">
  Copyright © 2024 <a href="https://github.com/Safphere">Safphere</a> · <a href="./LICENSE">Apache License 2.0</a>
</p>
