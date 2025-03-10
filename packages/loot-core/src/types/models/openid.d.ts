export type OpenIdConfig = {
  selectedProvider: string;
  issuer?: string;
  client_id: string;
  client_secret: string;
  server_hostname: string;
  discoveryURL: string;
};
