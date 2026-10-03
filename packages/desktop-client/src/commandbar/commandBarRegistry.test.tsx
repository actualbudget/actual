import { StrictMode, useEffect } from 'react';
import type { ReactNode } from 'react';

import { act, render, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  CommandBarProvider,
  useCommandBarCommands,
  useRegisterCommandBarCommands,
} from './commandBarRegistry';
import type { CommandBarCommand } from './commandBarRegistry';

function wrapper({ children }: { children: ReactNode }) {
  return <CommandBarProvider>{children}</CommandBarProvider>;
}

function strictWrapper({ children }: { children: ReactNode }) {
  return (
    <StrictMode>
      <CommandBarProvider>{children}</CommandBarProvider>
    </StrictMode>
  );
}

function useRegisteredCommands({
  ownerId,
  commands,
}: {
  ownerId: string;
  commands: readonly CommandBarCommand[];
}) {
  useRegisterCommandBarCommands(ownerId, commands);
  return useCommandBarCommands();
}

describe('CommandBar command registry', () => {
  it('registers commands with a qualified id', () => {
    const { result } = renderHook(
      () =>
        useRegisteredCommands({
          ownerId: 'reports',
          commands: [{ id: 'new', label: 'New report', execute: vi.fn() }],
        }),
      { wrapper },
    );

    expect(result.current.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'reports:new', label: 'New report' },
    ]);
  });

  it('preserves destructive command metadata', () => {
    const { result } = renderHook(
      () =>
        useRegisteredCommands({
          ownerId: 'accounts',
          commands: [
            {
              id: 'close',
              label: 'Close account',
              destructive: true,
              execute: vi.fn(),
            },
          ],
        }),
      { wrapper },
    );

    expect(result.current[0]).toMatchObject({
      id: 'accounts:close',
      label: 'Close account',
      destructive: true,
    });
  });

  it('updates destructive metadata with command presentation', () => {
    const { result, rerender } = renderHook(
      props => useRegisteredCommands(props),
      {
        wrapper,
        initialProps: {
          ownerId: 'accounts',
          commands: [
            {
              id: 'close',
              label: 'Close account',
              destructive: false,
              execute: vi.fn(),
            },
          ],
        },
      },
    );

    rerender({
      ownerId: 'accounts',
      commands: [
        {
          id: 'close',
          label: 'Close account',
          destructive: true,
          execute: vi.fn(),
        },
      ],
    });

    expect(result.current[0]?.destructive).toBe(true);
  });

  it('preserves commands from multiple owners', () => {
    function useTwoOwners() {
      useRegisterCommandBarCommands('accounts', [
        { id: 'new', label: 'New account', execute: vi.fn() },
      ]);
      useRegisterCommandBarCommands('reports', [
        { id: 'new', label: 'New report', execute: vi.fn() },
      ]);
      return useCommandBarCommands();
    }

    const { result } = renderHook(() => useTwoOwners(), { wrapper });

    expect(result.current.map(command => command.id)).toEqual([
      'accounts:new',
      'reports:new',
    ]);
  });

  it('does not collide when owner and command ids contain delimiters', () => {
    const { result } = renderHook(
      () => {
        useRegisterCommandBarCommands('a:b', [
          { id: 'c', label: 'First', execute: vi.fn() },
        ]);
        useRegisterCommandBarCommands('a', [
          { id: 'b:c', label: 'Second', execute: vi.fn() },
        ]);
        return useCommandBarCommands();
      },
      { wrapper },
    );

    expect(result.current).toHaveLength(2);
    expect(new Set(result.current.map(command => command.id)).size).toBe(2);
  });

  it('replaces an owner command set', () => {
    const { result, rerender } = renderHook(
      props => useRegisteredCommands(props),
      {
        wrapper,
        initialProps: {
          ownerId: 'reports',
          commands: [{ id: 'old', label: 'Old', execute: vi.fn() }],
        },
      },
    );

    rerender({
      ownerId: 'reports',
      commands: [{ id: 'new', label: 'New', execute: vi.fn() }],
    });

    expect(result.current.map(command => command.id)).toEqual(['reports:new']);
  });

  it('updates the qualified id when an owner changes', () => {
    const { result, rerender } = renderHook(
      props => useRegisteredCommands(props),
      {
        wrapper,
        initialProps: {
          ownerId: 'reports',
          commands: [{ id: 'new', label: 'New', execute: vi.fn() }],
        },
      },
    );

    rerender({
      ownerId: 'accounts',
      commands: [{ id: 'new', label: 'New', execute: vi.fn() }],
    });

    expect(result.current.map(command => command.id)).toEqual(['accounts:new']);
  });

  it('unregisters commands on cleanup', () => {
    const observedCommands = vi.fn();
    const { rerender } = render(
      <CleanupTest showOwner onCommands={observedCommands} />,
    );

    expect(observedCommands).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 'reports:new' }),
    ]);

    rerender(<CleanupTest showOwner={false} onCommands={observedCommands} />);

    expect(observedCommands).toHaveBeenLastCalledWith([]);
  });

  it('keeps a same-owner registration when another instance unmounts first', () => {
    let latestCommands: readonly CommandBarCommand[] = [];
    const observedCommands = vi.fn((commands: readonly CommandBarCommand[]) => {
      latestCommands = commands;
    });
    const view = render(
      <ConcurrentOwnerTest
        firstVisible
        secondVisible
        onCommands={observedCommands}
      />,
    );

    expect(latestCommands).toHaveLength(2);
    expect(new Set(latestCommands.map(command => command.id)).size).toBe(2);
    expect(latestCommands).toEqual([
      expect.objectContaining({ label: 'First instance' }),
      expect.objectContaining({ label: 'Second instance' }),
    ]);

    view.rerender(
      <ConcurrentOwnerTest
        firstVisible={false}
        secondVisible
        onCommands={observedCommands}
      />,
    );
    expect(observedCommands).toHaveBeenLastCalledWith([
      expect.objectContaining({ label: 'Second instance' }),
    ]);

    view.rerender(
      <ConcurrentOwnerTest
        firstVisible
        secondVisible
        onCommands={observedCommands}
      />,
    );
    view.rerender(
      <ConcurrentOwnerTest
        firstVisible
        secondVisible={false}
        onCommands={observedCommands}
      />,
    );
    expect(observedCommands).toHaveBeenLastCalledWith([
      expect.objectContaining({ label: 'First instance' }),
    ]);
  });

  it('uses the latest callback without re-registering', async () => {
    const firstExecute = vi.fn();
    const latestExecute = vi.fn();
    const { result, rerender } = renderHook(
      props => useRegisteredCommands(props),
      {
        wrapper,
        initialProps: {
          ownerId: 'reports',
          commands: [{ id: 'new', label: 'New', execute: firstExecute }],
        },
      },
    );

    rerender({
      ownerId: 'reports',
      commands: [{ id: 'new', label: 'New', execute: latestExecute }],
    });
    await act(async () => {
      await result.current[0].execute();
    });

    expect(firstExecute).not.toHaveBeenCalled();
    expect(latestExecute).toHaveBeenCalledTimes(1);
  });

  it('does not duplicate registrations in Strict Mode', () => {
    const { result } = renderHook(
      () =>
        useRegisteredCommands({
          ownerId: 'reports',
          commands: [{ id: 'new', label: 'New report', execute: vi.fn() }],
        }),
      { wrapper: strictWrapper },
    );

    expect(result.current).toHaveLength(1);
  });

  it('clears registrations when the provider remounts', () => {
    const observedCommands = vi.fn();
    const view = render(
      <ProviderRemountTest
        providerKey="first"
        showOwner
        onCommands={observedCommands}
      />,
    );

    expect(observedCommands).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 'reports:new' }),
    ]);

    view.rerender(
      <ProviderRemountTest
        providerKey="second"
        showOwner={false}
        onCommands={observedCommands}
      />,
    );

    expect(observedCommands).toHaveBeenLastCalledWith([]);
  });

  it('rejects an entire contribution with duplicate command ids', () => {
    const firstExecute = vi.fn();
    const secondExecute = vi.fn();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    try {
      const { result } = renderHook(
        () =>
          useRegisteredCommands({
            ownerId: 'reports',
            commands: [
              { id: 'new', label: 'First', execute: firstExecute },
              { id: 'new', label: 'Second', execute: secondExecute },
            ],
          }),
        { wrapper },
      );

      expect(result.current).toEqual([]);
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('duplicate command id(s): new'),
      );
      expect(firstExecute).not.toHaveBeenCalled();
      expect(secondExecute).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('omits ambiguous concurrent registrations without stable instance ids', () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    try {
      const { result } = renderHook(
        () => {
          useRegisterCommandBarCommands('reports', [
            { id: 'same', label: 'First', execute: vi.fn() },
          ]);
          useRegisterCommandBarCommands('reports', [
            { id: 'same', label: 'Second', execute: vi.fn() },
          ]);
          return useCommandBarCommands();
        },
        { wrapper },
      );
      expect(result.current).toEqual([]);
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('unique instanceId'),
      );
    } finally {
      error.mockRestore();
    }
  });

  it('refreshes when distinct instance ids become a collision', () => {
    let latestCommands: readonly CommandBarCommand[] = [];
    const observedCommands = vi.fn((commands: readonly CommandBarCommand[]) => {
      latestCommands = commands;
    });
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    try {
      const view = render(
        <ChangingInstanceIds
          firstInstanceId="first"
          secondInstanceId="second"
          onCommands={observedCommands}
        />,
      );

      expect(latestCommands).toHaveLength(2);

      view.rerender(
        <ChangingInstanceIds
          firstInstanceId="same"
          secondInstanceId="same"
          onCommands={observedCommands}
        />,
      );

      expect(latestCommands).toEqual([]);
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('Command bar contribution collision'),
      );
    } finally {
      error.mockRestore();
    }
  });
});

