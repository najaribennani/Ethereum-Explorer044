import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
};

type App = Hono<{ Bindings: Bindings }>;

interface EthereumBlock {
  number: number;
  hash: string;
  timestamp: number;
  transactions: string[];
  gasUsed: string;
  gasLimit: string;
  miner: string;
  difficulty: string;
  txCount: number;
}

interface EthereumTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasLimit: string;
  nonce: number;
  blockNumber: number;
}

interface EthereumNetworkInfo {
  blockNumber: number;
  gasPrice: string;
  txCount: number;
}

interface GasPricePoint {
  blockNumber: number;
  gasPrice: number;
  timestamp: number;
}

interface MempoolStats {
  pendingCount: number;
  avgGasPrice: string;
  totalValue: string;
}

// Cache for blockchain data
let cachedData: {
  block: EthereumBlock | null;
  transactions: EthereumTransaction[];
  networkInfo: EthereumNetworkInfo;
  blockHistory: EthereumBlock[];
  gasPriceHistory: GasPricePoint[];
  mempoolStats: MempoolStats;
  ethPrice: { usd: number; change24h: number; lastUpdate: number } | null;
  lastUpdate: number;
} = {
  block: null,
  transactions: [],
  networkInfo: { blockNumber: 0, gasPrice: '0', txCount: 0 },
  blockHistory: [],
  gasPriceHistory: [],
  mempoolStats: { pendingCount: 0, avgGasPrice: '0', totalValue: '0' },
  ethPrice: null,
  lastUpdate: 0,
};

// Using public Ethereum RPC endpoint
const ETHEREUM_RPC_URL = 'https://eth.llamarpc.com';

// Helper to make RPC calls
const rpcCall = async (method: string, params: any[] = []): Promise<any> => {
  const response = await fetch(ETHEREUM_RPC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });
  
  const data = await response.json();
  return data.result;
};

// Helper functions to convert hex to decimal
const hexToDecimal = (hex: string): number => {
  return parseInt(hex, 16);
};

const hexToBigInt = (hex: string): bigint => {
  return BigInt(hex);
};

const formatEther = (weiHex: string): string => {
  const wei = hexToBigInt(weiHex);
  const ether = Number(wei) / 1e18;
  return ether.toFixed(6);
};

const formatGwei = (weiHex: string): string => {
  const wei = hexToBigInt(weiHex);
  const gwei = Number(wei) / 1e9;
  return gwei.toFixed(2);
};

// Fetch ETH price from CoinGecko API
const fetchEthPrice = async (): Promise<void> => {
  try {
    // Only update if price is older than 60 seconds
    if (cachedData.ethPrice && Date.now() - cachedData.ethPrice.lastUpdate < 60000) {
      return;
    }

    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true');
    const data = await response.json();
    
    if (data.ethereum) {
      cachedData.ethPrice = {
        usd: data.ethereum.usd,
        change24h: data.ethereum.usd_24h_change || 0,
        lastUpdate: Date.now(),
      };
      console.log(`✓ ETH Price: $${data.ethereum.usd} (${data.ethereum.usd_24h_change?.toFixed(2)}%)`);
    }
  } catch (error) {
    console.error('Error fetching ETH price:', error);
    // Set default price if fetch fails
    if (!cachedData.ethPrice) {
      cachedData.ethPrice = {
        usd: 0,
        change24h: 0,
        lastUpdate: Date.now(),
      };
    }
  }
};

