import { Graph } from './graph-data-structure';

function isTopologicallyValid(
  graph: ReturnType<typeof Graph>,
  order: string[],
): boolean {
  const position = new Map<string, number>();
  order.forEach((node, i) => position.set(node, i));

  const { edges } = graph.getEdges();
  for (const [from, outgoing] of edges) {
    const fromPosition = position.get(from);
    if (fromPosition === undefined) {
      continue;
    }
    for (const to of outgoing) {
      const toPosition = position.get(to);
      // `topologicalSort` lists a node before the nodes it points to.
      if (toPosition !== undefined && fromPosition > toPosition) {
        return false;
      }
    }
  }
  return true;
}

// Small deterministic pseudo-random generator so the tests are reproducible.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Roughly the cell dependencies of an envelope budget.
function createBudgetLikeGraph(months: number, categories: number) {
  const graph = Graph();
  const cells: string[] = [];

  for (let month = 0; month < months; month++) {
    for (let category = 0; category < categories; category++) {
      const leftover = `budget${month}!leftover-${category}`;
      for (const input of ['budget', 'sum-amount', 'carryover']) {
        const cell = `budget${month}!${input}-${category}`;
        graph.addEdge(cell, leftover);
        cells.push(cell);
      }
      if (month > 0) {
        graph.addEdge(`budget${month - 1}!leftover-${category}`, leftover);
      }
      graph.addEdge(leftover, `budget${month}!total-leftover`);
      graph.addEdge(
        `budget${month}!budget-${category}`,
        `budget${month}!total-budgeted`,
      );
      cells.push(leftover);
    }
    graph.addEdge(`budget${month}!total-budgeted`, `budget${month}!to-budget`);
    if (month > 0) {
      graph.addEdge(`budget${month - 1}!to-budget`, `budget${month}!to-budget`);
    }
    cells.push(
      `budget${month}!total-budgeted`,
      `budget${month}!total-leftover`,
      `budget${month}!to-budget`,
    );
  }

  return { graph, cells };
}

describe('Graph.topologicalSort', () => {
  it('returns a single node with no edges', () => {
    const graph = Graph();
    graph.addNode('a');

    expect(graph.topologicalSort(['a'])).toEqual(['a']);
  });

  it('orders a node before the nodes it depends on', () => {
    const graph = Graph();
    graph.addEdge('a', 'b');
    graph.addEdge('a', 'c');
    graph.addEdge('b', 'd');
    graph.addEdge('c', 'd');

    expect(graph.topologicalSort(['a'])).toEqual(['a', 'b', 'c', 'd']);
  });

  it('visits every node reachable from the sources exactly once', () => {
    const graph = Graph();
    graph.addEdge('a', 'b');
    graph.addEdge('b', 'c');
    graph.addEdge('a', 'c');
    graph.addNode('unreachable');

    const sorted = graph.topologicalSort(['a', 'b', 'a']);
    expect([...sorted].sort((a, b) => a.localeCompare(b))).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(new Set(sorted).size).toBe(sorted.length);
  });

  it('produces a valid ordering across many random DAGs', () => {
    for (let seed = 0; seed < 500; seed++) {
      const random = mulberry32(seed + 1);
      const size = 2 + Math.floor(random() * 40);
      const graph = Graph();
      const nodes = Array.from({ length: size }, (_, i) => `n${i}`);
      nodes.forEach(node => graph.addNode(node));

      // Only add forward edges (i -> j where i < j) so the graph stays acyclic.
      for (let i = 0; i < size; i++) {
        const degree = Math.floor(random() * 4);
        for (let d = 0; d < degree; d++) {
          if (i + 1 >= size) {
            break;
          }
          const j = i + 1 + Math.floor(random() * (size - i - 1));
          graph.addEdge(nodes[i], nodes[j]);
        }
      }

      const sources = nodes.filter(() => random() < 0.6);
      if (sources.length === 0) {
        sources.push(nodes[0]);
      }

      const sorted = graph.topologicalSort(sources);
      expect(isTopologicallyValid(graph, sorted)).toBe(true);
    }
  });

  it('terminates on a dependency cycle', () => {
    const graph = Graph();
    graph.addEdge('x', 'a');
    graph.addEdge('a', 'b');
    graph.addEdge('b', 'c');
    graph.addEdge('c', 'a');

    const sorted = graph.topologicalSort(['x']);
    expect(sorted).toHaveLength(4);
    expect(sorted[0]).toBe('x');
  });

  it('handles a very deep dependency chain without overflowing the stack', () => {
    const graph = Graph();
    const depth = 50000;
    for (let i = 1; i < depth; i++) {
      graph.addEdge(`c${i}`, `c${i - 1}`);
    }

    const sorted = graph.topologicalSort([`c${depth - 1}`]);

    expect(sorted).toHaveLength(depth);
    expect(sorted[0]).toBe(`c${depth - 1}`);
    expect(sorted[depth - 1]).toBe('c0');
  });

  // A quadratic sort would hit the test timeout on a graph this size.
  it('sorts a large budget-shaped graph quickly', () => {
    const { graph, cells } = createBudgetLikeGraph(200, 300);

    const sorted = graph.topologicalSort(cells);

    expect(sorted).toHaveLength(cells.length);
    expect(isTopologicallyValid(graph, sorted)).toBe(true);
  });
});
