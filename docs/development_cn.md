# 开发指南

欢迎参与 OpenCowork 的开发！我们将指导您如何在本地搭建开发环境并参与贡献。

## 前置要求

在开始之前，请确保您的开发环境满足以下要求：

-   **Node.js**: v18 或更高版本 (推荐 v20 LTS)
-   **npm**: 用于包管理

## 安装与运行

### 1. 克隆仓库

首先，将项目代码克隆到本地：

```bash
git clone https://github.com/Safphere/opencowork.git
cd opencowork
```

### 2. 安装依赖

使用 npm 安装项目依赖：

```bash
npm install
```

### 3. 启动开发环境

运行以下命令启动本地开发服务器：

```bash
npm run dev
```

启动后，Electron 应用窗口将自动打开，同时您可以在终端看到前端服务的运行日志。

## 构建与发布

本项目使用 **GitHub Actions** 进行自动化构建，这也是我们推荐的发布方式。

### 自动化构建

1.  确保您的代码已提交并推送到 GitHub 仓库。
2.  创建一个以 `v` 开头的 Tag（例如 `v1.0.0`）并推送到远程：
    ```bash
    git tag v1.0.0
    git push origin v1.0.0
    ```
3.  GitHub Actions 将自动触发构建流程，并行生成以下平台的安装包：
    -   **Windows**: `.exe` (NSIS 安装包)
    -   **macOS**: `.dmg` 和 `.zip`
    -   **Linux**: `.AppImage`
4.  构建完成后，产物将自动发布到项目的 [Releases](https://github.com/Safphere/opencowork/releases) 页面。

### 手动构建

如果您需要在本地生成发行版安装包，可以运行：

```bash
npm run build
```

构建产物将输出到 `release` 目录。
