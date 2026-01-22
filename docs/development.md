# Development Guide

Welcome to OpenCowork development! This guide will help you set up your local environment and contribute to the project.

## Prerequisites

Before you begin, please ensure your development environment meets the following requirements:

-   **Node.js**: v18 or higher (v20 LTS recommended)
-   **npm**: For package management

## Setup & Running

### 1. Clone the Repository

First, clone the project code to your local machine:

```bash
git clone https://github.com/Safphere/opencowork.git
cd opencowork
```

### 2. Install Dependencies

Install project dependencies using npm:

```bash
npm install
```

### 3. Start Development Server

Run the following command to start the local development server:

```bash
npm run dev
```

Once started, the Electron application window should open automatically, and you will see the frontend service logs in your terminal.

## Build & Release

This project uses **GitHub Actions** for automated builds, which is our recommended way to release.

### Automated Build

1.  Ensure your code is committed and pushed to the GitHub repository.
2.  Create a Tag starting with `v` (e.g., `v1.0.0`) and push it to the remote:
    ```bash
    git tag v1.0.0
    git push origin v1.0.0
    ```
3.  GitHub Actions will automatically trigger the build pipeline and generate installers for:
    -   **Windows**: `.exe` (NSIS installer)
    -   **macOS**: `.dmg` and `.zip`
    -   **Linux**: `.AppImage`
4.  Once completed, artifacts will be published to the project's [Releases](https://github.com/Safphere/opencowork/releases) page.

### Manual Build

If you need to generate distribution installers locally, run:

```bash
npm run build
```

Build artifacts will be output to the `release` directory.

## MCP Server Development

For details on extending functionality with MCP servers, please refer to the `resources/skills/mcp-builder/` directory, which contains documentation and example projects.

## Note on macOS Build

When building for macOS, ensure `electron-builder.json5` is correctly configured with the path to your `icon.icns` file to ensure the application icon displays correctly in the DMG installer.
