// Sync server (actual-server)

const _node = process.argv[0];
const _script = process.argv[1];
const _subProcess = process.argv[2];
const actualServerDir = process.argv[3];

const lazyLoadActualServer = async () => {
  try {
    console.info('Starting actual-server...');
    await import(`${actualServerDir}/app.js`);
  } catch (error) {
    console.error('Failed to start actual-server:', error);
    throw new Error(`Failed to start actual-server: ${error}`);
  }
};

// Start actual-server
lazyLoadActualServer();
