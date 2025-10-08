import { Request } from 'express';

/**
 * Helper to send IPC message to parent (sync-server)
 */
function sendIPC(message: unknown): Promise<unknown> {
  if (!process.send) {
    throw new Error('Not running as a forked process');
  }

  return new Promise((resolve, reject) => {
    const messageId = Math.random().toString(36).substring(7);

    const handler = (response: {
      type: string;
      messageId: string;
      data?: unknown;
      error?: string;
    }) => {
      if (
        response.type === 'secret-response' &&
        response.messageId === messageId
      ) {
        process.off('message', handler);

        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.data);
        }
      }
    };

    process.on('message', handler);

    const messageToSend = {
      ...(typeof message === 'object' && message !== null ? message : {}),
      messageId,
    };
    process.send!(messageToSend);
  });
}

/**
 * Save a secret for the plugin
 * Secrets are namespaced by plugin slug automatically
 */
export async function saveSecret(
  req: Request,
  key: string,
  value: string,
): Promise<{ success: boolean; error?: string }> {
  const pluginSlug = (req as unknown as { pluginSlug?: string }).pluginSlug;

  if (!pluginSlug) {
    return { success: false, error: 'Plugin slug not found' };
  }

  const secretName = `${pluginSlug}_${key}`;

  try {
    await sendIPC({
      type: 'secret-set',
      name: secretName,
      value,
      user: (req as unknown as { user?: unknown }).user,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Retrieve a secret for the plugin
 * Secrets are namespaced by plugin slug automatically
 */
export async function getSecret(
  req: Request,
  key: string,
): Promise<{ value?: string; error?: string }> {
  const pluginSlug = (req as unknown as { pluginSlug?: string }).pluginSlug;

  if (!pluginSlug) {
    return { error: 'Plugin slug not found' };
  }

  const secretName = `${pluginSlug}_${key}`;

  try {
    const result = await sendIPC({
      type: 'secret-get',
      name: secretName,
      user: (req as unknown as { user?: unknown }).user,
    });

    return { value: (result as { value?: string }).value };
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return { value: undefined };
    }
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Save multiple secrets at once
 */
export async function saveSecrets(
  req: Request,
  secrets: Record<string, string>,
): Promise<{ success: boolean; error?: string }> {
  for (const [key, value] of Object.entries(secrets)) {
    const result = await saveSecret(req, key, value);
    if (!result.success) {
      return result;
    }
  }
  return { success: true };
}

/**
 * Get multiple secrets at once
 */
export async function getSecrets(
  req: Request,
  keys: string[],
): Promise<{ values?: Record<string, string | undefined>; error?: string }> {
  const values: Record<string, string | undefined> = {};

  for (const key of keys) {
    const result = await getSecret(req, key);
    if (result.error) {
      return { error: result.error };
    }
    values[key] = result.value;
  }

  return { values };
}
