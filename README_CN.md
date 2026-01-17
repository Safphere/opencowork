<p align="center">
  <img src="./public/icon.png" width="100" height="100" alt="OpenCowork Logo">
</p>

<h1 align="center">OpenCowork</h1>

<p align="center">
  开源桌面级 AI 助手
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

## ⚠️ 风险提示

OpenCowork 允许 AI 操作本地文件系统和终端，使用前请注意：

- AI 可能误删文件或执行错误命令
- 可能存在提示词注入风险
- AI 可读取授权目录内的所有文件

**建议：** 仅授权必要目录、定期备份数据、审查操作请求。

> **免责声明：** 本软件按"原样"提供，仅供学习与开发用途。开发者不对使用本软件造成的任何损失承担责任。

---

## 简介

<p align="center">
  <img src="https://i.meee.com.tw/uA5H9yG.png" width="400" alt="OpenCowork Demo">
</p>

**OpenCowork** 是 Cowork 的开源版本，可以将个人电脑变成 AI 驱动的工作助手。

支持接入任何具备 Agent 能力的模型（如 MiniMax、Claude、GPT 等），不绑定特定厂商。

### 主要特点

- **模型通用** — 支持各类 Agent 模型
- **文件操作** — 读写、创建、修改本地文件
- **终端控制** — 执行命令行操作
- **技能扩展** — 通过 Skill 和 MCP 协议扩展功能
- **跨平台** — 支持 Windows、macOS、Linux

---

## 安装

### 下载安装

从 [Releases](https://github.com/Safphere/opencowork/releases) 页面下载适合你平台的最新版本：

- **Windows:** `.exe` 安装程序或便携版
- **macOS:** `.dmg` 安装程序
- **Linux:** `.AppImage` 或 `.deb` 安装包

### 从源码构建

**前置条件：** Node.js v18+（推荐 v20 LTS）

```bash
# 克隆仓库
git clone https://github.com/Safphere/opencowork.git
cd opencowork

# 安装依赖
npm install

# 开发模式运行
npm run dev

# 生产环境构建
npm run build
```

构建产物位于 `release/` 目录下。

---

## 核心功能

### 技能系统

内置常用技能，支持自定义扩展。

<p align="center">
  <img src="https://i.meee.com.tw/vAfes9C.png" width="400" alt="Skills">
</p>

### 悬浮球

通过 `Alt+Space` 快捷键快速唤起。

<p align="center">
  <img src="https://i.meee.com.tw/iKBLLFA.gif" width="400" alt="Floating Ball">
</p>

---

## 合作伙伴

感谢 **MiniMax** 对本项目的支持。

<p align="center">
  <img src="https://i.meee.com.tw/vWOPQjd.png" height="50" alt="MiniMax">
</p>

<p align="center">
  <a href="https://platform.minimaxi.com/subscribe/coding-plan?code=HhNfBTQDNq&source=link">
    <img src="https://i.meee.com.tw/5iu8MHC.png" width="220" alt="MiniMax Coding Plan">
  </a>
</p>

<p align="center">
  <sub>🤝 我们期待与更多 AI 模型厂商建立合作，共同推进 Agent 生态发展。<a href="mailto:a976466014@gmail.com">联系我们</a></sub>
</p>

---

## 文档

- [配置指南](./docs/configuration_cn.md)
- [开发指南](./docs/development_cn.md)

---

## 关于我们

<p align="center">
  <img src="https://github.com/Safphere/.github/raw/main/profile/src/wechat.svg" width="280" alt="Safphere"><br>
  <img src="https://i.meee.com.tw/ZvKkdrT.jpg" width="180" alt="讨论群">
</p>

---

<p align="center">
  Copyright © 2024 <a href="https://github.com/Safphere">Safphere</a> · <a href="./LICENSE">Apache License 2.0</a>
</p>
