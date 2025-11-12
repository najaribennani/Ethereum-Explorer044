import { VizceralGraph, EthereumBlock, EthereumTransaction, EthereumNetworkInfo } from './types';

// Build backend URLs dynamically based on current hostname
// In development: uses localhost with port
// In Replit: uses Replit's port-specific subdomain format (e.g., https://4000--hostname)
const getBackendBaseUrl = () => {
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  
  const hostname = window.location.hostname;
  const isReplit = hostname.includes('replit.dev') || hostname.includes('repl.co');
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  
  if (isReplit) {
    // Replit uses port-specific subdomains: https://4000--hostname
    return `${protocol}//4000--${hostname}`;
  } else {
    // Local development or other environments: use standard port notation
    return `${protocol}//${hostname}:4000`;
  }
};

const getBackendWsUrl = () => {
  if (process.env.REACT_APP_BACKEND_WS_URL) {
    return process.env.REACT_APP_BACKEND_WS_URL;
  }
  
  const hostname = window.location.hostname;
  const isReplit = hostname.includes('replit.dev') || hostname.includes('repl.co');
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  if (isReplit) {
    // Replit uses port-specific subdomains for WebSocket too
    return `${protocol}//4000--${hostname}`;
  } else {
    // Local development or other environments
    return `${protocol}//${hostname}:4000`;
  }
};

const BACKEND_BASE_URL = getBackendBaseUrl();
const BACKEND_WS_URL = getBackendWsUrl();

export interface EthereumSnapshot {
  block: EthereumBlock | null;
  transactions: EthereumTransaction[];
  networkInfo: EthereumNetworkInfo;
}

export const ethereumClient = {
  getSnapshotAsync: async (): Promise<EthereumSnapshot> => {
    const response = await fetch(`${BACKEND_BASE_URL}/api/snapshot`);
    const responseJson = await response.json();
    return responseJson;
  },

  getVizsceralGraphAsync: async (): Promise<VizceralGraph> => {
    // Create a simple graph showing Ethereum network
    // For visualization purposes, we'll create symbolic nodes
    const nodes = [
      {
        name: 'ethereum-mainnet',
        displayName: 'Ethereum Mainnet',
        class: 'normal',
      },
      {
        name: 'infura-node',
        displayName: 'Infura Node',
        class: 'normal',
      },
      {
        name: 'blockchain',
        displayName: 'Blockchain',
        class: 'normal',
      },
    ];

    const connections = [
      {
        source: 'infura-node',
        target: 'ethereum-mainnet',
        metrics: { normal: 100 },
      },
      {
        source: 'ethereum-mainnet',
        target: 'blockchain',
        metrics: { normal: 100 },
      },
    ];

    return {
      nodes,
      connections,
    };
  },
};

export const createEthereumWebSocketClient = () => {
  return new WebSocket(BACKEND_WS_URL);
};
