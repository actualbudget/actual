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

    return sorted;
  }

  function topologicalSortIterable(name, visited, sorted) {
    const stackTrace: StackItem[] = [];

    stackTrace.push({
      count: -1,
      value: name,
      parent: '',
      level: 0,
    });

    while (stackTrace.length > 0) {
      const current = stackTrace.slice(-1)[0];

      const adjacents = adjacent(current.value);
      if (current.count === -1) {
        current.count = adjacents.size;
      }

      if (current.count > 0) {
        const iter = adjacents.values();
        let cur = iter.next();
        while (!cur.done) {
          if (!visited.has(cur.value)) {
            stackTrace.push({
              count: -1,
              parent: current.value,
              value: cur.value,
              level: current.level + 1,
            });
          } else {
            current.count--;
          }
          cur = iter.next();
        }
      } else {
        if (!visited.has(current.value)) {
          visited.add(current.value);
          sorted.unshift(current.value);
        }

        const removed = stackTrace.pop();
        for (let i = 0; i < stackTrace.length; i++) {
          if (stackTrace[i].value === removed.parent) {
            stackTrace[i].count--;
          }
        }
      }
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

type StackItem = {
  count: number;
  value: string;
  parent: string;
  level: number;
};
