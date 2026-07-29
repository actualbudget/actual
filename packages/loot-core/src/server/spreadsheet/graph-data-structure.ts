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

  function topologicalSort(sourceNodes) {
    const visited = new Set();
    const sorted = [];

    sourceNodes.forEach(name => {
      if (!visited.has(name)) {
        topologicalSortIterable(name, visited, sorted);
      }
    });

    // Nodes are collected in the order they finish (post-order). A topological
    // order is the reverse of that, so flip the list once at the end instead of
    // prepending each node as we go (which would be O(n) per node).
    sorted.reverse();

    return sorted;
  }

  // Iterative depth-first, post-order traversal. We use an explicit stack rather
  // than recursion so that very deep dependency chains — e.g. the per-transaction
  // running-balance cells in a large budget — can't overflow the call stack.
  //
  // Each stack frame keeps a cursor into its own list of neighbors. That makes
  // finishing a node O(1): when a child finishes we simply return to its parent
  // frame, which is right below it on the stack — no scanning to find the parent
  // and no per-node bookkeeping that grows with the depth of the graph. The whole
  // sort is therefore O(nodes + edges).
  function topologicalSortIterable(name, visited, sorted) {
    const stack: StackFrame[] = [{ value: name, neighbors: null, index: 0 }];

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];

      if (frame.neighbors === null) {
        if (visited.has(frame.value)) {
          stack.pop();
          continue;
        }
        // Snapshot the neighbors up front, in reverse. Because we pull them off a
        // LIFO stack, reversing here keeps the visit order identical to the
        // previous implementation.
        const adjacents = adjacent(frame.value);
        const neighbors = new Array(adjacents.size);
        let i = adjacents.size - 1;
        for (const neighbor of adjacents.values()) {
          neighbors[i--] = neighbor;
        }
        frame.neighbors = neighbors;
      }

      // Descend into the next unvisited neighbor, if there is one.
      let descended = false;
      while (frame.index < frame.neighbors.length) {
        const neighbor = frame.neighbors[frame.index++];
        if (!visited.has(neighbor)) {
          stack.push({ value: neighbor, neighbors: null, index: 0 });
          descended = true;
          break;
        }
      }
      if (descended) {
        continue;
      }

      // All neighbors done: this node is finished.
      if (!visited.has(frame.value)) {
        visited.add(frame.value);
        sorted.push(frame.value);
      }
      stack.pop();
    }
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
  neighbors: string[] | null;
  index: number;
};