const fetchLatestBlockData = async (): Promise<void> => {
  try {
    // Fetch ETH price in parallel
    fetchEthPrice().catch(err => console.error('Price fetch error:', err));
    
    // Fetch latest block number
    const latestBlockNumberHex = await rpcCall('eth_blockNumber');
    const latestBlockNumber = hexToDecimal(latestBlockNumberHex);
    
    // Fetch block with transactions
    const block = await rpcCall('eth_getBlockByNumber', [latestBlockNumberHex, true]);
    
    if (!block) {
      console.error('Failed to fetch block');
      return;
    }

    // Process block data
    const ethBlock: EthereumBlock = {
      number: hexToDecimal(block.number),
      hash: block.hash || '',
      timestamp: hexToDecimal(block.timestamp),
      transactions: block.transactions.map((tx: any) => typeof tx === 'string' ? tx : tx.hash),
      gasUsed: hexToDecimal(block.gasUsed).toString(),
      gasLimit: hexToDecimal(block.gasLimit).toString(),
      miner: block.miner || '',
      difficulty: hexToDecimal(block.difficulty || '0x0').toString(),
      txCount: block.transactions.length,
    };

    // Fetch recent transactions with details (limit to prevent rate limiting)
    const transactions: EthereumTransaction[] = [];
    const txList = block.transactions.slice(0, 15); // Limit to 15 transactions
    
    for (const tx of txList) {
      try {
        const txData = typeof tx === 'string' ? await rpcCall('eth_getTransactionByHash', [tx]) : tx;
        
        if (txData) {
          transactions.push({
            hash: txData.hash,
            from: txData.from,
            to: txData.to || 'Contract Creation',
            value: formatEther(txData.value),
            gasPrice: formatGwei(txData.gasPrice),
            gasLimit: hexToDecimal(txData.gas).toString(),
            nonce: hexToDecimal(txData.nonce),
            blockNumber: hexToDecimal(txData.blockNumber || '0x0'),
          });
        }
      } catch (txError) {
        console.error('Error processing transaction:', txError);
      }
    }

    // Fetch current gas price
    const gasPriceHex = await rpcCall('eth_gasPrice');
    const currentGasPrice = formatGwei(gasPriceHex);

    // Network info
    const networkInfo: EthereumNetworkInfo = {
      blockNumber: latestBlockNumber,
      gasPrice: currentGasPrice,
      txCount: block.transactions.length,
    };

    // Update block history (keep last 20 blocks)
    cachedData.blockHistory.unshift(ethBlock);
    if (cachedData.blockHistory.length > 20) {
      cachedData.blockHistory = cachedData.blockHistory.slice(0, 20);
    }

    // Update gas price history
    cachedData.gasPriceHistory.unshift({
      blockNumber: latestBlockNumber,
      gasPrice: parseFloat(currentGasPrice),
      timestamp: hexToDecimal(block.timestamp),
    });
    if (cachedData.gasPriceHistory.length > 50) {
      cachedData.gasPriceHistory = cachedData.gasPriceHistory.slice(0, 50);
    }

    // Simulate mempool stats (real mempool requires special RPC endpoints)
    const mempoolStats: MempoolStats = {
      pendingCount: Math.floor(Math.random() * 50000 + 10000), // Simulated pending tx count
      avgGasPrice: currentGasPrice,
      totalValue: (Math.random() * 100 + 50).toFixed(2), // Simulated total ETH value
    };

    // Update cache
    cachedData.block = ethBlock;
    cachedData.transactions = transactions;
    cachedData.networkInfo = networkInfo;
    cachedData.mempoolStats = mempoolStats;
    cachedData.lastUpdate = Date.now();

    console.log(`✓ Updated Ethereum data - Block ${latestBlockNumber}, ${transactions.length} TXs`);
  } catch (error) {
    console.error('Error fetching Ethereum data:', error);
  }
};

// Initialize data fetch
fetchLatestBlockData();

// Update every 15 seconds (Ethereum block time is ~12s)
setInterval(() => {
  fetchLatestBlockData();
}, 15000);

