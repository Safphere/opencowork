# 配置指南

OpenCowork 提供了灵活的配置选项，允许您自定义 API 连接、模型选择以及其他高级设置。

## 默认配置

OpenCowork 开箱即用，默认配置如下：

-   **API 地址 (API URL)**: `https://api.minimaxi.com/anthropic`
-   **模型 (Model)**: `MiniMax-M2.1`

该默认配置经过优化，可提供流畅的 Cowork 体验。

## 自定义配置

您可以点击应用界面右下角的齿轮图标 **(⚙️)** 进入设置面板。

### 修改 API 设置

如果您希望使用其他兼容改模型（如 Claude, GPT 等），请按需修改以下字段：

1.  **API Key**: 输入您的服务商提供的 API 密钥。
2.  **API URL**: 输入服务商的 API 端点地址。
3.  **Model**: 输入您希望调用的模型名称（如 `claude-3-opus-20240229`）。

### 环境变量

您也可以通过项目根目录下的 `.env` 文件进行配置（仅限开发环境）：

VITE_MODEL_NAME=your-model-name
```

## MCP 配置

应用使用 `mcp.json` (或 `mcp_storage.json`) 来定义可用的 MCP 服务器。这允许您通过外部工具和数据源来扩展 AI 的能力。
