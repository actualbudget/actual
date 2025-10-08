export const manifest = {
    name: 'pluggy-bank-sync',
    version: '0.0.1',
    description: 'Pluggy.ai bank synchronization plugin for Actual Budget',
    entry: 'index.js',
    author: 'Actual Budget Team',
    license: 'MIT',
    routes: [
        {
            path: '/status',
            methods: ['POST'],
            auth: 'authenticated',
            description: 'Check Pluggy.ai configuration status',
        },
        {
            path: '/accounts',
            methods: ['POST'],
            auth: 'authenticated',
            description: 'Fetch accounts from Pluggy.ai',
        },
        {
            path: '/transactions',
            methods: ['POST'],
            auth: 'authenticated',
            description: 'Fetch transactions from Pluggy.ai',
        },
    ],
    bankSync: {
        enabled: true,
        displayName: 'Pluggy.ai',
        description: 'Connect your bank accounts via Pluggy.ai',
        requiresAuth: true,
        endpoints: {
            status: '/status',
            accounts: '/accounts',
            transactions: '/transactions',
        },
    },
};
export default manifest;
