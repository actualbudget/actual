export declare function Graph(): {
    addNode: (node: any) => any;
    removeNode: (node: any) => any;
    adjacent: (node: any) => any;
    adjacentIncoming: (node: any) => any;
    addEdge: (node1: any, node2: any) => any;
    removeEdge: (node1: any, node2: any) => any;
    removeIncomingEdges: (node: any) => void;
    topologicalSort: (sourceNodes: any) => any[];
    generateDOT: () => string;
    getEdges: () => {
        edges: Map<any, any>;
        incomingEdges: Map<any, any>;
    };
};
