// TypeScript Version: 3.4

import { Plugin } from "unified";

declare namespace remarkEmoji {
    type Emoji = Plugin<[RemarkEmojiOptions?]>;

    interface RemarkEmojiOptions {
        /**
         * Adds an extra whitespace after emoji.
         * Useful when browser handle emojis with half character length and
         * the following character is hidden.
         *
         * @defaultValue false
         */
        padSpaceAfter?: boolean;
        /**
         * Whether to support emoticon shortcodes (e.g. :-) will be replaced by 😃)
         *
         * @defaultValue false
         */
        emoticon?: boolean;
    }
}

declare const remarkEmoji: remarkEmoji.Emoji;

export = remarkEmoji;
