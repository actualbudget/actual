declare const SIZING_STYLE: readonly ["borderBottomWidth", "borderLeftWidth", "borderRightWidth", "borderTopWidth", "boxSizing", "fontFamily", "fontSize", "fontStyle", "fontWeight", "letterSpacing", "lineHeight", "paddingBottom", "paddingLeft", "paddingRight", "paddingTop", "tabSize", "textIndent", "textRendering", "textTransform", "width", "wordBreak"];
declare type SizingProps = Extract<typeof SIZING_STYLE[number], keyof CSSStyleDeclaration>;
declare type SizingStyle = Pick<CSSStyleDeclaration, SizingProps>;
export declare type SizingData = {
    sizingStyle: SizingStyle;
    paddingSize: number;
    borderSize: number;
};
declare const getSizingData: (node: HTMLElement) => SizingData | null;
export default getSizingData;
