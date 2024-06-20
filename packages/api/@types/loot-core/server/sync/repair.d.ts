import { merkle } from '@actual-app/crdt';
export declare function rebuildMerkleHash(): {
    numMessages: number;
    trie: merkle.TrieNode;
};
export declare function repairSync(): Promise<void>;
