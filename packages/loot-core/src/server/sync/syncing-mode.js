let SYNCING_MODE = 'enabled';

export function setSyncingMode(mode) {
    let prevMode = SYNCING_MODE;
    switch (mode) {
        case 'enabled':
        SYNCING_MODE = 'enabled';
        break;
        case 'offline':
        SYNCING_MODE = 'offline';
        break;
        case 'disabled':
        SYNCING_MODE = 'disabled';
        break;
        case 'import':
        SYNCING_MODE = 'import';
        break;
        default:
        throw new Error('setSyncingMode: invalid mode: ' + mode);
    }
    return prevMode;
}

export function checkSyncingMode(mode) {
    switch (mode) {
        case 'enabled':
        return SYNCING_MODE === 'enabled' || SYNCING_MODE === 'offline';
        case 'disabled':
        return SYNCING_MODE === 'disabled' || SYNCING_MODE === 'import';
        case 'offline':
        return SYNCING_MODE === 'offline';
        case 'import':
        return SYNCING_MODE === 'import';
        default:
        throw new Error('checkSyncingMode: invalid mode: ' + mode);
    }
}
