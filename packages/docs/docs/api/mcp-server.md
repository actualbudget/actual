---
title: MCP Server for AI Assistants
---

The Actual desktop app includes an optional, built-in [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server. MCP is an open standard that lets AI apps such as Claude, Cursor or VS Code connect to other programs. Once it is turned on, an AI assistant can read the budget you have open in Actual and use it to answer questions, give financial advice or analyze your spending.

The MCP server is part of the desktop app itself. You don't need Docker, a sync server or any other program: it starts and stops together with Actual.

:::note
The MCP server is only available in the desktop app (Windows, macOS and Linux). It is not available when you use Actual in a web browser.
:::

## What an Assistant Can and Can't Do

The MCP server is **read-only**. An assistant connected to it can:

- read your accounts and their balances,
- read your categories, payees, tags, schedules and rules,
- read your transactions, with filters such as date range, account, category or payee,
- read the budget of any month (budgeted, spent and remaining amounts),
- add up transactions by category, payee, account, month or year,
- run custom read-only queries using [ActualQL](./actual-ql/index.md).

An assistant **can't** add, change or delete anything in your budget.

The assistant can only see the budget that is currently open in Actual, and only while Actual is running. If no budget is open, it receives an error asking you to open one.

## Turning On the MCP Server

1. Open Actual and go to **Settings**.
2. Find the **AI assistant access (MCP server)** section.
3. Check **Enable the MCP server**.

Actual creates a random access token and starts listening. The section shows the server URL (by default `http://127.0.0.1:5008/mcp`) and confirms that the server is running.

The server only accepts connections from your own computer, and every request must include the access token. Keep the token private, like a password. If you think someone else has it, click **Regenerate** to create a new one; apps using the old token are disconnected.

### Changing the Port

If another program already uses port 5008, Actual shows an error. To pick another port:

1. Type a new number in the **Port** field (between 1 and 65535).
2. Click **Save and restart**.

Remember to update the URL in your AI apps after changing the port.

## Connecting an AI App

In the **Connect an AI app** part of the MCP section, choose your app from the list. Actual shows the exact configuration to use, with your URL and token already filled in. Click **Copy** to copy it.

### Claude Code

Run the copied command in a terminal. It looks like this:

```bash
claude mcp add --transport http actual-budget http://127.0.0.1:5008/mcp --header "Authorization: Bearer YOUR-TOKEN"
```

### Claude Desktop

Claude Desktop starts local servers as a command, so it connects through the small [mcp-remote](https://www.npmjs.com/package/mcp-remote) bridge. This requires [Node.js](https://nodejs.org) to be installed.

1. In Claude Desktop, open **Settings**, then **Developer**, then **Edit Config**.
2. Paste the copied configuration into `claude_desktop_config.json`. If the file already has an `mcpServers` section, add the `actual-budget` entry to it.
3. Restart Claude Desktop.

### Cursor and VS Code

Paste the copied configuration into `~/.cursor/mcp.json` (Cursor) or `.vscode/mcp.json` (VS Code). Both apps connect directly to the URL and send the token in an `Authorization` header.

### Other Apps

Any app that supports the MCP "Streamable HTTP" transport can connect. Use:

- **URL**: `http://127.0.0.1:5008/mcp` (or the port you chose)
- **Header**: `Authorization: Bearer YOUR-TOKEN`

## Tips for Using an Assistant

- Money amounts are sent to the assistant as whole numbers of cents. For example, `-4599` means a $45.99 expense. The assistant is told about this automatically.
- Start with a broad question, such as "Summarize my spending by category over the last three months", and then ask follow-up questions.
- Remember that the AI app sends the data it reads to its provider to generate answers. Check the privacy policy of the AI app you use.
