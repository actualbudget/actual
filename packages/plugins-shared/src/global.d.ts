import { CSSObject } from "@emotion/css";

declare module "react" {
  interface CSSProperties extends CSSObject {}
}

export {};