function CleanupTest({
  showOwner,
  onCommands,
}: {
  showOwner: boolean;
  onCommands: (commands: readonly CommandBarCommand[]) => void;
}) {
  return (
    <CommandBarProvider>
      {showOwner && <CleanupOwner />}
      <CleanupObserver onCommands={onCommands} />
    </CommandBarProvider>
  );
}

function CleanupOwner() {
  useRegisterCommandBarCommands('reports', [
    { id: 'new', label: 'New report', execute: vi.fn() },
  ]);
  return null;
}

function CleanupObserver({
  onCommands,
}: {
  onCommands: (commands: readonly CommandBarCommand[]) => void;
}) {
  const commands = useCommandBarCommands();
  useEffect(() => onCommands(commands), [commands, onCommands]);
  return null;
}

function ConcurrentOwnerTest({
  firstVisible,
  secondVisible,
  onCommands,
}: {
  firstVisible?: boolean;
  secondVisible?: boolean;
  onCommands: (commands: readonly CommandBarCommand[]) => void;
}) {
  return (
    <CommandBarProvider>
      {firstVisible && <SameOwner firstLabel="First instance" />}
      {secondVisible && <SameOwner firstLabel="Second instance" />}
      <CleanupObserver onCommands={onCommands} />
    </CommandBarProvider>
  );
}

