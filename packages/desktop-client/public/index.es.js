const c = e => t =>
    /* @__PURE__ */ e.createElement(
      'svg',
      {
        ...t,
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: '0 0 20 20',
        style: {
          color: 'inherit',
          ...t.style,
        },
      },
      /* @__PURE__ */ e.createElement('path', {
        d: 'M11 9.27V0l6 11-4 6H7l-4-6L9 0v9.27a2 2 0 1 0 2 0zM6 18h8v2H6v-2z',
        fill: 'currentColor',
      }),
    ),
  u = e => {
    const o = c(e);
    return ({ themeName: d, darkMode: a, style: r }) => {
      switch (d) {
        case 'dracula':
          return /* @__PURE__ */ e.createElement(o, { style: r });
      }
      return /* @__PURE__ */ e.createElement('div', { style: r });
    };
  },
  b = {
    // Page
    pageBackground: '#282a36',
    // Dark background
    pageBackgroundModalActive: '#44475a',
    // Slightly lighter modal background
    pageBackgroundTopLeft: '#44475a',
    pageBackgroundBottomRight: '#6272a4',
    // Muted blue for a gradient
    pageBackgroundLineTop: '#bd93f9',
    // Purple
    pageBackgroundLineMid: '#6272a4',
    // Muted blue
    pageBackgroundLineBottom: '#ff79c6',
    // Pink
    pageText: '#f8f8f2',
    // Light text
    pageTextLight: '#bd93f9',
    // Purple for lighter tone
    pageTextSubdued: '#6272a4',
    // Comments
    pageTextDark: '#ff79c6',
    // Pink for emphasis
    pageTextPositive: '#50fa7b',
    // Green for positivity
    pageTextLink: '#8be9fd',
    // Cyan for links
    pageTextLinkLight: '#50fa7b',
    // Light green for hover links
    // Card
    cardBackground: '#44475a',
    // Current line background
    cardBorder: '#bd93f9',
    // Purple border
    cardShadow: 'rgba(0, 0, 0, 0.5)',
    // Slight shadow
    // Table
    tableBackground: '#282a36',
    tableRowBackgroundHover: '#44475a',
    tableRowBackgroundHighlight: '#ff79c6',
    // Pink highlight
    tableRowBackgroundHighlightText: '#282a36',
    tableText: '#f8f8f2',
    tableTextLight: '#bd93f9',
    tableTextSubdued: '#6272a4',
    tableTextSelected: '#50fa7b',
    // Green selection
    tableTextHover: '#ff79c6',
    tableTextInactive: '#6272a4',
    tableHeaderText: '#8be9fd',
    // Cyan header text
    tableHeaderBackground: '#44475a',
    tableBorder: '#6272a4',
    tableBorderSelected: '#bd93f9',
    tableBorderHover: '#50fa7b',
    tableBorderSeparator: '#44475a',
    // Sidebar
    sidebarBackground: '#282a36',
    sidebarItemBackgroundPending: '#ffb86c',
    // Orange pending
    sidebarItemBackgroundPositive: '#50fa7b',
    // Green for success
    sidebarItemBackgroundFailed: '#ff5555',
    // Red for failure
    sidebarItemBackgroundHover: '#44475a',
    sidebarItemAccentSelected: '#ff79c6',
    sidebarItemText: '#f8f8f2',
    sidebarItemTextSelected: '#ff79c6',
    // Menu
    menuBackground: '#44475a',
    menuItemBackground: '#282a36',
    menuItemBackgroundHover: '#6272a4',
    menuItemText: '#f8f8f2',
    menuItemTextHover: '#ff79c6',
    menuItemTextSelected: '#50fa7b',
    menuItemTextHeader: '#bd93f9',
    menuBorder: '#6272a4',
    menuBorderHover: '#ff79c6',
    menuKeybindingText: '#8be9fd',
    // Cyan for keybindings
    menuAutoCompleteBackground: '#282a36',
    menuAutoCompleteBackgroundHover: '#44475a',
    menuAutoCompleteText: '#f8f8f2',
    menuAutoCompleteTextHover: '#50fa7b',
    menuAutoCompleteTextHeader: '#ffb86c',
    menuAutoCompleteItemTextHover: '#ff79c6',
    menuAutoCompleteItemText: '#f8f8f2',
    // Modal
    modalBackground: '#44475a',
    modalBorder: '#6272a4',
    // Mobile
    mobileHeaderBackground: '#44475a',
    mobileHeaderText: '#ff79c6',
    mobileHeaderTextSubdued: '#6272a4',
    mobileHeaderTextHover: 'rgba(255, 121, 198, 0.15)',
    mobilePageBackground: '#282a36',
    mobileNavBackground: '#44475a',
    mobileNavItem: '#6272a4',
    mobileNavItemSelected: '#ff79c6',
    mobileAccountShadow: 'rgba(0, 0, 0, 0.6)',
    mobileAccountText: '#8be9fd',
    mobileTransactionSelected: '#50fa7b',
    // Mobile Themes
    mobileViewTheme: '#44475a',
    mobileConfigServerViewTheme: '#ff79c6',
    // Markdown
    markdownNormal: '#ff79c6',
    markdownDark: '#bd93f9',
    markdownLight: '#50fa7b',
    // Buttons
    buttonMenuText: '#f8f8f2',
    buttonMenuTextHover: '#ff79c6',
    buttonMenuBackground: 'transparent',
    buttonMenuBackgroundHover: 'rgba(255, 121, 198, 0.2)',
    buttonMenuBorder: '#bd93f9',
    buttonMenuSelectedText: '#282a36',
    buttonMenuSelectedTextHover: '#282a36',
    buttonMenuSelectedBackground: '#50fa7b',
    buttonMenuSelectedBackgroundHover: '#6272a4',
    buttonMenuSelectedBorder: '#50fa7b',
    buttonPrimaryText: '#282a36',
    buttonPrimaryTextHover: '#282a36',
    buttonPrimaryBackground: '#50fa7b',
    buttonPrimaryBackgroundHover: '#8be9fd',
    buttonPrimaryBorder: '#50fa7b',
    buttonPrimaryShadow: 'rgba(0, 0, 0, 0.6)',
    buttonPrimaryDisabledText: '#6272a4',
    buttonPrimaryDisabledBackground: '#44475a',
    buttonPrimaryDisabledBorder: '#6272a4',
    buttonNormalText: '#f8f8f2',
    buttonNormalTextHover: '#ff79c6',
    buttonNormalBackground: '#44475a',
    buttonNormalBackgroundHover: '#6272a4',
    buttonNormalBorder: '#6272a4',
    buttonNormalShadow: 'rgba(0, 0, 0, 0.3)',
    buttonNormalDisabledText: '#6272a4',
    buttonNormalDisabledBackground: '#282a36',
    buttonNormalDisabledBorder: '#6272a4',
    buttonBareText: '#f8f8f2',
    buttonBareTextHover: '#ff79c6',
    buttonBareBackground: 'transparent',
    buttonBareBackgroundHover: 'rgba(255, 121, 198, 0.2)',
    buttonBareBackgroundActive: 'rgba(255, 121, 198, 0.3)',
    buttonBareDisabledText: '#6272a4',
    buttonBareDisabledBackground: 'transparent',
    // Calendar
    calendarText: '#f8f8f2',
    calendarBackground: '#282a36',
    calendarItemText: '#f8f8f2',
    calendarItemBackground: '#44475a',
    calendarSelectedBackground: '#bd93f9',
    // Notices
    noticeBackground: '#50fa7b',
    noticeText: '#282a36',
    noticeBorder: '#6272a4',
    warningBackground: '#ffb86c',
    warningText: '#282a36',
    warningBorder: '#bd93f9',
    errorBackground: '#ff5555',
    errorText: '#282a36',
    errorBorder: '#ff79c6',
    upcomingBackground: '#bd93f9',
    upcomingText: '#282a36',
    upcomingBorder: '#ff79c6',
    // Form
    formLabelText: '#8be9fd',
    formLabelBackground: '#44475a',
    formInputBackground: '#44475a',
    formInputBackgroundSelected: '#6272a4',
    formInputBackgroundSelection: '#50fa7b',
    formInputBorder: '#bd93f9',
    formInputText: '#f8f8f2',
    formInputTextSelected: '#50fa7b',
    formInputTextPlaceholder: '#6272a4',
    formInputTextHighlight: '#ff79c6',
    formInputShadowSelected: 'rgba(189, 147, 249, 0.5)',
    // Miscellaneous
    pillBackground: '#44475a',
    pillBackgroundLight: '#6272a4',
    pillText: '#f8f8f2',
    pillTextHighlighted: '#ff79c6',
    pillBorder: '#bd93f9',
    pillBackgroundSelected: '#50fa7b',
    pillTextSelected: '#282a36',
    pillBorderSelected: '#50fa7b',
    pillTextSubdued: '#6272a4',
    reportsRed: '#ff5555',
    reportsBlue: '#8be9fd',
    reportsGreen: '#50fa7b',
    reportsGray: '#6272a4',
    reportsLabel: '#f8f8f2',
    reportsInnerLabel: '#bd93f9',
    noteTagBackground: '#44475a',
    noteTagBackgroundHover: '#6272a4',
    noteTagText: '#8be9fd',
    floatingActionBarBackground: '#44475a',
    floatingActionBarBorder: '#bd93f9',
    floatingActionBarText: '#f8f8f2',
    tooltipText: '#f8f8f2',
    tooltipBackground: '#44475a',
    tooltipBorder: '#bd93f9',
  },
  l = {
    // Page
    pageBackground: '#f4ecd8',
    // Light sepia background
    pageBackgroundModalActive: '#e8dcc0',
    // Slightly darker modal
    pageBackgroundTopLeft: '#f3e4c8',
    pageBackgroundBottomRight: '#d9c7a5',
    pageBackgroundLineTop: '#bfa786',
    pageBackgroundLineMid: '#a39077',
    pageBackgroundLineBottom: '#8c7b65',
    pageText: '#5c4b3b',
    // Dark brown for text
    pageTextLight: '#7d6c5b',
    pageTextSubdued: '#a08e7b',
    pageTextDark: '#3d2f25',
    pageTextPositive: '#9b7e5a',
    // Muted warm sepia
    pageTextLink: '#8c6f4d',
    pageTextLinkLight: '#af8b67',
    // Card
    cardBackground: '#ede1c8',
    cardBorder: '#d3b997',
    cardShadow: 'rgba(75, 60, 45, 0.3)',
    // Table
    tableBackground: '#f4ecd8',
    tableRowBackgroundHover: '#e2d4b7',
    tableRowBackgroundHighlight: '#d9c7a5',
    tableRowBackgroundHighlightText: '#5c4b3b',
    tableText: '#5c4b3b',
    tableTextLight: '#8c7b65',
    tableTextSubdued: '#a08e7b',
    tableTextSelected: '#9b7e5a',
    tableTextHover: '#7d6c5b',
    tableTextInactive: '#bfa786',
    tableHeaderText: '#7c6a53',
    tableHeaderBackground: '#ede1c8',
    tableBorder: '#d3b997',
    tableBorderSelected: '#b89d7d',
    tableBorderHover: '#a89072',
    tableBorderSeparator: '#c5b299',
    // Sidebar
    sidebarBackground: '#f4ecd8',
    sidebarItemBackgroundPending: '#bfa786',
    sidebarItemBackgroundPositive: '#9b7e5a',
    sidebarItemBackgroundFailed: '#a67c52',
    sidebarItemBackgroundHover: '#e2d4b7',
    sidebarItemAccentSelected: '#8c6f4d',
    sidebarItemText: '#5c4b3b',
    sidebarItemTextSelected: '#7c6a53',
    // Menu
    menuBackground: '#e8dcc0',
    menuItemBackground: '#ede1c8',
    menuItemBackgroundHover: '#d9c7a5',
    menuItemText: '#5c4b3b',
    menuItemTextHover: '#7d6c5b',
    menuItemTextSelected: '#9b7e5a',
    menuItemTextHeader: '#8c6f4d',
    menuBorder: '#d3b997',
    menuBorderHover: '#bfa786',
    menuKeybindingText: '#a08e7b',
    menuAutoCompleteBackground: '#f3e4c8',
    menuAutoCompleteBackgroundHover: '#e2d4b7',
    menuAutoCompleteText: '#5c4b3b',
    menuAutoCompleteTextHover: '#9b7e5a',
    menuAutoCompleteTextHeader: '#bfa786',
    menuAutoCompleteItemTextHover: '#7d6c5b',
    menuAutoCompleteItemText: '#5c4b3b',
    // Modal
    modalBackground: '#ede1c8',
    modalBorder: '#d3b997',
    // Mobile
    mobileHeaderBackground: '#d9c7a5',
    mobileHeaderText: '#5c4b3b',
    mobileHeaderTextSubdued: '#7c6a53',
    mobileHeaderTextHover: 'rgba(140, 111, 77, 0.2)',
    mobilePageBackground: '#f4ecd8',
    mobileNavBackground: '#e8dcc0',
    mobileNavItem: '#a08e7b',
    mobileNavItemSelected: '#9b7e5a',
    mobileAccountShadow: 'rgba(75, 60, 45, 0.2)',
    mobileAccountText: '#8c6f4d',
    mobileTransactionSelected: '#b89d7d',
    // Mobile Themes
    mobileViewTheme: '#e2d4b7',
    mobileConfigServerViewTheme: '#a67c52',
    // Markdown
    markdownNormal: '#8c6f4d',
    markdownDark: '#5c4b3b',
    markdownLight: '#bfa786',
    // Buttons
    buttonMenuText: '#5c4b3b',
    buttonMenuTextHover: '#7d6c5b',
    buttonMenuBackground: 'transparent',
    buttonMenuBackgroundHover: 'rgba(140, 111, 77, 0.2)',
    buttonMenuBorder: '#9b7e5a',
    buttonMenuSelectedText: '#f4ecd8',
    buttonMenuSelectedTextHover: '#f4ecd8',
    buttonMenuSelectedBackground: '#8c6f4d',
    buttonMenuSelectedBackgroundHover: '#9b7e5a',
    buttonMenuSelectedBorder: '#9b7e5a',
    buttonPrimaryText: '#f4ecd8',
    buttonPrimaryTextHover: '#f4ecd8',
    buttonPrimaryBackground: '#8c6f4d',
    buttonPrimaryBackgroundHover: '#7d6c5b',
    buttonPrimaryBorder: '#9b7e5a',
    buttonPrimaryShadow: 'rgba(75, 60, 45, 0.4)',
    buttonPrimaryDisabledText: '#bfa786',
    buttonPrimaryDisabledBackground: '#d9c7a5',
    buttonPrimaryDisabledBorder: '#c5b299',
    buttonNormalText: '#5c4b3b',
    buttonNormalTextHover: '#7d6c5b',
    buttonNormalBackground: '#ede1c8',
    buttonNormalBackgroundHover: '#e2d4b7',
    buttonNormalBorder: '#d3b997',
    buttonNormalShadow: 'rgba(75, 60, 45, 0.3)',
    buttonNormalDisabledText: '#bfa786',
    buttonNormalDisabledBackground: '#e8dcc0',
    buttonNormalDisabledBorder: '#c5b299',
    buttonBareText: '#5c4b3b',
    buttonBareTextHover: '#7d6c5b',
    buttonBareBackground: 'transparent',
    buttonBareBackgroundHover: 'rgba(140, 111, 77, 0.2)',
    buttonBareBackgroundActive: 'rgba(140, 111, 77, 0.3)',
    buttonBareDisabledText: '#a08e7b',
    buttonBareDisabledBackground: 'transparent',
    // Calendar
    calendarText: '#5c4b3b',
    calendarBackground: '#f4ecd8',
    calendarItemText: '#7d6c5b',
    calendarItemBackground: '#d9c7a5',
    calendarSelectedBackground: '#bfa786',
    // Notices
    noticeBackground: '#d9c7a5',
    noticeText: '#5c4b3b',
    noticeBorder: '#bfa786',
    warningBackground: '#b89d7d',
    warningText: '#5c4b3b',
    warningBorder: '#a67c52',
    errorBackground: '#a67c52',
    errorText: '#f4ecd8',
    errorBorder: '#8c6f4d',
    upcomingBackground: '#c5b299',
    upcomingText: '#5c4b3b',
    upcomingBorder: '#9b7e5a',
    // Form
    formLabelText: '#8c6f4d',
    formLabelBackground: '#ede1c8',
    formInputBackground: '#e8dcc0',
    formInputBackgroundSelected: '#d3b997',
    formInputBackgroundSelection: '#bfa786',
    formInputBorder: '#c5b299',
    formInputText: '#5c4b3b',
    formInputTextSelected: '#3d2f25',
    formInputTextPlaceholder: '#a08e7b',
    formInputTextHighlight: '#8c6f4d',
    formInputShadowSelected: 'rgba(140, 111, 77, 0.3)',
    // Miscellaneous
    pillBackground: '#e2d4b7',
    pillBackgroundLight: '#ede1c8',
    pillText: '#5c4b3b',
    pillTextHighlighted: '#7d6c5b',
    pillBorder: '#bfa786',
    pillBackgroundSelected: '#c5b299',
    pillTextSelected: '#3d2f25',
    pillBorderSelected: '#9b7e5a',
    pillTextSubdued: '#a08e7b',
    reportsRed: '#a67c52',
    reportsBlue: '#9b7e5a',
    reportsGreen: '#8c6f4d',
    reportsGray: '#bfa786',
    reportsLabel: '#5c4b3b',
    reportsInnerLabel: '#7d6c5b',
    noteTagBackground: '#e2d4b7',
    noteTagBackgroundHover: '#d3b997',
    noteTagText: '#5c4b3b',
    floatingActionBarBackground: '#ede1c8',
    floatingActionBarBorder: '#bfa786',
    floatingActionBarText: '#5c4b3b',
    tooltipText: '#5c4b3b',
    tooltipBackground: '#d9c7a5',
    tooltipBorder: '#bfa786',
  },
  g = {
    // Page
    pageBackground: '#191724',
    // Base background
    pageBackgroundModalActive: '#1f1d2e',
    // Surface
    pageBackgroundTopLeft: '#191724',
    pageBackgroundBottomRight: '#26233a',
    pageBackgroundLineTop: '#eb6f92',
    // Rose
    pageBackgroundLineMid: '#9ccfd8',
    // Foam
    pageBackgroundLineBottom: '#c4a7e7',
    // Iris
    pageText: '#e0def4',
    pageTextLight: '#908caa',
    // Subtle
    pageTextSubdued: '#6e6a86',
    // Muted
    pageTextDark: '#f6c177',
    // Gold
    pageTextPositive: '#31748f',
    // Pine
    pageTextLink: '#ebbcba',
    // Love
    pageTextLinkLight: '#9ccfd8',
    // Foam
    // Card
    cardBackground: '#1f1d2e',
    cardBorder: '#c4a7e7',
    cardShadow: 'rgba(0, 0, 0, 0.5)',
    // Table
    tableBackground: '#1f1d2e',
    tableRowBackgroundHover: '#26233a',
    tableText: '#e0def4',
    tableTextLight: '#908caa',
    tableTextSubdued: '#6e6a86',
    tableTextSelected: '#c4a7e7',
    tableTextHover: '#f6c177',
    tableTextInactive: '#6e6a86',
    tableHeaderText: '#9ccfd8',
    tableHeaderBackground: '#191724',
    tableBorder: '#6e6a86',
    tableBorderSelected: '#c4a7e7',
    tableBorderHover: '#f6c177',
    tableBorderSeparator: '#6e6a86',
    tableRowBackgroundHighlight: '#31748f',
    tableRowBackgroundHighlightText: '#e0def4',
    tableRowHeaderBackground: '#26233a',
    tableRowHeaderText: '#f6c177',
    // Sidebar
    sidebarBackground: '#191724',
    sidebarItemBackgroundPending: '#f6c177',
    sidebarItemBackgroundPositive: '#31748f',
    sidebarItemBackgroundFailed: '#eb6f92',
    sidebarItemAccentSelected: '#c4a7e7',
    sidebarItemBackgroundHover: '#26233a',
    sidebarItemText: '#e0def4',
    sidebarItemTextSelected: '#ebbcba',
    // Menu
    menuBackground: '#26233a',
    menuItemBackground: '#1f1d2e',
    menuItemBackgroundHover: '#31748f',
    menuItemText: '#e0def4',
    menuItemTextHover: '#f6c177',
    menuItemTextSelected: '#c4a7e7',
    menuItemTextHeader: '#9ccfd8',
    menuBorder: '#6e6a86',
    menuBorderHover: '#c4a7e7',
    menuKeybindingText: '#9ccfd8',
    menuAutoCompleteBackground: '#1f1d2e',
    menuAutoCompleteBackgroundHover: '#26233a',
    menuAutoCompleteText: '#e0def4',
    menuAutoCompleteTextHover: '#c4a7e7',
    menuAutoCompleteTextHeader: '#f6c177',
    menuAutoCompleteItemTextHover: '#f6c177',
    menuAutoCompleteItemText: '#e0def4',
    // Modal
    modalBackground: '#1f1d2e',
    modalBorder: '#c4a7e7',
    // Mobile
    mobileHeaderBackground: '#26233a',
    mobileHeaderText: '#f6c177',
    mobileHeaderTextSubdued: '#6e6a86',
    mobileHeaderTextHover: 'rgba(246, 193, 119, 0.2)',
    mobilePageBackground: '#191724',
    mobileNavBackground: '#1f1d2e',
    mobileNavItem: '#6e6a86',
    mobileNavItemSelected: '#c4a7e7',
    mobileAccountShadow: 'rgba(0, 0, 0, 0.5)',
    mobileAccountText: '#9ccfd8',
    mobileTransactionSelected: '#ebbcba',
    // Mobile Themes
    mobileViewTheme: '#26233a',
    mobileConfigServerViewTheme: '#c4a7e7',
    // Markdown
    markdownNormal: '#ebbcba',
    markdownDark: '#eb6f92',
    markdownLight: '#c4a7e7',
    // Buttons
    buttonMenuText: '#e0def4',
    buttonMenuTextHover: '#f6c177',
    buttonMenuBackground: 'transparent',
    buttonMenuBackgroundHover: 'rgba(246, 193, 119, 0.2)',
    buttonMenuBorder: '#9ccfd8',
    buttonMenuSelectedText: '#191724',
    buttonMenuSelectedTextHover: '#191724',
    buttonMenuSelectedBackground: '#f6c177',
    buttonMenuSelectedBackgroundHover: '#ebbcba',
    buttonMenuSelectedBorder: '#f6c177',
    buttonPrimaryText: '#191724',
    buttonPrimaryTextHover: '#191724',
    buttonPrimaryBackground: '#f6c177',
    buttonPrimaryBackgroundHover: '#ebbcba',
    buttonPrimaryBorder: '#f6c177',
    buttonPrimaryShadow: 'rgba(0, 0, 0, 0.5)',
    buttonPrimaryDisabledText: '#6e6a86',
    buttonPrimaryDisabledBackground: '#26233a',
    buttonPrimaryDisabledBorder: '#6e6a86',
    buttonNormalText: '#e0def4',
    buttonNormalTextHover: '#f6c177',
    buttonNormalBackground: '#26233a',
    buttonNormalBackgroundHover: '#31748f',
    buttonNormalBorder: '#9ccfd8',
    buttonNormalShadow: 'rgba(0, 0, 0, 0.3)',
    buttonNormalSelectedText: '#191724',
    buttonNormalSelectedBackground: '#c4a7e7',
    buttonNormalDisabledText: '#6e6a86',
    buttonNormalDisabledBackground: '#1f1d2e',
    buttonNormalDisabledBorder: '#6e6a86',
    buttonBareText: '#e0def4',
    buttonBareTextHover: '#f6c177',
    buttonBareBackground: 'transparent',
    buttonBareBackgroundHover: 'rgba(246, 193, 119, 0.2)',
    buttonBareBackgroundActive: 'rgba(246, 193, 119, 0.3)',
    buttonBareDisabledText: '#6e6a86',
    buttonBareDisabledBackground: 'transparent',
    // Calendar
    calendarText: '#e0def4',
    calendarBackground: '#191724',
    calendarItemText: '#e0def4',
    calendarItemBackground: '#1f1d2e',
    calendarSelectedBackground: '#c4a7e7',
    // Notices
    noticeBackground: '#f6c177',
    noticeBackgroundLight: '#f4a261',
    noticeBackgroundDark: '#ebbcba',
    noticeText: '#191724',
    noticeTextLight: '#6e6a86',
    noticeTextDark: '#9ccfd8',
    noticeTextMenu: '#eb6f92',
    noticeTextMenuHover: '#f6c177',
    noticeBorder: '#c4a7e7',
    warningBackground: '#ebbcba',
    warningText: '#191724',
    warningTextLight: '#f6c177',
    warningTextDark: '#c4a7e7',
    warningBorder: '#eb6f92',
    errorBackground: '#eb6f92',
    errorText: '#191724',
    errorTextDark: '#c4a7e7',
    errorTextDarker: '#c4a7e7',
    errorTextMenu: '#f6c177',
    errorBorder: '#ebbcba',
    upcomingBackground: '#c4a7e7',
    upcomingText: '#191724',
    upcomingBorder: '#9ccfd8',
    // Form
    formLabelText: '#9ccfd8',
    formLabelBackground: '#26233a',
    formInputBackground: '#1f1d2e',
    formInputBackgroundSelected: '#26233a',
    formInputBackgroundSelection: '#c4a7e7',
    formInputBorder: '#9ccfd8',
    formInputTextReadOnlySelection: '#6e6a86',
    formInputBorderSelected: '#f6c177',
    formInputText: '#e0def4',
    formInputTextSelected: '#ebbcba',
    formInputTextPlaceholder: '#6e6a86',
    formInputTextPlaceholderSelected: '#9ccfd8',
    formInputTextSelection: '#c4a7e7',
    formInputShadowSelected: 'rgba(189, 147, 249, 0.5)',
    formInputTextHighlight: '#f6c177',
    // Checkbox
    checkboxText: '#e0def4',
    checkboxBackgroundSelected: '#9ccfd8',
    checkboxBorderSelected: '#c4a7e7',
    checkboxShadowSelected: 'rgba(0, 0, 0, 0.4)',
    checkboxToggleBackground: '#6e6a86',
    checkboxToggleBackgroundSelected: '#c4a7e7',
    checkboxToggleDisabled: '#26233a',
    // Pill
    pillBackground: '#26233a',
    pillBackgroundLight: '#1f1d2e',
    pillText: '#e0def4',
    pillTextHighlighted: '#f6c177',
    pillBorder: '#9ccfd8',
    pillBorderDark: '#6e6a86',
    pillBackgroundSelected: '#c4a7e7',
    pillTextSelected: '#191724',
    pillBorderSelected: '#f6c177',
    pillTextSubdued: '#6e6a86',
    // Reports
    reportsRed: '#eb6f92',
    reportsBlue: '#9ccfd8',
    reportsGreen: '#31748f',
    reportsGray: '#6e6a86',
    reportsLabel: '#e0def4',
    reportsInnerLabel: '#908caa',
    // Misc
    noteTagBackground: '#26233a',
    noteTagBackgroundHover: '#1f1d2e',
    noteTagText: '#f6c177',
    floatingActionBarBackground: '#26233a',
    floatingActionBarBorder: '#c4a7e7',
    floatingActionBarText: '#e0def4',
    tooltipText: '#e0def4',
    tooltipBackground: '#1f1d2e',
    tooltipBorder: '#c4a7e7',
    // Budget
    budgetOtherMonth: '#1f1d2e',
    budgetCurrentMonth: '#26233a',
    budgetHeaderOtherMonth: '#6e6a86',
    budgetHeaderCurrentMonth: '#c4a7e7',
  },
  f = {
    // Page
    pageBackground: '#1a1b26',
    // Dark navy blue
    pageBackgroundModalActive: '#16161e',
    // Deeper navy for modal
    pageBackgroundTopLeft: '#1f2335',
    // Slightly lighter navy
    pageBackgroundBottomRight: '#16161e',
    // Dark navy
    pageBackgroundLineTop: '#7aa2f7',
    // Light blue
    pageBackgroundLineMid: '#565f89',
    // Grayish blue
    pageBackgroundLineBottom: '#9ece6a',
    // Soft green
    pageText: '#c0caf5',
    // Light gray-blue
    pageTextLight: '#a9b1d6',
    // Subtle light gray
    pageTextSubdued: '#565f89',
    // Muted gray-blue
    pageTextDark: '#f7768e',
    // Rose red
    pageTextPositive: '#9ece6a',
    // Green
    pageTextLink: '#7aa2f7',
    // Light blue
    pageTextLinkLight: '#bb9af7',
    // Purple
    // Card
    cardBackground: '#1f2335',
    // Surface color
    cardBorder: '#565f89',
    cardShadow: 'rgba(0, 0, 0, 0.5)',
    // Table
    tableBackground: '#1a1b26',
    tableRowBackgroundHover: '#1f2335',
    tableRowBackgroundHighlight: '#7aa2f7',
    tableRowBackgroundHighlightText: '#c0caf5',
    tableText: '#c0caf5',
    tableTextLight: '#a9b1d6',
    tableTextSubdued: '#565f89',
    tableTextSelected: '#bb9af7',
    // Purple
    tableTextHover: '#7dcfff',
    // Cyan
    tableTextInactive: '#414868',
    tableHeaderText: '#7aa2f7',
    tableHeaderBackground: '#1f2335',
    tableBorder: '#565f89',
    tableBorderSelected: '#7aa2f7',
    tableBorderHover: '#9ece6a',
    tableBorderSeparator: '#414868',
    tableRowHeaderBackground: '#1a1b26',
    tableRowHeaderText: '#c0caf5',
    // Sidebar
    sidebarBackground: '#1a1b26',
    sidebarItemBackgroundPending: '#f7768e',
    sidebarItemBackgroundPositive: '#9ece6a',
    sidebarItemBackgroundFailed: '#f7768e',
    sidebarItemAccentSelected: '#bb9af7',
    sidebarItemBackgroundHover: '#26233a',
    sidebarItemText: '#c0caf5',
    sidebarItemTextSelected: '#7aa2f7',
    // Menu
    menuBackground: '#1f2335',
    menuItemBackground: '#1a1b26',
    menuItemBackgroundHover: '#7dcfff',
    menuItemText: '#c0caf5',
    menuItemTextHover: '#9ece6a',
    menuItemTextSelected: '#bb9af7',
    menuItemTextHeader: '#7dcfff',
    menuBorder: '#414868',
    menuBorderHover: '#7aa2f7',
    menuKeybindingText: '#565f89',
    menuAutoCompleteBackground: '#1f2335',
    menuAutoCompleteBackgroundHover: '#26233a',
    menuAutoCompleteText: '#c0caf5',
    menuAutoCompleteTextHover: '#7dcfff',
    menuAutoCompleteTextHeader: '#f7768e',
    menuAutoCompleteItemTextHover: '#9ece6a',
    menuAutoCompleteItemText: '#c0caf5',
    // Modal
    modalBackground: '#1f2335',
    modalBorder: '#565f89',
    // Mobile
    mobileHeaderBackground: '#16161e',
    mobileHeaderText: '#7aa2f7',
    mobileHeaderTextSubdued: '#565f89',
    mobileHeaderTextHover: 'rgba(122, 162, 247, 0.2)',
    mobilePageBackground: '#1a1b26',
    mobileNavBackground: '#1f2335',
    mobileNavItem: '#565f89',
    mobileNavItemSelected: '#7aa2f7',
    mobileAccountShadow: 'rgba(0, 0, 0, 0.5)',
    mobileAccountText: '#bb9af7',
    mobileTransactionSelected: '#f7768e',
    // Buttons
    buttonMenuText: '#c0caf5',
    buttonMenuTextHover: '#7aa2f7',
    buttonMenuBackground: 'transparent',
    buttonMenuBackgroundHover: 'rgba(122, 162, 247, 0.2)',
    buttonMenuBorder: '#414868',
    buttonMenuSelectedText: '#1a1b26',
    buttonMenuSelectedTextHover: '#1a1b26',
    buttonMenuSelectedBackground: '#7aa2f7',
    buttonMenuSelectedBackgroundHover: '#7dcfff',
    buttonMenuSelectedBorder: '#7aa2f7',
    buttonPrimaryText: '#1a1b26',
    buttonPrimaryTextHover: '#1a1b26',
    buttonPrimaryBackground: '#7aa2f7',
    buttonPrimaryBackgroundHover: '#7dcfff',
    buttonPrimaryBorder: '#7aa2f7',
    buttonPrimaryShadow: 'rgba(0, 0, 0, 0.5)',
    buttonPrimaryDisabledText: '#565f89',
    buttonPrimaryDisabledBackground: '#16161e',
    buttonPrimaryDisabledBorder: '#414868',
    buttonNormalText: '#c0caf5',
    buttonNormalTextHover: '#7aa2f7',
    buttonNormalBackground: '#1f2335',
    buttonNormalBackgroundHover: '#26233a',
    buttonNormalBorder: '#565f89',
    buttonNormalShadow: 'rgba(0, 0, 0, 0.3)',
    buttonNormalSelectedText: '#1a1b26',
    buttonNormalSelectedBackground: '#bb9af7',
    buttonNormalDisabledText: '#565f89',
    buttonNormalDisabledBackground: '#16161e',
    buttonNormalDisabledBorder: '#414868',
    buttonBareText: '#c0caf5',
    buttonBareTextHover: '#7aa2f7',
    buttonBareBackground: 'transparent',
    buttonBareBackgroundHover: 'rgba(122, 162, 247, 0.2)',
    buttonBareBackgroundActive: 'rgba(122, 162, 247, 0.3)',
    buttonBareDisabledText: '#565f89',
    buttonBareDisabledBackground: 'transparent',
    // Calendar
    calendarText: '#c0caf5',
    calendarBackground: '#1a1b26',
    calendarItemText: '#c0caf5',
    calendarItemBackground: '#1f2335',
    calendarSelectedBackground: '#7aa2f7',
    // Notices
    noticeBackground: '#7aa2f7',
    noticeBackgroundLight: '#9ece6a',
    noticeBackgroundDark: '#414868',
    noticeText: '#1a1b26',
    noticeTextLight: '#c0caf5',
    noticeTextDark: '#f7768e',
    noticeTextMenu: '#7aa2f7',
    noticeTextMenuHover: '#9ece6a',
    noticeBorder: '#565f89',
    // Form
    formLabelText: '#7aa2f7',
    formLabelBackground: '#1f2335',
    formInputBackground: '#1a1b26',
    formInputBackgroundSelected: '#26233a',
    formInputBackgroundSelection: '#7aa2f7',
    formInputBorder: '#565f89',
    formInputTextReadOnlySelection: '#414868',
    formInputBorderSelected: '#7aa2f7',
    formInputText: '#c0caf5',
    formInputTextSelected: '#9ece6a',
    formInputTextPlaceholder: '#565f89',
    formInputTextPlaceholderSelected: '#7dcfff',
    formInputShadowSelected: 'rgba(122, 162, 247, 0.5)',
    // Miscellaneous
    tooltipText: '#c0caf5',
    tooltipBackground: '#1a1b26',
    tooltipBorder: '#7aa2f7',
  },
  i = e => {
    const o = u(e),
      t = {
        name: 'Example',
        version: '0.0.1',
        availableThemes: a =>
          a ? ['Dracula'] : ['Sepia', 'Rose Pine', 'Tokyo Night'],
        getThemeIcon: (a, r, n) =>
          /* @__PURE__ */ e.createElement(o, {
            themeName: a,
            darkMode: r,
            style: n,
          }),
        getThemeSchema: d,
      };
    function d(a, r) {
      return a === 'Dracula'
        ? b
        : a === 'Rose Pine'
          ? g
          : a === 'Tokyo Night'
            ? f
            : l;
    }
    return t;
  };
export { i as default };