export default (app: App) => {
  // API endpoint for snapshot
  app.get('/api/ethereum/snapshot', async (c) => {
    // If cache is too old (> 30 seconds), refresh it
    if (Date.now() - cachedData.lastUpdate > 30000) {
      await fetchLatestBlockData();
    }

    return c.json(cachedData);
  });

  // Health check endpoint
  app.get('/api/ethereum/health', (c) => {
    return c.json({
      status: 'ok',
      lastUpdate: cachedData.lastUpdate,
      blockNumber: cachedData.networkInfo.blockNumber,
    });
  });

  // Mempool stats endpoint
  app.get('/api/ethereum/mempool', (c) => {
    return c.json(cachedData.mempoolStats);
  });

  // ETH Price endpoint
  app.get('/api/ethereum/price', (c) => {
    return c.json(cachedData.ethPrice || { usd: 0, change24h: 0, lastUpdate: 0 });
  });

  // Transaction search endpoint
  app.get('/api/ethereum/transaction/:hash', async (c) => {
    const hash = c.req.param('hash');
    
    try {
      const txData = await rpcCall('eth_getTransactionByHash', [hash]);
      
      if (!txData) {
        return c.json({ error: 'Transaction not found' }, 404);
      }

      const receipt = await rpcCall('eth_getTransactionReceipt', [hash]);
      
      const isContractCreation = !txData.to;
      const isContractInteraction = txData.input && txData.input !== '0x';
      
      const transaction: any = {
        hash: txData.hash,
        from: txData.from,
        to: txData.to || 'Contract Creation',
        value: formatEther(txData.value),
        gasPrice: formatGwei(txData.gasPrice),
        gasLimit: hexToDecimal(txData.gas).toString(),
        gasUsed: receipt ? hexToDecimal(receipt.gasUsed).toString() : 'Pending',
        nonce: hexToDecimal(txData.nonce),
        blockNumber: txData.blockNumber ? hexToDecimal(txData.blockNumber) : null,
        blockHash: txData.blockHash,
        status: receipt ? (hexToDecimal(receipt.status) === 1 ? 'Success' : 'Failed') : 'Pending',
        timestamp: null,
        isContractCreation,
        isContractInteraction,
        input: txData.input,
        inputLength: txData.input ? (txData.input.length - 2) / 2 : 0, // bytes
      };

      // Add contract creation address if available
      if (isContractCreation && receipt) {
        transaction.contractAddress = receipt.contractAddress;
      }

      // Parse logs for token transfers (ERC20)
      if (receipt && receipt.logs && receipt.logs.length > 0) {
        const tokenTransfers = [];
        
        for (const log of receipt.logs) {
          // ERC20 Transfer event signature: Transfer(address,address,uint256)
          // Topic0: 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
          if (log.topics && log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
            try {
              const from = '0x' + log.topics[1].slice(26);
              const to = '0x' + log.topics[2].slice(26);
              const value = hexToBigInt(log.data);
              
              tokenTransfers.push({
                type: 'ERC20',
                tokenAddress: log.address,
                from,
                to,
                value: value.toString(),
                valueFormatted: (Number(value) / 1e18).toFixed(6), // Assume 18 decimals
              });
            } catch (e) {
              console.error('Error parsing token transfer:', e);
            }
          }
        }
        
        if (tokenTransfers.length > 0) {
          transaction.tokenTransfers = tokenTransfers;
        }
        
        transaction.logCount = receipt.logs.length;
      }

      // Fetch block timestamp if transaction is mined
      if (txData.blockNumber) {
        const block = await rpcCall('eth_getBlockByNumber', [txData.blockNumber, false]);
        if (block) {
          transaction.timestamp = hexToDecimal(block.timestamp);
        }
      }

      return c.json(transaction);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return c.json({ error: 'Failed to fetch transaction' }, 500);
    }
  });

  // Wallet tracking endpoint with pagination
  app.get('/api/ethereum/wallet/:address', async (c) => {
    const address = c.req.param('address');
    const limit = parseInt(c.req.query('limit') || '50');
    
    try {
      // Get current block number
      const latestBlockNumberHex = await rpcCall('eth_blockNumber');
      const latestBlockNumber = hexToDecimal(latestBlockNumberHex);
      
      // Get wallet balance
      const balanceHex = await rpcCall('eth_getBalance', [address, 'latest']);
      const balance = formatEther(balanceHex);

      // Get transaction count
      const txCountHex = await rpcCall('eth_getTransactionCount', [address, 'latest']);
      const txCount = hexToDecimal(txCountHex);

      // Fetch transactions from recent blocks
      const transactions: any[] = [];
      const blocksToScan = Math.min(100, limit); // Scan last 100 blocks or limit
      
      for (let i = 0; i < blocksToScan && transactions.length < limit; i++) {
        const blockNum = latestBlockNumber - i;
        const blockHex = '0x' + blockNum.toString(16);
        
        try {
          const block = await rpcCall('eth_getBlockByNumber', [blockHex, true]);
          
          if (block && block.transactions) {
            for (const tx of block.transactions) {
              if (transactions.length >= limit) break;
              
              // Check if transaction involves the address
              if (tx.from?.toLowerCase() === address.toLowerCase() || 
                  tx.to?.toLowerCase() === address.toLowerCase()) {
                transactions.push({
                  hash: tx.hash,
                  from: tx.from,
                  to: tx.to || 'Contract Creation',
                  value: formatEther(tx.value),
                  gasPrice: formatGwei(tx.gasPrice),
                  blockNumber: hexToDecimal(tx.blockNumber),
                  timestamp: hexToDecimal(block.timestamp),
                  type: tx.from?.toLowerCase() === address.toLowerCase() ? 'sent' : 'received',
                });
              }
            }
          }
        } catch (blockError) {
          console.error(`Error fetching block ${blockNum}:`, blockError);
        }
      }

      return c.json({
        address,
        balance,
        txCount,
        transactions,
        note: transactions.length < txCount 
          ? `Showing ${transactions.length} of ${txCount} transactions. Use external block explorers for complete history.`
          : null,
      });
    } catch (error) {
      console.error('Error tracking wallet:', error);
      return c.json({ error: 'Failed to track wallet' }, 500);
    }
  });

  // Block search endpoint
  app.get('/api/ethereum/block/:number', async (c) => {
    const blockNum = c.req.param('number');
    
    try {
      const blockHex = blockNum.startsWith('0x') ? blockNum : '0x' + parseInt(blockNum).toString(16);
      const block = await rpcCall('eth_getBlockByNumber', [blockHex, true]);
      
      if (!block) {
        return c.json({ error: 'Block not found' }, 404);
      }

      const ethBlock: EthereumBlock = {
        number: hexToDecimal(block.number),
        hash: block.hash || '',
        timestamp: hexToDecimal(block.timestamp),
        transactions: block.transactions.map((tx: any) => typeof tx === 'string' ? tx : tx.hash),
        gasUsed: hexToDecimal(block.gasUsed).toString(),
        gasLimit: hexToDecimal(block.gasLimit).toString(),
        miner: block.miner || '',
        difficulty: hexToDecimal(block.difficulty || '0x0').toString(),
        txCount: block.transactions.length,
      };

      return c.json(ethBlock);
    } catch (error) {
      console.error('Error fetching block:', error);
      return c.json({ error: 'Failed to fetch block' }, 500);
    }
  });
};
