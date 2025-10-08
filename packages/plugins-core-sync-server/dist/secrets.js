"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveSecret = saveSecret;
exports.getSecret = getSecret;
exports.saveSecrets = saveSecrets;
exports.getSecrets = getSecrets;
/**
 * Helper to send IPC message to parent (sync-server)
 */
function sendIPC(message) {
    if (!process.send) {
        throw new Error('Not running as a forked process');
    }
    return new Promise((resolve, reject) => {
        const messageId = Math.random().toString(36).substring(7);
        const handler = (response) => {
            if (response.type === 'secret-response' &&
                response.messageId === messageId) {
                process.off('message', handler);
                if (response.error) {
                    reject(new Error(response.error));
                }
                else {
                    resolve(response.data);
                }
            }
        };
        process.on('message', handler);
        const messageToSend = {
            ...(typeof message === 'object' && message !== null ? message : {}),
            messageId,
        };
        process.send(messageToSend);
    });
}
/**
 * Save a secret for the plugin
 * Secrets are namespaced by plugin slug automatically
 */
async function saveSecret(req, key, value) {
    const pluginSlug = req.pluginSlug;
    if (!pluginSlug) {
        return { success: false, error: 'Plugin slug not found' };
    }
    const secretName = `${pluginSlug}_${key}`;
    try {
        await sendIPC({
            type: 'secret-set',
            name: secretName,
            value,
            user: req.user,
        });
        return { success: true };
    }
    catch (error) {
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
async function getSecret(req, key) {
    const pluginSlug = req.pluginSlug;
    if (!pluginSlug) {
        return { error: 'Plugin slug not found' };
    }
    const secretName = `${pluginSlug}_${key}`;
    try {
        const result = await sendIPC({
            type: 'secret-get',
            name: secretName,
            user: req.user,
        });
        return { value: result.value };
    }
    catch (error) {
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
async function saveSecrets(req, secrets) {
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
async function getSecrets(req, keys) {
    const values = {};
    for (const key of keys) {
        const result = await getSecret(req, key);
        if (result.error) {
            return { error: result.error };
        }
        values[key] = result.value;
    }
    return { values };
}
