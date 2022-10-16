export declare const noop: () => void;
export declare const pick: <Obj extends {
    [key: string]: any;
}, Key extends keyof Obj>(props: Key[], obj: Obj) => Pick<Obj, Key>;
