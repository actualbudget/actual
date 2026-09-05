import {
  createContext,
  createElement,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { ReactNode } from 'react';

/**
 * A command contributed to the command bar.
 *
 * `execute` may throw or return a rejected promise. The command bar catches
 * and reports those failures when a user selects a command.
 */
export type CommandBarCommand = Readonly<{
  readonly id: string;
  readonly ownerId?: string;
  readonly commandId?: string;
  readonly instanceId?: string;
  readonly label: string;
  readonly destructive?: boolean;
  readonly execute: () => void | Promise<void>;
}>;

type OwnerRegistration = {
  readonly registrationId: number;
  readonly ownerId: string;
  commands: readonly CommandBarCommand[];
  submittedCommands: readonly CommandBarCommand[];
};

type RegistrationHandle = {
  update: (commands: readonly CommandBarCommand[]) => void;
  unregister: () => void;
};

class CommandBarCommandRegistry {
  private readonly registrations = new Map<number, OwnerRegistration>();
  private readonly listeners = new Set<() => void>();
  private snapshot: readonly CommandBarCommand[] = [];
  private nextRegistrationId = 1;

  getSnapshot = (): readonly CommandBarCommand[] => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  register(
    ownerId: string,
    commands: readonly CommandBarCommand[],
  ): RegistrationHandle {
    const registration: OwnerRegistration = {
      registrationId: this.nextRegistrationId++,
      ownerId,
      commands: this.normalizeCommands(ownerId, commands),
      submittedCommands: commands,
    };
    this.registrations.set(registration.registrationId, registration);
    this.refresh();

    let isRegistered = true;
    return {
      update: nextCommands => {
        if (!isRegistered || registration.submittedCommands === nextCommands) {
          return;
        }

        registration.submittedCommands = nextCommands;
        const normalizedCommands = this.normalizeCommands(
          ownerId,
          nextCommands,
        );
        const presentationChanged = !haveSamePresentation(
          registration.commands,
          normalizedCommands,
        );
        registration.commands = normalizedCommands;
        if (presentationChanged) {
          this.refresh();
        }
      },
      unregister: () => {
        if (!isRegistered) return;
        isRegistered = false;

        if (this.registrations.delete(registration.registrationId)) {
          this.refresh();
        }
      },
    };
  }

  private normalizeCommands(
    ownerId: string,
    commands: readonly CommandBarCommand[],
  ): readonly CommandBarCommand[] {
    const invalidInstanceIds = commands.filter(
      command =>
        command.instanceId !== undefined &&
        (typeof command.instanceId !== 'string' ||
          command.instanceId.length === 0),
    );
    if (invalidInstanceIds.length > 0) {
      console.error(
        `Command bar contribution from owner "${ownerId}" was rejected: ` +
          'instanceId must be a non-empty string when supplied.',
      );
      return [];
    }
    const seenCommandIds = new Set<string>();
    const duplicateCommandIds = new Set<string>();

    for (const command of commands) {
      if (seenCommandIds.has(command.id)) {
        duplicateCommandIds.add(command.id);
      }
      seenCommandIds.add(command.id);
    }

    if (duplicateCommandIds.size > 0) {
      console.error(
        `Command bar contribution from owner "${ownerId}" was rejected: ` +
          `duplicate command id(s): ${[...duplicateCommandIds].join(', ')}. ` +
          'Each registration must contain unique command ids.',
      );
      return [];
    }

    return Object.freeze(
      commands.map(command =>
        Object.freeze({
          id: command.id,
          ownerId,
          commandId: command.id,
          instanceId: command.instanceId,
          label: command.label,
          destructive: command.destructive,
          execute: command.execute,
        }),
      ),
    );
  }

  private refresh() {
    const commandGroups = new Map<string, CommandBarCommand[]>();
    for (const registration of this.registrations.values()) {
      for (const command of registration.commands) {
        const key = `${registration.ownerId}\u0000${command.id}`;
        const group = commandGroups.get(key) ?? [];
        group.push(command);
        commandGroups.set(key, group);
      }
    }
    const ambiguousCommands = new Set<CommandBarCommand>();
    for (const [key, commands] of commandGroups) {
      if (commands.length < 2) continue;
      const instanceIds = commands.map(command => command.instanceId);
      if (
        instanceIds.some(instanceId => !instanceId) ||
        new Set(instanceIds).size !== instanceIds.length
      ) {
        console.error(
          `Command bar contribution collision for "${key.replace('\u0000', ':')}". ` +
            'Concurrent registrations must provide unique instanceId values; the conflicting rows were omitted.',
        );
        for (const command of commands) ambiguousCommands.add(command);
      }
    }
    const baseIdCounts = new Map<string, number>();
    for (const registration of this.registrations.values()) {
      for (const command of registration.commands) {
        if (ambiguousCommands.has(command)) continue;
        const baseId = getCommandBaseId(
          registration.ownerId,
          command.id,
          command.instanceId,
        );
        baseIdCounts.set(baseId, (baseIdCounts.get(baseId) ?? 0) + 1);
      }
    }
    const nextSnapshot: CommandBarCommand[] = [];
    for (const registration of this.registrations.values()) {
      for (const command of registration.commands) {
        if (ambiguousCommands.has(command)) continue;
        const id = getCommandBaseId(
          registration.ownerId,
          command.id,
          command.instanceId,
        );
        const displayId =
          baseIdCounts.get(id) === 1
            ? id
            : `${id}:${registration.registrationId}`;

        nextSnapshot.push(
          Object.freeze({
            id: displayId,
            ownerId: registration.ownerId,
            commandId: command.id,
            instanceId: command.instanceId,
            label: command.label,
            destructive: command.destructive,
            execute: () => {
              if (!this.registrations.has(registration.registrationId)) {
                return;
              }
              const latestCommand = registration.commands.find(
                candidate => candidate.id === command.id,
              );
              return latestCommand?.execute();
            },
          }),
        );
      }
    }

    if (haveSamePresentation(this.snapshot, nextSnapshot)) {
      return;
    }

    this.snapshot = Object.freeze(nextSnapshot);
    for (const listener of this.listeners) listener();
  }
}

function getCommandBaseId(
  ownerId: string,
  commandId: string,
  instanceId?: string,
) {
  if (instanceId != null) {
    return `command:${ownerId.length}:${ownerId}:${commandId.length}:${commandId}:${instanceId.length}:${instanceId}`;
  }
  // Keep the familiar owner:id form for the common case. If either value can
  // contain the delimiter, length-prefix both values so the pair is unambiguous.
  if (!ownerId.includes(':') && !commandId.includes(':')) {
    return `${ownerId}:${commandId}`;
  }
  return `command:${ownerId.length}:${ownerId}:${commandId.length}:${commandId}`;
}

function haveSamePresentation(
  first: readonly CommandBarCommand[],
  second: readonly CommandBarCommand[],
) {
  if (first.length !== second.length) return false;
  return first.every(
    (command, index) =>
      command.id === second[index]?.id &&
      command.label === second[index]?.label &&
      command.destructive === second[index]?.destructive,
  );
}

const CommandBarRegistryContext =
  createContext<CommandBarCommandRegistry | null>(null);

type CommandBarProviderProps = {
  children: ReactNode;
};

export function CommandBarProvider({ children }: CommandBarProviderProps) {
  const [registry] = useState(() => new CommandBarCommandRegistry());

  return createElement(
    CommandBarRegistryContext.Provider,
    { value: registry },
    children,
  );
}

/** Reads the commands contributed to the current budget's command bar. */
export function useCommandBarCommands(): readonly CommandBarCommand[] {
  const registry = useContext(CommandBarRegistryContext);

  if (!registry) {
    throw new Error(
      'useCommandBarCommands must be used within a CommandBarProvider',
    );
  }

  return useSyncExternalStore(
    registry.subscribe,
    registry.getSnapshot,
    registry.getSnapshot,
  );
}

/**
 * Replaces one owner's command set and removes it when the owner unmounts.
 * Updates are applied in a layout effect, so a render that is interrupted or
 * discarded cannot change the live command behavior.
 */
export function useRegisterCommandBarCommands(
  ownerId: string,
  commands: readonly CommandBarCommand[],
) {
  const registry = useContext(CommandBarRegistryContext);
  if (!registry) {
    throw new Error(
      'useRegisterCommandBarCommands must be used within a CommandBarProvider',
    );
  }

  const commandsRef = useRef(commands);
  const registrationRef = useRef<RegistrationHandle | null>(null);

  // This is deliberately an effect rather than a render-time ref assignment:
  // discarded renders must not change the command callback that is live in the
  // registry.
  useLayoutEffect(() => {
    commandsRef.current = commands;
    registrationRef.current?.update(commands);
  }, [commands]);

  useLayoutEffect(() => {
    const registration = registry.register(ownerId, commandsRef.current);
    registrationRef.current = registration;
    return () => {
      if (registrationRef.current === registration) {
        registrationRef.current = null;
      }
      registration.unregister();
    };
  }, [ownerId, registry]);
}
