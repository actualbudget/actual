// A spreadsheet stand-in for component tests whose cells can change after
// binding, as the client's cells-changed subscription delivers them.

type Node = { name: string; value: unknown };

const cells = new Map<string, unknown>();
const listeners = new Map<string, Set<(node: Node) => void>>();

/** Replaces every cell value and drops old subscriptions. */
export function resetCells(values: Record<string, unknown>) {
  cells.clear();
  listeners.clear();
  setCells(values);
}

/** Changes cells (bare names) and notifies their bound components. */
export function setCells(values: Record<string, unknown>) {
  for (const [name, value] of Object.entries(values)) {
    cells.set(name, value);
    for (const listener of listeners.get(name) ?? []) {
      listener({ name, value });
    }
  }
}

export function useSpreadsheet() {
  return {
    bind(
      sheet: string,
      binding: string | { name: string },
      cb: (node: Node) => void,
    ) {
      const name = typeof binding === 'string' ? binding : binding.name;
      const listener = (node: Node) =>
        cb({ name: `${sheet}!${node.name}`, value: node.value });
      const set = listeners.get(name) ?? new Set();
      set.add(listener);
      listeners.set(name, set);
      listener({ name, value: cells.get(name) ?? 0 });
      return () => set.delete(listener);
    },
  };
}
