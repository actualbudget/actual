function Graph(serialized) {
  var graph = {
    addNode,
    removeNode,
    adjacent,
    adjacentIncoming,
    addEdge,
    removeEdge,
    removeIncomingEdges,
    topologicalSort,
    generateDOT,
    getEdges
  };

  var edges = new Map();
  var incomingEdges = new Map();

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

    let iter = incoming.values();
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

  function topologicalSortUntil(name, visited, sorted) {
    visited.add(name);

    let iter = adjacent(name).values();
    let cur = iter.next();
    while (!cur.done) {
      if (!visited.has(cur.value)) {
        topologicalSortUntil(cur.value, visited, sorted);
      }
      cur = iter.next();
    }

    sorted.unshift(name);
  }

  function topologicalSort(sourceNodes) {
    const visited = new Set();
    const sorted = [];

    sourceNodes.forEach(name => {
      if (!visited.has(name)) {
        topologicalSortUntil(name, visited, sorted);
      }
    });

    return sorted;
  }

  function generateDOT() {
    let edgeStrings = [];
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

module.exports = Graph;
