# Configuration Guide

OpenCowork provides flexible configuration options, allowing you to customize API connections, model selection, and other advanced settings.

## Default Configuration

OpenCowork is ready to use out of the box with the following defaults:

-   **API URL**: `https://api.minimaxi.com/anthropic`
-   **Model**: `MiniMax-M2.1`

This configuration is optimized for a smooth Cowork experience.

## Custom Configuration

You can access the Settings panel by clicking the gear icon **(⚙️)** in the bottom right corner of the application interface.

### Modifying API Settings

If you wish to use other compatible models (such as Claude, GPT, etc.), please modify the following fields as needed:

1.  **API Key**: Enter the API key provided by your provider.
2.  **API URL**: Enter the API endpoint address of your provider.
3.  **Model**: Enter the model name you wish to call (e.g., `claude-3-opus-20240229`).

### Environment Variables

You can also configure settings via the `.env` file in the project root (development environment only):

```env
VITE_API_URL=https://your-api-url.com
VITE_MODEL_NAME=your-model-name
```
