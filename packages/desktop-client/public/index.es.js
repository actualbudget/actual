import * as React from "react";
import React__default from "react";
const SvgPenTool = (props) => /* @__PURE__ */ React.createElement(
  "svg",
  {
    ...props,
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 20 20",
    style: {
      color: "inherit",
      ...props.style
    }
  },
  /* @__PURE__ */ React.createElement(
    "path",
    {
      d: "M11 9.27V0l6 11-4 6H7l-4-6L9 0v9.27a2 2 0 1 0 2 0zM6 18h8v2H6v-2z",
      fill: "currentColor"
    }
  )
);
const ThemeIcon = ({ themeName, darkMode, style }) => {
  switch (themeName) {
    case "dracula":
      return /* @__PURE__ */ React__default.createElement(SvgPenTool, { style });
  }
  return /* @__PURE__ */ React__default.createElement("div", { style });
};
const draculaTheme = {
  pageBackground: "#282a36",
  // Dark background
  pageText: "#f8f8f2",
  // Light text
  pageTextSubdued: "#6272a4",
  // Comments
  cardBackground: "#44475a",
  // Current line background
  cardBorder: "#bd93f9",
  // Purple border
  cardShadow: "rgba(0, 0, 0, 0.5)",
  // Slight shadow
  tableBackground: "#282a36",
  tableRowBackgroundHover: "#44475a",
  tableText: "#f8f8f2",
  tableTextSubdued: "#6272a4",
  tableBorder: "#44475a",
  sidebarBackground: "#282a36",
  sidebarItemText: "#f8f8f2",
  sidebarItemTextSelected: "#ff79c6",
  // Pink for active selection
  sidebarItemBackgroundHover: "#44475a",
  menuBackground: "#44475a",
  menuItemText: "#f8f8f2",
  menuItemTextHover: "#ff79c6",
  menuItemTextSelected: "#50fa7b",
  // Green for selected items
  menuBorder: "#6272a4",
  buttonPrimaryText: "#282a36",
  buttonPrimaryBackground: "#50fa7b",
  // Green
  buttonPrimaryBorder: "#50fa7b",
  buttonPrimaryDisabledText: "#6272a4",
  buttonPrimaryDisabledBackground: "#44475a",
  buttonNormalText: "#f8f8f2",
  buttonNormalBackground: "#44475a",
  buttonNormalBorder: "#6272a4",
  buttonBareText: "#f8f8f2",
  buttonBareBackgroundHover: "rgba(255, 121, 198, 0.2)",
  // Pink hover effect
  noticeBackground: "#50fa7b",
  noticeText: "#282a36",
  noticeBorder: "#6272a4",
  warningBackground: "#ffb86c",
  warningText: "#282a36",
  warningBorder: "#bd93f9",
  errorBackground: "#ff5555",
  errorText: "#282a36",
  errorBorder: "#ff79c6",
  formInputBackground: "#44475a",
  formInputBorder: "#6272a4",
  formInputText: "#f8f8f2",
  formInputTextPlaceholder: "#6272a4",
  calendarBackground: "#282a36",
  calendarItemBackground: "#44475a",
  calendarItemText: "#f8f8f2",
  calendarSelectedBackground: "#bd93f9",
  pillBackground: "#44475a",
  pillText: "#f8f8f2",
  pillBackgroundSelected: "#bd93f9",
  tooltipText: "#f8f8f2",
  tooltipBackground: "#6272a4",
  tooltipBorder: "#bd93f9",
  floatingActionBarBackground: "#44475a",
  floatingActionBarBorder: "#bd93f9",
  floatingActionBarText: "#f8f8f2",
  markdownNormal: "#ff79c6",
  markdownDark: "#bd93f9",
  markdownLight: "#50fa7b"
};
const plugin = {
  name: "Example",
  version: "0.0.1",
  availableThemes: (darkMode) => darkMode ? ["dracula"] : ["allwhite"],
  getThemeIcon: (themeName, darkMode, properties) => /* @__PURE__ */ React__default.createElement(ThemeIcon, { themeName, darkMode, style: properties }),
  getThemeSchema: themeSchema
};
function themeSchema(themeName, darkMode) {
  return draculaTheme;
}
export {
  plugin as default
};
