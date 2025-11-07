# Cursor IDE

[Cursor](http://cursor.com) is an AI-powered code editor that helps you automate code changes, create pull requests, and enforce custom rules in your codebase. This guide will show you how to:

- Set up the GitHub MCP server for automated pull requests
- Use Cursor to fix issues and streamline your workflow
- Create and manage custom rules with the `.cursor/rules` directory

---

## Installing the GitHub MCP Server

The GitHub MCP (Model Code Platform) server allows Cursor to connect with your GitHub repositories. With the MCP server, you can automate code changes, manage pull requests, and streamline your development process.

To install the MCP server, use the one-click install option available [here](https://docs.cursor.com/tools).

---

## Automating GitHub Workflows with Cursor

Once the MCP server is running and connected to your repository, you can use Cursor's AI to automate code changes and pull requests.

### Example: Fixing an Issue and Creating a Pull Request

Follow these steps to fix a GitHub issue using Cursor:

1. **Find the Issue**  
   Copy the link to the GitHub issue you want to address.
2. **Ask Cursor to Fix the Issue**  
   In Cursor, paste the issue link and ask:  
   _"Fix this issue and create a pull request."_
3. **Review the Changes**  
   Cursor will:
   - Analyze the issue
   - Suggest code changes
   - Commit the changes
   - Create a pull request on GitHub
4. **Track Progress**  
   Cursor will keep you updated on the status and provide links to the pull request and related commits.

---

## Managing Custom Rules with the `.cursor/rules` Directory

Cursor supports custom rules to help your team follow code style, workflows, and best practices. You can store these rules in the `.cursor/rules/` directory.

### Directory Structure

Each rule is a Markdown (`.mdc`) file that describes guidelines or steps. These files can contain:

- **Code style guidelines** - formatting rules, naming conventions, and best practices
- **Workflow instructions** - how to handle specific types of changes or features
- **Testing requirements** - what tests to write and how to structure them
- **Documentation standards** - how to document code changes and features
- **Review criteria** - what to look for when reviewing pull requests

Learn more about cursor rules: [documentation](https://docs.cursor.com/context/rules).

### Adding or Editing Rules

1. Create or edit Markdown files in `.cursor/rules/`.
2. Write clear, actionable instructions.
3. Cursor will automatically apply these rules when making code changes or reviewing pull requests.

---

## Tips for Using Cursor

- Use rules to enforce team conventions, automate changelog creation, or standardize testing.
- You can ask Cursor to explain or follow any rule in your `.cursor/rules/` directory.
- Keep rules concise and focused for the best results.
