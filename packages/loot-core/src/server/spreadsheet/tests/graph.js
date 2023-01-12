// Unit tests for reactive-property.
var assert = require('assert');

// If using from the NPM package, this line would be
// var Graph = require("graph-data-structure");
var Graph = require('../data-compute/graph-data-structure');

describe('Graph', function () {
  describe('Data structure', function () {
    it('Should add nodes and list them.', function () {
      var graph = Graph();
      graph.addNode('a');
      graph.addNode('b');
      assert.equal(graph.nodes().length, 2);
      assert(contains(graph.nodes(), 'a'));
      assert(contains(graph.nodes(), 'b'));
    });

    it('Should chain addNode.', function () {
      var graph = Graph().addNode('a').addNode('b');
      assert.equal(graph.nodes().length, 2);
      assert(contains(graph.nodes(), 'a'));
      assert(contains(graph.nodes(), 'b'));
    });

    it('Should remove nodes.', function () {
      var graph = Graph();
      graph.addNode('a');
      graph.addNode('b');
      graph.removeNode('a');
      graph.removeNode('b');
      assert.equal(graph.nodes().length, 0);
    });

    it('Should chain removeNode.', function () {
      var graph = Graph()
        .addNode('a')
        .addNode('b')
        .removeNode('a')
        .removeNode('b');
      assert.equal(graph.nodes().length, 0);
    });

    it('Should add edges and query for adjacent nodes.', function () {
      var graph = Graph();
      graph.addNode('a');
      graph.addNode('b');
      graph.addEdge('a', 'b');
      assert.equal(graph.adjacent('a').length, 1);
      assert.equal(graph.adjacent('a')[0], 'b');
    });

    it('Should implicitly add nodes when edges are added.', function () {
      var graph = Graph();
      graph.addEdge('a', 'b');
      assert.equal(graph.adjacent('a').length, 1);
      assert.equal(graph.adjacent('a')[0], 'b');
      assert.equal(graph.nodes().length, 2);
      assert(contains(graph.nodes(), 'a'));
      assert(contains(graph.nodes(), 'b'));
    });

    it('Should chain addEdge.', function () {
      var graph = Graph().addEdge('a', 'b');
      assert.equal(graph.adjacent('a').length, 1);
      assert.equal(graph.adjacent('a')[0], 'b');
    });

    it('Should remove edges.', function () {
      var graph = Graph();
      graph.addEdge('a', 'b');
      graph.removeEdge('a', 'b');
      assert.equal(graph.adjacent('a').length, 0);
    });

    it('Should chain removeEdge.', function () {
      var graph = Graph().addEdge('a', 'b').removeEdge('a', 'b');
      assert.equal(graph.adjacent('a').length, 0);
    });

    it('Should not remove nodes when edges are removed.', function () {
      var graph = Graph();
      graph.addEdge('a', 'b');
      graph.removeEdge('a', 'b');
      assert.equal(graph.nodes().length, 2);
      assert(contains(graph.nodes(), 'a'));
      assert(contains(graph.nodes(), 'b'));
    });

    it('Should remove outgoing edges when a node is removed.', function () {
      var graph = Graph();
      graph.addEdge('a', 'b');
      graph.removeNode('a');
      assert.equal(graph.adjacent('a').length, 0);
    });

    it('Should remove incoming edges when a node is removed.', function () {
      var graph = Graph();
      graph.addEdge('a', 'b');
      graph.removeNode('b');
      assert.equal(graph.adjacent('a').length, 0);
    });

    it('Should compute indegree.', function () {
      var graph = Graph();
      graph.addEdge('a', 'b');
      assert.equal(graph.indegree('a'), 0);
      assert.equal(graph.indegree('b'), 1);

      graph.addEdge('c', 'b');
      assert.equal(graph.indegree('b'), 2);
    });

    it('Should compute outdegree.', function () {
      var graph = Graph();
      graph.addEdge('a', 'b');
      assert.equal(graph.outdegree('a'), 1);
      assert.equal(graph.outdegree('b'), 0);

      graph.addEdge('a', 'c');
      assert.equal(graph.outdegree('a'), 2);
    });
  });

  describe('Algorithms', function () {
    // This example is from Cormen et al. "Introduction to Algorithms" page 550
    it('Should compute topological sort.', function () {
      var graph = Graph();

      // Shoes depend on socks.
      // Socks need to be put on before shoes.
      graph.addEdge('socks', 'shoes');

      graph.addEdge('shirt', 'belt');
      graph.addEdge('shirt', 'tie');
      graph.addEdge('tie', 'jacket');
      graph.addEdge('belt', 'jacket');
      graph.addEdge('pants', 'shoes');
      graph.addEdge('underpants', 'pants');
      graph.addEdge('pants', 'belt');

      var sorted = graph.topologicalSort();

      assert(comesBefore(sorted, 'pants', 'shoes'));
      assert(comesBefore(sorted, 'underpants', 'pants'));
      assert(comesBefore(sorted, 'underpants', 'shoes'));
      assert(comesBefore(sorted, 'shirt', 'jacket'));
      assert(comesBefore(sorted, 'shirt', 'belt'));
      assert(comesBefore(sorted, 'belt', 'jacket'));

      assert.equal(sorted.length, 8);
    });

    it('Should compute topological sort, excluding source nodes.', function () {
      var graph = Graph();
      graph.addEdge('a', 'b');
      graph.addEdge('b', 'c');
      var sorted = graph.topologicalSort(['a'], false);
      assert.equal(sorted.length, 2);
      assert.equal(sorted[0], 'b');
      assert.equal(sorted[1], 'c');
    });

    it('Should compute topological sort tricky case.', function () {
      var graph = Graph(); //      a
      //     / \
      graph.addEdge('a', 'b'); //    b   |
      graph.addEdge('a', 'd'); //    |   d
      graph.addEdge('b', 'c'); //    c   |
      graph.addEdge('d', 'e'); //     \ /
      graph.addEdge('c', 'e'); //      e

      var sorted = graph.topologicalSort(['a'], false);
      assert.equal(sorted.length, 4);
      assert(contains(sorted, 'b'));
      assert(contains(sorted, 'c'));
      assert(contains(sorted, 'd'));
      assert.equal(sorted[sorted.length - 1], 'e');

      assert(comesBefore(sorted, 'b', 'c'));
      assert(comesBefore(sorted, 'b', 'e'));
      assert(comesBefore(sorted, 'c', 'e'));
      assert(comesBefore(sorted, 'd', 'e'));
    });

    it('Should exclude source nodes with a cycle.', function () {
      var graph = Graph().addEdge('a', 'b').addEdge('b', 'c').addEdge('c', 'a');
      var sorted = graph.topologicalSort(['a'], false);
      assert.equal(sorted.length, 2);
      assert.equal(sorted[0], 'b');
      assert.equal(sorted[1], 'c');
    });

    it('Should exclude source nodes with multiple cycles.', function () {
      var graph = Graph()
        .addEdge('a', 'b')
        .addEdge('b', 'a')

        .addEdge('b', 'c')
        .addEdge('c', 'b')

        .addEdge('a', 'c')
        .addEdge('c', 'a');

      var sorted = graph.topologicalSort(['a', 'b'], false);
      assert(!contains(sorted, 'b'));
    });
  });

  describe('Edge cases and error handling', function () {
    it('Should return empty array of adjacent nodes for unknown nodes.', function () {
      var graph = Graph();
      assert.equal(graph.adjacent('a').length, 0);
      assert.equal(graph.nodes(), 0);
    });

    it('Should do nothing if removing an edge that does not exist.', function () {
      assert.doesNotThrow(function () {
        var graph = Graph();
        graph.removeEdge('a', 'b');
      });
    });

    it('Should return indegree of 0 for unknown nodes.', function () {
      var graph = Graph();
      assert.equal(graph.indegree('z'), 0);
    });

    it('Should return outdegree of 0 for unknown nodes.', function () {
      var graph = Graph();
      assert.equal(graph.outdegree('z'), 0);
    });
  });

  describe('Serialization', function () {
    var serialized;

    function checkSerialized(graph) {
      assert.equal(graph.nodes.length, 3);
      assert.equal(graph.links.length, 2);

      assert.equal(graph.nodes[0].id, 'a');
      assert.equal(graph.nodes[1].id, 'b');
      assert.equal(graph.nodes[2].id, 'c');

      assert.equal(graph.links[0].source, 'a');
      assert.equal(graph.links[0].target, 'b');
      assert.equal(graph.links[1].source, 'b');
      assert.equal(graph.links[1].target, 'c');
    }

    it('Should serialize a graph.', function () {
      var graph = Graph().addEdge('a', 'b').addEdge('b', 'c');
      serialized = graph.serialize();
      checkSerialized(serialized);
    });

    it('Should deserialize a graph.', function () {
      var graph = Graph();
      graph.deserialize(serialized);
      checkSerialized(graph.serialize());
    });

    it('Should chain deserialize a graph.', function () {
      var graph = Graph().deserialize(serialized);
      checkSerialized(graph.serialize());
    });

    it('Should deserialize a graph passed to constructor.', function () {
      var graph = Graph(serialized);
      checkSerialized(graph.serialize());
    });
  });
});

function contains(arr, item) {
  return (
    arr.filter(function (d) {
      return d === item;
    }).length > 0
  );
}

function comesBefore(arr, a, b) {
  var aIndex, bIndex;
  arr.forEach(function (d, i) {
    if (d === a) {
      aIndex = i;
    }
    if (d === b) {
      bIndex = i;
    }
  });
  return aIndex < bIndex;
}
