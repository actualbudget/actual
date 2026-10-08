// @ts-strict-ignore
export function Graph() {
  const graph = {
    addNode,
    removeNode,
    adjacent,
    adjacentIncoming,
    addEdge,
    removeEdge,
    removeIncomingEdges,
    topologicalSort,
    generateDOT,
    getEdges,
  };

  const edges = new Map();
  const incomingEdges = new Map();

  function getEdges() {
    return { edges, incomingEdges };
  }

  function addNode(node) {
    edges.set(node, adjacent(node));
    incomingEdges.set(node, adjacentIncoming(node));
    return graph;
  }

  function removeIncomingEdges(node) {
    const incoming = adjacentIncoming(node);
    incomingEdges.set(node, new Set());

    const iter = incoming.values();
    let cur = iter.next();
    while (!cur.done) {
      removeEdge(cur.value, node);
      cur = iter.next();
    }
  }

  function removeNode(node) {
    removeIncomingEdges(node);
    edges.delete(node);
    incomingEdges.delete(node);
    return graph;
  }

  function adjacent(node) {
    return edges.get(node) || new Set();
  }

  function adjacentIncoming(node) {
    return incomingEdges.get(node) || new Set();
  }

  // Adds an edge from node u to node v.
  // Implicitly adds the nodes if they were not already added.
  function addEdge(node1, node2) {
    addNode(node1);
    addNode(node2);
    adjacent(node1).add(node2);
    adjacentIncoming(node2).add(node1);
    return graph;
  }

  // Removes the edge from node u to node v.
  // Does not remove the nodes.
  // Does nothing if the edge does not exist.
  function removeEdge(node1, node2) {
    if (edges.has(node1)) {
      adjacent(node1).delete(node2);
    }
    if (incomingEdges.has(node2)) {
      adjacentIncoming(node2).delete(node1);
    }
    return graph;
  }

  function topologicalSort(sourceNodes: string[]) {
    const visited = new Set<string>();
    const sorted: string[] = [];

    sourceNodes.forEach(name => {
      if (!visited.has(name)) {
        topologicalSortIterable(name, visited, sorted);
      }
    });

    // Nodes are collected in post-order; reversed, that is a topological order.
    sorted.reverse();

    return sorted;
  }

  // Uses an explicit stack so long dependency chains can't overflow the call
  // stack. Nodes are marked visited on entry so a cycle can't loop forever.
  function topologicalSortIterable(
    name: string,
    visited: Set<string>,
    sorted: string[],
  ) {
    visited.add(name);
    const stack = [createStackFrame(name)];

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];

      let next: string | undefined;
      while (frame.index < frame.neighbors.length) {
        const neighbor = frame.neighbors[frame.index++];
        if (!visited.has(neighbor)) {
          next = neighbor;
          break;
        }
      }

      if (next !== undefined) {
        visited.add(next);
        stack.push(createStackFrame(next));
      } else {
        stack.pop();
        sorted.push(frame.value);
      }
    }
  }

  function createStackFrame(value: string): StackFrame {
    const neighbors = [...adjacent(value)].reverse();
    return { value, neighbors, index: 0 };
  }

  function generateDOT() {
    const edgeStrings = [];
    edges.forEach(function (adj, edge) {
      if (adj.length !== 0) {
        edgeStrings.push(`${edge} -> {${adj.join(',')}}`);
      }
    });

    return `
    digraph G {
      ${edgeStrings.join('\n').replace(/!/g, '_')}
    }
    `;
  }

  return graph;
}

type StackFrame = {
  value: string;
  neighbors: string[];
  index: number;
};