function SameOwner({ firstLabel }: { firstLabel: string }) {
  useRegisterCommandBarCommands('reports', [
    {
      id: 'same',
      instanceId: firstLabel === 'First instance' ? 'first' : 'second',
      label: firstLabel,
      execute: vi.fn(),
    },
  ]);
  return null;
}

function ChangingInstanceIds({
  firstInstanceId,
  secondInstanceId,
  onCommands,
}: {
  firstInstanceId: string;
  secondInstanceId: string;
  onCommands: (commands: readonly CommandBarCommand[]) => void;
}) {
  return (
    <CommandBarProvider>
      <InstanceOwner label="First instance" instanceId={firstInstanceId} />
      <InstanceOwner label="Second instance" instanceId={secondInstanceId} />
      <CleanupObserver onCommands={onCommands} />
    </CommandBarProvider>
  );
}

function InstanceOwner({
  label,
  instanceId,
}: {
  label: string;
  instanceId: string;
}) {
  useRegisterCommandBarCommands('reports', [
    {
      id: 'same',
      instanceId,
      label,
      execute: vi.fn(),
    },
  ]);
  return null;
}

function ProviderRemountTest({
  providerKey,
  showOwner,
  onCommands,
}: {
  providerKey: string;
  showOwner: boolean;
  onCommands: (commands: readonly CommandBarCommand[]) => void;
}) {
  return (
    <CommandBarProvider key={providerKey}>
      {showOwner && <CleanupOwner />}
      <CleanupObserver onCommands={onCommands} />
    </CommandBarProvider>
  );
}
