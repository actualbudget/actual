# Custom Themes

:::warning
This is an **experimental feature**. That means we're still working on finishing it. There may be bugs, missing functionality or incomplete documentation, and we may decide to remove the feature in a future release. If you have any feedback, please [post a comment on GitHub](https://github.com/actualbudget/actual/issues/6607) or post a message in the Discord.
:::
:::warning
All functionality described here may not be available in the latest stable release. See [Experimental Features](/docs/experimental/) for instructions to enable experimental features. Use the `edge` images for the latest implementation.
:::

Custom themes allow you to personalize the appearance of Actual by installing custom color schemes. You can choose from a catalog of community-created themes or create your own by defining CSS variables that override the default theme colors.

## Using Custom Themes

### Enabling the Feature

Before you can use custom themes, you need to enable the experimental feature:

1. Go to **Settings** → **Show advanced settings** → **Experimental features**
2. Click "I understand the risks, show experimental features"
3. Enable the **Custom themes** toggle

### Installing a Theme from the Catalog

The easiest way to install a custom theme is to choose one from the catalog:

1. Go to **Settings** → **Themes**
2. Select **Custom theme** from the theme dropdown
3. The theme installer will open showing available themes from the catalog
4. Click on any theme to install it immediately

Themes in the catalog are hosted on GitHub and are automatically fetched when you select them. Each theme shows a color palette preview (6 colors in a 3x2 grid) and includes a link to its source repository.

### Installing a Theme by Pasting CSS

You can also install a custom theme by pasting CSS directly:

1. Go to **Settings** → **Themes** → **Custom theme**
2. Scroll down to the "or paste CSS directly" section
3. Paste your theme CSS into the text area
4. Click **Apply**

The CSS will be validated before installation. If there are any errors, they will be displayed below the text area.

## Publishing Custom Themes

If you want to create your own custom theme and publish it for the community to use, you'll need to understand how Actual's theming system works.

### Theme Format

Custom themes must be written as CSS using the `:root` selector with CSS custom properties (variables). The format is:

```css
:root {
  --color-pageBackground: #1a1a1a;
  --color-pageText: #ffffff;
  --color-buttonPrimaryBackground: #007bff;
  /* ... more variables ... */
}
```

**Important requirements:**

- The CSS must contain **exactly** `:root { ... }` and nothing else
- Only custom properties starting with `--` are allowed; Actual uses `--color-*` variables for theming
- No other selectors, at-rules (@import, @media, etc.), or nested blocks are allowed
- Comments are allowed and will be stripped during validation

### Available CSS Variables

Custom themes can override any of the CSS variables defined in Actual's base themes. These variables correspond to the theme color keys found in the theme files:

- `packages/desktop-client/src/style/themes/light.ts`
- `packages/desktop-client/src/style/themes/dark.ts`
- `packages/desktop-client/src/style/themes/midnight.ts`

Common variables include:

**Page Colors:**

- `--color-pageBackground` - Main page background
- `--color-pageText` - Primary text color
- `--color-pageTextSubdued` - Secondary/subdued text
- `--color-pageTextPositive` - Positive/action text color
- `--color-pageTextLink` - Link text color

**Table Colors:**

- `--color-tableBackground` - Table background
- `--color-tableText` - Table text
- `--color-tableBorder` - Table borders
- `--color-tableRowBackgroundHover` - Row hover background

**Button Colors:**

- `--color-buttonPrimaryBackground` - Primary button background
- `--color-buttonPrimaryText` - Primary button text
- `--color-buttonNormalBackground` - Normal button background
- `--color-buttonNormalText` - Normal button text

**Sidebar Colors:**

- `--color-sidebarBackground` - Sidebar background
- `--color-sidebarItemText` - Sidebar item text
- `--color-sidebarItemTextSelected` - Selected sidebar item text

And many more! To see all available variables, check the theme files in the source code or look at an existing theme.

### Validation Rules

When you paste CSS or install from a catalog, the theme is validated to ensure it meets the requirements:

1. Must contain exactly `:root { ... }`
2. Only custom properties starting with `--` are allowed; Actual uses `--color-*` variables for theming
3. No at-rules (@import, @media, @keyframes, etc.)
4. No nested selectors or blocks
5. No content outside the `:root` block

If validation fails, you'll see an error message explaining what's wrong.

### Creating a GitHub-Hosted Theme

To share your theme with others or add it to the catalog, you can host it on GitHub:

1. Create a new GitHub repository
2. Create a file named `actual.css` in the root directory (on the `main` branch)
3. Add your theme CSS to this file

**Example repository structure:**

```text
your-theme-repo/
└── actual.css          # Your theme CSS
```

**Example `actual.css`:**

```css
:root {
  --color-pageBackground: #0d1117;
  --color-pageText: #c9d1d9;
  --color-pageTextSubdued: #8b949e;
  --color-buttonPrimaryBackground: #238636;
  --color-buttonPrimaryText: #ffffff;
  /* Add all other variables you want to customize */
}
```

The theme can then be referenced in the catalog using the format `owner/repo` (e.g., `actualbudget/demo-theme`).

When your theme is added to the catalog, it will display a color palette preview. The palette is defined in the catalog JSON file and should include 6 representative colors from your theme (typically background colors, accent colors, and text colors).

### Example Theme

For a complete example of a custom theme, check out the [demo theme repository](https://github.com/actualbudget/demo-theme). This repository contains multiple theme variations and demonstrates the proper structure and format.

The demo theme includes examples of:

- Proper CSS variable naming
- Complete theme definitions

You can use this as a template for creating your own themes.

### Tips for Theme Development

1. **Start with a base theme**: Copy the CSS variables from one of Actual's built-in themes (light, dark, or midnight) and modify the colors you want to change
2. **Test incrementally**: Make small changes and test them in the app to see the results
3. **Use the paste CSS feature**: During development, use the paste CSS feature to quickly test your theme without needing to host it on GitHub
4. **Check variable names**: Make sure variable names match exactly (case-sensitive) - they should start with `--color-` followed by the theme key name
5. **Consider accessibility**: Ensure sufficient contrast between text and background colors for readability

### Getting Your Theme in the Catalog

To have your theme added to the official catalog, you'll need to:

1. Host your theme on GitHub following the structure above
2. Open an issue or pull request on the Actual repository requesting your theme be added to the catalog
3. Provide the repository name in `owner/repo` format
4. Include 6 representative colors for the color palette preview (as an array of hex color values)

The catalog is maintained in `packages/desktop-client/src/data/customThemeCatalog.json`. Each theme entry includes:

- `name`: The theme name
- `repo`: The GitHub repository in `owner/repo` format
- `colors`: An array of 6 hex color values for the palette preview (e.g., `["#1a1a2e", "#16213e", "#0f3460", "#e94560", "#533483", "#f1f1f1"]`)
