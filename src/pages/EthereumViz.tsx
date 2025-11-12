import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Search, Wallet, Box, Zap, TrendingUp, Clock, User, Hash, Activity, Database, Coins, Settings, DollarSign, AlertCircle, CheckCircle, XCircle, Bell, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import type { EthereumBlock, EthereumTransaction, EthereumNetworkInfo } from '../ethereum/backend_client';
import { MempoolViz } from '@/components/MempoolViz';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { WalletTracker } from '@/components/WalletTracker';

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

const EthereumViz = () => {
  const [block, setBlock] = useState<EthereumBlock | null>(null);
  const [transactions, setTransactions] = useState<EthereumTransaction[]>([]);
  const [blockHistory, setBlockHistory] = useState<EthereumBlock[]>([]);
  const [gasPriceHistory, setGasPriceHistory] = useState<GasPricePoint[]>([]);
  const [mempoolStats, setMempoolStats] = useState<MempoolStats>({
    pendingCount: 0,
    avgGasPrice: '0',
    totalValue: '0',
  });
  const [networkInfo, setNetworkInfo] = useState<EthereumNetworkInfo>({
    blockNumber: 0,
    gasPrice: '0',
    txCount: 0,
  });
  const [connected, setConnected] = useState(false);
  const [selectedTx, setSelectedTx] = useState<EthereumTransaction | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<EthereumBlock | null>(null);
  const [blockTransactions, setBlockTransactions] = useState<EthereumTransaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [walletFilter, setWalletFilter] = useState('');
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [refreshRate, setRefreshRate] = useState(5000); // 5 seconds default
  const [gasEstimate, setGasEstimate] = useState({ slow: 0, standard: 0, fast: 0 });
  const [congestionLevel, setCongestionLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [gasAlert, setGasAlert] = useState<string | null>(null);
  const [alertThreshold, setAlertThreshold] = useState(50); // Gwei threshold
  const [walletAddress, setWalletAddress] = useState('');
  const [walletData, setWalletData] = useState<any>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [searchHash, setSearchHash] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [ethPrice, setEthPrice] = useState<{ usd: number; change24h: number } | null>(null);
  const [showBlockHistory, setShowBlockHistory] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch blockchain data
        const response = await fetch('/api/ethereum/snapshot');
        if (response.ok) {
          const data = await response.json();
          if (data.block) setBlock(data.block);
          if (data.transactions) setTransactions(data.transactions);
          if (data.networkInfo) setNetworkInfo(data.networkInfo);
          if (data.blockHistory) {
            console.log('Block history received:', data.blockHistory.length);
            setBlockHistory(data.blockHistory);
          }
          if (data.gasPriceHistory) setGasPriceHistory(data.gasPriceHistory);
          if (data.ethPrice) setEthPrice(data.ethPrice);
          if (data.mempoolStats) {
            setMempoolStats(data.mempoolStats);
            // Calculate gas fee estimates based on mempool
            const baseGas = parseFloat(data.mempoolStats.avgGasPrice) || 10;
            setGasEstimate({
              slow: parseFloat((baseGas * 0.8).toFixed(2)),
              standard: parseFloat(baseGas.toFixed(2)),
              fast: parseFloat((baseGas * 1.2).toFixed(2)),
            });

            // Calculate congestion level based on pending transactions
            const pending = data.mempoolStats.pendingCount;
            if (pending < 20000) {
              setCongestionLevel('low');
            } else if (pending < 40000) {
              setCongestionLevel('medium');
            } else {
              setCongestionLevel('high');
            }

            // Check gas price alert
            if (baseGas < alertThreshold && gasAlert !== 'below') {
              setGasAlert('below');
            } else if (baseGas >= alertThreshold && gasAlert === 'below') {
              setGasAlert(null);
            }
          }
          setConnected(true);
        } else {
          setConnected(false);
        }
      } catch (error) {
        console.error('Error fetching Ethereum data:', error);
        setConnected(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, refreshRate);
    return () => clearInterval(interval);
  }, [refreshRate]);

  // Separate effect for price updates (every 30 seconds)
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch('/api/ethereum/price');
        if (response.ok) {
          const data = await response.json();
          setEthPrice(data);
        }
      } catch (error) {
        console.error('Error fetching price:', error);
      }
    };

    fetchPrice(); // Fetch immediately
    const priceInterval = setInterval(fetchPrice, 30000); // Update every 30 seconds
    return () => clearInterval(priceInterval);
  }, []);

  const formatTimestamp = (timestamp: number) => {
    return format(new Date(timestamp * 1000), 'PPpp');
  };

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const getBlockAge = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h`;
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = searchTerm === '' || 
      tx.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.to.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesWallet = walletFilter === '' ||
      tx.from.toLowerCase() === walletFilter.toLowerCase() ||
      tx.to.toLowerCase() === walletFilter.toLowerCase();
    
    return matchesSearch && matchesWallet;
  });

  const trackWallet = async (address: string) => {
    if (!address) return;
    
    setLoadingWallet(true);
    setWalletData(null);
    
    try {
      const response = await fetch(`/api/ethereum/wallet/${address}`);
      if (response.ok) {
        const data = await response.json();
        setWalletData(data);
        setWalletAddress(address);
        setWalletFilter(address);
      } else {
        console.error('Failed to fetch wallet data');
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoadingWallet(false);
    }
  };

  const searchTransaction = async (hash: string) => {
    if (!hash) return;
    
    setSearchLoading(true);
    setSearchResult(null);
    
    try {
      const response = await fetch(`/api/ethereum/transaction/${hash}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResult(data);
        setShowSearchDialog(true);
      } else {
        console.error('Transaction not found');
        setSearchResult({ error: 'Transaction not found' });
        setShowSearchDialog(true);
      }
    } catch (error) {
      console.error('Error searching transaction:', error);
      setSearchResult({ error: 'Failed to search transaction' });
      setShowSearchDialog(true);
    } finally {
      setSearchLoading(false);
    }
  };

  const openBlockDetails = async (blk: EthereumBlock) => {
    setSelectedBlock(blk);
    setBlockTransactions(transactions.filter(tx => tx.blockNumber === blk.number));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2d1f16] via-[#3d2f22] to-[#2d1f16]">
      {/* Header - Brown Style */}
      <header className="border-b border-[#8B4513]/30 bg-gradient-to-r from-[#3d2f22] to-[#4a3b2a] sticky top-0 z-50 shadow-lg backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-gradient-to-br from-[#f97316] to-[rgba(249, 115, 22, 0.3)] flex items-center justify-center shadow-lg">
                <Box className="text-white w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold text-white">Ethereum Explorer</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Enter tx hash or block #..."
                    value={searchHash}
                    onChange={(e) => setSearchHash(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchTransaction(searchHash)}
                    className="pl-10 w-64 bg-[#2d1f16] border-[rgba(249, 115, 22, 0.3)] text-white placeholder:text-gray-500"
                  />
                </div>
                <Button
                  onClick={() => searchTransaction(searchHash)}
                  disabled={searchLoading || !searchHash}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {searchLoading ? 'Searching...' : 'Search'}
                </Button>
              </div>
              
              <Button
                onClick={() => setShowWalletDialog(true)}
                variant="outline"
                className="border-[rgba(249, 115, 22, 0.3)] hover:bg-[#3d2f22] text-white"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Track Wallet
              </Button>

              {walletFilter && (
                <Button
                  onClick={() => setWalletFilter('')}
                  variant="outline"
                  size="sm"
                  className="border-red-500/30 hover:bg-red-500/10 text-red-400"
                >
                  Clear Filter
                </Button>
              )}

              <ThemeSwitcher />

              <Button
                onClick={() => setShowBlockHistory(true)}
                variant="outline"
                size="sm"
                className="border-[rgba(249, 115, 22, 0.3)] hover:bg-[#3d2f22] text-white"
              >
                <Database className="w-4 h-4 mr-2" />
                Block History
              </Button>

              {ethPrice && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#8B4513]/20 to-[#A0522D]/20 rounded-lg border border-[#8B4513]/30">
                  <DollarSign className="w-4 h-4 text-[#B8860B]" />
                  <div className="text-sm">
                    <span className="text-white font-semibold">${ethPrice.usd.toFixed(2)}</span>
                    <span className={`ml-2 text-xs ${ethPrice.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {ethPrice.change24h >= 0 ? '↑' : '↓'} {Math.abs(ethPrice.change24h).toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 px-3 py-2 bg-[#3d2f22] rounded-lg">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                <span className="text-sm text-gray-300">
                  {connected ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Gas Price Alert */}
        {gasAlert === 'below' && (
          <div className="mb-4 bg-gradient-to-r from-green-900/30 to-green-800/20 border border-green-500/40 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <div className="flex-1">
              <div className="text-green-400 font-semibold">Gas Price Alert!</div>
              <div className="text-green-400/80 text-sm">
                Gas price is below your threshold of {alertThreshold} Gwei. Good time to make transactions!
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setGasAlert(null)}
              className="text-green-400 hover:text-green-300"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Network Congestion Indicator */}
        <Card className="bg-gradient-to-br from-[#3d2f22] to-[#2d1f16] border-[#8B4513]/40 mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-[#fb923c] flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Network Congestion Monitor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#9a6b3e]">Congestion Level</span>
                  <Badge className={`
                    ${congestionLevel === 'low' ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}
                    ${congestionLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : ''}
                    ${congestionLevel === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' : ''}
                  `}>
                    {congestionLevel === 'low' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {congestionLevel === 'medium' && <AlertCircle className="w-3 h-3 mr-1" />}
                    {congestionLevel === 'high' && <XCircle className="w-3 h-3 mr-1" />}
                    {congestionLevel.toUpperCase()}
                  </Badge>
                </div>
                <div className="w-full h-4 bg-[#2d1f16] rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      congestionLevel === 'low' ? 'bg-gradient-to-r from-green-500 to-green-400 w-1/3' : 
                      congestionLevel === 'medium' ? 'bg-gradient-to-r from-yellow-500 to-yellow-400 w-2/3' : 
                      'bg-gradient-to-r from-red-500 to-red-400 w-full'
                    }`}
                  />
                </div>
                <div className="text-xs text-[#9a6b3e] mt-2">
                  {congestionLevel === 'low' && 'Network is flowing smoothly. Good time for transactions!'}
                  {congestionLevel === 'medium' && 'Moderate network activity. Expect normal confirmation times.'}
                  {congestionLevel === 'high' && 'High network congestion. Transactions may take longer to confirm.'}
                </div>
              </div>
              <div className="border-l border-[rgba(249, 115, 22, 0.3)] pl-6">
                <div className="text-sm text-[#fb923c] mb-2">Gas Alert Threshold</div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={alertThreshold}
                    onChange={(e) => setAlertThreshold(Number(e.target.value))}
                    className="w-24 bg-[#2d1f16] border-[rgba(249, 115, 22, 0.3)] text-white"
                  />
                  <span className="text-sm text-[#9a6b3e]">Gwei</span>
                  <Bell className="w-4 h-4 text-[#fb923c]" />
                </div>
                <div className="text-xs text-[#9a6b3e] mt-1">Alert when gas drops below</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Network Stats - Primary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-[#3d2f22] to-[#2d1f16] border-[#8B4513]/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[#fb923c] flex items-center gap-2">
                <Box className="w-4 h-4" />
                Block Height
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{networkInfo.blockNumber.toLocaleString()}</div>
              <div className="text-xs text-[#9a6b3e] mt-1">Latest block</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#3d2f22] to-[#2d1f16] border-[#8B4513]/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[#fb923c] flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Gas Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {parseFloat(networkInfo.gasPrice).toFixed(1)} 
                <span className="text-lg ml-1 text-[#9a6b3e]">Gwei</span>
              </div>
              <div className="text-xs text-[#9a6b3e] mt-1">Current average</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#3d2f22] to-[#2d1f16] border-[#8B4513]/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[#fb923c] flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{networkInfo.txCount}</div>
              <div className="text-xs text-[#9a6b3e] mt-1">In latest block</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#3d2f22] to-[#2d1f16] border-[#8B4513]/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[#fb923c] flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Network Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">Active</div>
              <div className="text-xs text-[#9a6b3e] mt-1">{blockHistory.length} blocks tracked</div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-purple-400 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Avg Block Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {blockHistory.length > 1 
                  ? ((blockHistory[0].timestamp - blockHistory[blockHistory.length - 1].timestamp) / (blockHistory.length - 1)).toFixed(1)
                  : '12.0'}
                <span className="text-lg ml-1 text-purple-300">s</span>
              </div>
              <div className="text-xs text-purple-300/70 mt-1">Last {blockHistory.length} blocks</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-blue-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                TPS (Transactions/sec)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {blockHistory.length > 1 
                  ? (networkInfo.txCount / ((blockHistory[0].timestamp - blockHistory[blockHistory.length - 1].timestamp) / (blockHistory.length - 1))).toFixed(1)
                  : (networkInfo.txCount / 12).toFixed(1)}
              </div>
              <div className="text-xs text-blue-300/70 mt-1">Network throughput</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-green-400 flex items-center gap-2">
                <Coins className="w-4 h-4" />
                Total TX Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {transactions.reduce((sum, tx) => sum + parseFloat(tx.value || '0'), 0).toFixed(2)}
                <span className="text-lg ml-1 text-green-300">ETH</span>
              </div>
              <div className="text-xs text-green-300/70 mt-1">Current batch</div>
            </CardContent>
          </Card>
        </div>

        {/* Block Stats Comparison */}
        <Card className="bg-gradient-to-br from-[#3d2f22] to-[#2d1f16] border-[#8B4513]/40 mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-[#fb923c] flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Block Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#2d1f16] rounded-lg p-3 border border-[rgba(249, 115, 22, 0.2)]">
                <div className="text-xs text-[#9a6b3e] mb-1">Avg Gas/Block</div>
                <div className="text-xl font-bold text-white">
                  {blockHistory.length > 0 
                    ? (blockHistory.reduce((sum, b) => sum + parseInt(b.gasUsed), 0) / blockHistory.length / 1e6).toFixed(2)
                    : '0'} M
                </div>
              </div>
              <div className="bg-[#2d1f16] rounded-lg p-3 border border-[rgba(249, 115, 22, 0.2)]">
                <div className="text-xs text-[#9a6b3e] mb-1">Avg TX/Block</div>
                <div className="text-xl font-bold text-white">
                  {blockHistory.length > 0 
                    ? Math.round(blockHistory.reduce((sum, b) => sum + b.txCount, 0) / blockHistory.length)
                    : '0'}
                </div>
              </div>
              <div className="bg-[#2d1f16] rounded-lg p-3 border border-[rgba(249, 115, 22, 0.2)]">
                <div className="text-xs text-[#9a6b3e] mb-1">Peak TX Count</div>
                <div className="text-xl font-bold text-yellow-400">
                  {blockHistory.length > 0 
                    ? Math.max(...blockHistory.map(b => b.txCount))
                    : '0'}
                </div>
              </div>
              <div className="bg-[#2d1f16] rounded-lg p-3 border border-[rgba(249, 115, 22, 0.2)]">
                <div className="text-xs text-[#9a6b3e] mb-1">Gas Utilization</div>
                <div className="text-xl font-bold text-cyan-400">
                  {blockHistory.length > 0 && blockHistory[0] 
                    ? ((parseInt(blockHistory[0].gasUsed) / parseInt(blockHistory[0].gasLimit)) * 100).toFixed(1)
                    : '0'}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mempool Statistics with Enhanced Features */}
        <Card className="bg-gradient-to-br from-[#3d2f22] to-[#2d1f16] border-[#8B4513]/40 mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-[#fb923c] flex items-center gap-2">
                <Database className="w-5 h-5" />
                Mempool Statistics & Fee Estimator
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-[#9a6b3e]">
                  <Settings className="w-4 h-4" />
                  <span>Refresh:</span>
                  <select 
                    value={refreshRate} 
                    onChange={(e) => setRefreshRate(Number(e.target.value))}
                    className="bg-[#2d1f16] border border-[rgba(249, 115, 22, 0.3)] rounded px-2 py-1 text-white text-xs"
                  >
                    <option value="3000">3s</option>
                    <option value="5000">5s</option>
                    <option value="10000">10s</option>
                    <option value="15000">15s</option>
                    <option value="30000">30s</option>
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Mempool Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-[#2d1f16] border border-[rgba(249, 115, 22, 0.3)] rounded-lg p-4">
                <div className="text-sm text-[#fb923c] mb-2">Pending Transactions</div>
                <div className="text-2xl font-bold text-white">{mempoolStats.pendingCount.toLocaleString()}</div>
                <div className="text-xs text-[#9a6b3e] mt-1">Waiting to be mined</div>
              </div>
              <div className="bg-[#2d1f16] border border-[rgba(249, 115, 22, 0.3)] rounded-lg p-4">
                <div className="text-sm text-[#fb923c] mb-2">Average Gas Price</div>
                <div className="text-2xl font-bold text-white">
                  {parseFloat(mempoolStats.avgGasPrice).toFixed(2)} 
                  <span className="text-sm ml-1 text-[#9a6b3e]">Gwei</span>
                </div>
                <div className="text-xs text-[#9a6b3e] mt-1">In mempool</div>
              </div>
              <div className="bg-[#2d1f16] border border-[rgba(249, 115, 22, 0.3)] rounded-lg p-4">
                <div className="text-sm text-[#fb923c] mb-2">Total ETH Value</div>
                <div className="text-2xl font-bold text-white">
                  {mempoolStats.totalValue} 
                  <span className="text-sm ml-1 text-[#9a6b3e]">ETH</span>
                </div>
                <div className="text-xs text-[#9a6b3e] mt-1">Pending transfers</div>
              </div>
            </div>

            {/* Transaction Fee Estimator */}
            <div className="border-t border-[rgba(249, 115, 22, 0.3)] pt-4">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-[#fb923c]" />
                <h3 className="text-[#fb923c] font-semibold">Transaction Fee Estimator</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Slow */}
                <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-blue-400 font-semibold">🐢 Slow</span>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">~30 min</Badge>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{gasEstimate.slow}</div>
                  <div className="text-xs text-blue-400">Gwei</div>
                  <div className="text-xs text-blue-400/60 mt-2">
                    Est. cost: ${(gasEstimate.slow * 21000 * 0.000000001 * 2500).toFixed(2)}
                  </div>
                </div>

                {/* Standard */}
                <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-green-400 font-semibold">⚡ Standard</span>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">~3 min</Badge>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{gasEstimate.standard}</div>
                  <div className="text-xs text-green-400">Gwei</div>
                  <div className="text-xs text-green-400/60 mt-2">
                    Est. cost: ${(gasEstimate.standard * 21000 * 0.000000001 * 2500).toFixed(2)}
                  </div>
                </div>

                {/* Fast */}
                <div className="bg-gradient-to-br from-orange-900/20 to-orange-800/10 border border-orange-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-orange-400 font-semibold">🚀 Fast</span>
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">~30 sec</Badge>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{gasEstimate.fast}</div>
                  <div className="text-xs text-orange-400">Gwei</div>
                  <div className="text-xs text-orange-400/60 mt-2">
                    Est. cost: ${(gasEstimate.fast * 21000 * 0.000000001 * 2500).toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="text-xs text-[#9a6b3e] mt-4 text-center">
                * Estimates based on 21000 gas (standard ETH transfer) @ $2500/ETH
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interactive Mempool Visualization */}
        <div className="mb-6">
          <MempoolViz transactions={transactions} mempoolStats={mempoolStats} />
        </div>

        {/* Enhanced Wallet Balance Tracker */}
        <div className="mb-6">
          <WalletTracker ethPrice={ethPrice || undefined} />
        </div>

        {/* Gas Price Chart */}
        {gasPriceHistory.length > 0 && (
          <Card className="bg-[#2d1f16] border-[rgba(249, 115, 22, 0.3)] mb-6">
            <CardHeader>
              <CardTitle className="text-lg text-[#fb923c] flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Gas Price History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={gasPriceHistory}>
                    <defs>
                      <linearGradient id="gasGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(249, 115, 22, 0.3)" />
                    <XAxis 
                      dataKey="blockNumber" 
                      stroke="#9a6b3e"
                      tick={{ fill: '#9a6b3e', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="#9a6b3e"
                      tick={{ fill: '#9a6b3e', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #f97316', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="gasPrice" 
                      stroke="#f97316" 
                      strokeWidth={2}
                      fill="url(#gasGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Block History - Exact Mempool Style */}
        <Card className="bg-[#2d1f16] border-[rgba(249, 115, 22, 0.3)] mb-6" data-block-history>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-[#fb923c] flex items-center gap-2">
                <Database className="w-5 h-5" />
                Recent Blocks
              </CardTitle>
              <Badge variant="outline" className="border-[#f97316] text-[#fb923c]">
                🔍 Click any block to view details
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {blockHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="animate-pulse mb-2">
                  <Box className="w-12 h-12 mx-auto text-[rgba(249, 115, 22, 0.3)]" />
                </div>
                <div>Loading blocks...</div>
                <div className="text-xs mt-2">Waiting for new blocks to arrive</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2">
                {blockHistory.map((blk) => {
                  const gasPercentage = (parseInt(blk.gasUsed) / parseInt(blk.gasLimit)) * 100;
                  const isFullBlock = gasPercentage > 90;
                  
                  return (
                    <div
                      key={blk.hash}
                      onClick={() => openBlockDetails(blk)}
                      className="relative overflow-hidden bg-gradient-to-br from-[rgba(249, 115, 22, 0.3)] to-[#1a1a1a] border border-[#f97316] rounded-lg p-3 hover:border-[#fbbf24] hover:shadow-xl hover:shadow-[#f97316]/40 hover:scale-105 transition-all cursor-pointer group"
                      data-block-card
                      title="Click to view block details"
                    >
                      {/* Gas Usage Background Indicator */}
                      <div 
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#f97316]/30 to-transparent transition-all"
                        style={{ height: `${gasPercentage}%` }}
                      />
                      
                      <div className="relative z-10 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <Badge 
                            variant="outline" 
                            className={`text-xs border-[#f97316] ${isFullBlock ? 'text-yellow-400' : 'text-[#fb923c]'}`}
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            {getBlockAge(blk.timestamp)}
                          </Badge>
                        </div>
                        
                        <div className="text-2xl font-bold text-white group-hover:text-[#fb923c] transition-colors">
                          {blk.number.toLocaleString()}
                        </div>
                        
                        <div className="text-xs text-[#fb923c] space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              TXs:
                            </span>
                            <span className="text-white font-semibold">{blk.txCount}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              Gas:
                            </span>
                            <span className="text-white font-semibold">{(parseInt(blk.gasUsed) / 1e6).toFixed(1)}M</span>
                          </div>
                        </div>
                        
                        <div className="text-xs text-[#9a6b3e] truncate font-mono flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {blk.miner.slice(0, 10)}...
                        </div>

                        {/* Gas usage indicator bar */}
                        <div className="w-full h-1 bg-[#3d2f22] rounded-full overflow-hidden mt-1">
                          <div 
                            className={`h-full transition-all ${
                              gasPercentage > 90 ? 'bg-yellow-400' : 
                              gasPercentage > 70 ? 'bg-blue-400' : 
                              'bg-green-400'
                            }`}
                            style={{ width: `${gasPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card className="bg-[#2d1f16] border-[rgba(249, 115, 22, 0.3)]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-[#fb923c] flex items-center gap-2">
                <Coins className="w-5 h-5" />
                {walletFilter ? 'Filtered Transactions' : 'Recent Transactions'}
              </CardTitle>
              {walletFilter && (
                <Badge className="bg-[rgba(249, 115, 22, 0.3)] text-[#fb923c] border-[#f97316]">
                  Tracking: {truncateHash(walletFilter)}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {transactions.length === 0 ? 'Waiting for transactions...' : 'No transactions match your filters'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(249, 115, 22, 0.3)]">
                      <th className="text-left py-3 px-2 text-[#fb923c]">
                        <Hash className="w-4 h-4 inline mr-1" />
                        Tx Hash
                      </th>
                      <th className="text-left py-3 px-2 text-[#fb923c]">From</th>
                      <th className="text-left py-3 px-2 text-[#fb923c]">To</th>
                      <th className="text-right py-3 px-2 text-[#fb923c]">Value (ETH)</th>
                      <th className="text-right py-3 px-2 text-[#fb923c]">Gas (Gwei)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx) => (
                      <tr 
                        key={tx.hash} 
                        className="border-b border-[#1a1a1a] hover:bg-[#3d2f22] transition-colors cursor-pointer group"
                        onClick={() => setSelectedTx(tx)}
                      >
                        <td className="py-3 px-2">
                          <code className="text-xs text-[#fb923c] group-hover:text-white font-mono">
                            {truncateHash(tx.hash)}
                          </code>
                        </td>
                        <td className="py-3 px-2">
                          <code className="text-xs text-gray-300 font-mono">{truncateHash(tx.from)}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-5 w-5 p-0 text-[#fb923c] hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              trackWallet(tx.from);
                            }}
                          >
                            <Wallet className="w-3 h-3" />
                          </Button>
                        </td>
                        <td className="py-3 px-2">
                          {tx.to === 'Contract Creation' ? (
                            <Badge variant="outline" className="text-xs border-[#f97316] text-yellow-400">
                              Contract
                            </Badge>
                          ) : (
                            <>
                              <code className="text-xs text-gray-300 font-mono">{truncateHash(tx.to)}</code>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-2 h-5 w-5 p-0 text-[#fb923c] hover:text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  trackWallet(tx.to);
                                }}
                              >
                                <Wallet className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right text-white font-mono">
                          {parseFloat(tx.value).toFixed(4)}
                        </td>
                        <td className="py-3 px-2 text-right text-white font-mono">
                          {parseFloat(tx.gasPrice).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Transaction Details Modal */}
      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent className="bg-[#2d1f16] border-[#f97316] text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#fb923c]">Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-[#fb923c]">Transaction Hash</span>
                  <code className="text-sm text-white bg-[#3d2f22] p-3 rounded border border-[rgba(249, 115, 22, 0.3)] break-all font-mono">
                    {selectedTx.hash}
                  </code>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-[#fb923c]">Block Number</span>
                    <span className="text-white font-mono text-lg">{selectedTx.blockNumber.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-[#fb923c]">Nonce</span>
                    <span className="text-white font-mono text-lg">{selectedTx.nonce}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#fb923c]">From</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => trackWallet(selectedTx.from)}
                      className="border-[rgba(249, 115, 22, 0.3)] hover:bg-[#3d2f22] text-[#fb923c]"
                    >
                      <Wallet className="w-3 h-3 mr-2" />
                      Track Wallet
                    </Button>
                  </div>
                  <code className="text-sm text-white bg-[#3d2f22] p-3 rounded border border-[rgba(249, 115, 22, 0.3)] break-all font-mono">
                    {selectedTx.from}
                  </code>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#fb923c]">To</span>
                    {selectedTx.to !== 'Contract Creation' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => trackWallet(selectedTx.to)}
                        className="border-[rgba(249, 115, 22, 0.3)] hover:bg-[#3d2f22] text-[#fb923c]"
                      >
                        <Wallet className="w-3 h-3 mr-2" />
                        Track Wallet
                      </Button>
                    )}
                  </div>
                  <code className="text-sm text-white bg-[#3d2f22] p-3 rounded border border-[rgba(249, 115, 22, 0.3)] break-all font-mono">
                    {selectedTx.to}
                  </code>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-[#fb923c]">Value</span>
                    <span className="text-white font-mono text-2xl">{parseFloat(selectedTx.value).toFixed(6)} ETH</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-[#fb923c]">Gas Price</span>
                    <span className="text-white font-mono text-2xl">{parseFloat(selectedTx.gasPrice).toFixed(4)} Gwei</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-[#fb923c]">Gas Limit</span>
                  <span className="text-white font-mono text-lg">{selectedTx.gasLimit.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Block Details Modal */}
      <Dialog open={!!selectedBlock} onOpenChange={() => setSelectedBlock(null)}>
        <DialogContent className="bg-gradient-to-br from-[#2d1f16] to-[#1a0f0a] border-[#f97316] text-white max-w-6xl max-h-[90vh] overflow-y-auto" data-block-modal>
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#fb923c] flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#f97316] to-[#fbbf24] flex items-center justify-center">
                <Box className="w-6 h-6 text-white" />
              </div>
              Block #{selectedBlock?.number.toLocaleString()}
              {selectedBlock && (
                <Badge variant="outline" className="border-green-500/50 text-green-400 ml-2">
                  ✓ Confirmed
                </Badge>
              )}
            </DialogTitle>
            <p className="text-sm text-[#9a6b3e] mt-2">
              Complete block information and transaction list
            </p>
          </DialogHeader>
          {selectedBlock && (
            <div className="space-y-6">
              {/* Block Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-[#3d2f22] to-[#2d1f16] border-[#8B4513]/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-[#fb923c] flex items-center gap-2">
                      <Box className="w-4 h-4" />
                      Block Height
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{selectedBlock.number.toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-[#3d2f22] to-[#2d1f16] border-[#8B4513]/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-[#fb923c] flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Transactions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{selectedBlock.txCount}</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-[#3d2f22] to-[#2d1f16] border-[#8B4513]/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-[#fb923c] flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Gas Used
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">
                      {((parseInt(selectedBlock.gasUsed) / parseInt(selectedBlock.gasLimit)) * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-[#9a6b3e] mt-1">
                      {(parseInt(selectedBlock.gasUsed) / 1e6).toFixed(2)}M / {(parseInt(selectedBlock.gasLimit) / 1e6).toFixed(2)}M
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Block Details */}
              <Card className="bg-[#3d2f22] border-[rgba(249, 115, 22, 0.3)]">
                <CardHeader>
                  <CardTitle className="text-lg text-[#fb923c]">Block Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <span className="text-[#fb923c]">Block Hash</span>
                      <div className="text-white bg-[#2d1f16] p-2 rounded border border-[rgba(249, 115, 22, 0.3)] font-mono text-xs break-all">
                        {selectedBlock.hash}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[#fb923c]">Timestamp</span>
                      <div className="text-white">
                        {formatTimestamp(selectedBlock.timestamp)}
                        <div className="text-xs text-[#9a6b3e] mt-1">({getBlockAge(selectedBlock.timestamp)} ago)</div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[#fb923c]">Miner</span>
                      <div className="flex items-center gap-2">
                        <code className="text-white bg-[#2d1f16] p-2 rounded border border-[rgba(249, 115, 22, 0.3)] font-mono text-xs flex-1 break-all">
                          {selectedBlock.miner}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#fb923c] hover:text-white"
                          onClick={() => trackWallet(selectedBlock.miner)}
                        >
                          <Wallet className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[#fb923c]">Difficulty</span>
                      <div className="text-white font-mono">{selectedBlock.difficulty}</div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[#fb923c]">Gas Used</span>
                      <div className="text-white font-mono">{parseInt(selectedBlock.gasUsed).toLocaleString()}</div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[#fb923c]">Gas Limit</span>
                      <div className="text-white font-mono">{parseInt(selectedBlock.gasLimit).toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Gas Usage Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#fb923c]">Gas Usage</span>
                      <span className="text-white">
                        {((parseInt(selectedBlock.gasUsed) / parseInt(selectedBlock.gasLimit)) * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-[#2d1f16] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#f97316] to-[#fbbf24] transition-all"
                        style={{ width: `${(parseInt(selectedBlock.gasUsed) / parseInt(selectedBlock.gasLimit)) * 100}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transactions in Block */}
              <Card className="bg-[#3d2f22] border-[rgba(249, 115, 22, 0.3)]">
                <CardHeader>
                  <CardTitle className="text-lg text-[#fb923c]">
                    Transactions ({selectedBlock.txCount})
                  </CardTitle>
                  {selectedBlock.transactions.length > 20 && (
                    <p className="text-sm text-[#9a6b3e]">Showing first 20 of {selectedBlock.txCount} transactions</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedBlock.transactions.slice(0, 20).map((txHash, idx) => (
                      <div
                        key={txHash}
                        className="flex items-center justify-between p-3 bg-[#2d1f16] hover:bg-[rgba(249, 115, 22, 0.3)] border border-[rgba(249, 115, 22, 0.3)] rounded transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="border-[#f97316] text-[#fb923c]">
                            #{idx + 1}
                          </Badge>
                          <code className="text-xs text-white font-mono">{truncateHash(txHash)}</code>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#fb923c] hover:text-white"
                          onClick={() => {
                            const tx = transactions.find(t => t.hash === txHash);
                            if (tx) {
                              setSelectedTx(tx);
                              setSelectedBlock(null);
                            }
                          }}
                        >
                          View Details →
                        </Button>
                      </div>
                    ))}
                    
                    {blockTransactions.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm text-[#fb923c] mb-3">Transaction Details Available</h4>
                        <div className="space-y-2">
                          {blockTransactions.map((tx) => (
                            <div
                              key={tx.hash}
                              onClick={() => {
                                setSelectedTx(tx);
                                setSelectedBlock(null);
                              }}
                              className="p-3 bg-[#2d1f16] hover:bg-[rgba(249, 115, 22, 0.3)] border border-[rgba(249, 115, 22, 0.3)] rounded cursor-pointer transition-colors"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <code className="text-xs text-[#fb923c] font-mono">{truncateHash(tx.hash)}</code>
                                <span className="text-white font-mono text-sm">{parseFloat(tx.value).toFixed(4)} ETH</span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-[#9a6b3e]">
                                <span>From: {truncateHash(tx.from)}</span>
                                <span>To: {tx.to === 'Contract Creation' ? 'Contract' : truncateHash(tx.to)}</span>
                                <span>Gas: {parseFloat(tx.gasPrice).toFixed(2)} Gwei</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Wallet Tracking Dialog */}
      <Dialog open={showWalletDialog} onOpenChange={setShowWalletDialog}>
        <DialogContent className="bg-[#2d1f16] border-[#f97316] text-white max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#fb923c]">Track Wallet Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#9a6b3e]">
              Enter an Ethereum address to fetch balance and recent transactions.
            </p>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="0x..."
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && trackWallet(walletAddress)}
                className="bg-[#3d2f22] border-[rgba(249, 115, 22, 0.3)] text-white font-mono"
              />
              <Button
                onClick={() => trackWallet(walletAddress)}
                disabled={loadingWallet || !walletAddress}
                className="bg-[#f97316] hover:bg-[#fbbf24] text-white"
              >
                {loadingWallet ? 'Loading...' : 'Track'}
              </Button>
            </div>
            
            {walletData && (
              <div className="space-y-4 mt-6">
                <div className="bg-[#3d2f22] border border-[rgba(249, 115, 22, 0.3)] rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-[#9a6b3e] mb-1">Balance</div>
                      <div className="text-2xl font-bold text-[#fb923c]">{parseFloat(walletData.balance).toFixed(4)} ETH</div>
                    </div>
                    <div>
                      <div className="text-sm text-[#9a6b3e] mb-1">Total Transactions</div>
                      <div className="text-2xl font-bold text-white">{walletData.txCount.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="text-xs text-[#9a6b3e] border-t border-[rgba(249, 115, 22, 0.2)] pt-2">
                    Address: <code className="text-white font-mono text-xs">{walletData.address}</code>
                  </div>
                  {walletData.note && (
                    <div className="text-xs text-yellow-400 mt-2">
                      ℹ️ {walletData.note}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-[#fb923c] mb-3">Recent Transactions ({walletData.transactions.length})</h3>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {walletData.transactions.map((tx: any) => (
                      <div 
                        key={tx.hash}
                        className="bg-[#3d2f22] border border-[rgba(249, 115, 22, 0.3)] rounded-lg p-3 hover:bg-[rgba(249, 115, 22, 0.1)] transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {tx.type === 'sent' ? (
                              <ArrowUpRight className="w-4 h-4 text-red-400" />
                            ) : (
                              <ArrowDownLeft className="w-4 h-4 text-green-400" />
                            )}
                            <Badge className={tx.type === 'sent' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}>
                              {tx.type.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-[#fb923c] font-semibold">{parseFloat(tx.value).toFixed(4)} ETH</div>
                        </div>
                        <div className="text-xs text-[#9a6b3e] space-y-1">
                          <div>Hash: <code className="text-white">{truncateHash(tx.hash)}</code></div>
                          <div className="flex justify-between">
                            <span>Block: #{tx.blockNumber.toLocaleString()}</span>
                            <span>Gas: {parseFloat(tx.gasPrice).toFixed(2)} Gwei</span>
                            <span>{format(new Date(tx.timestamp * 1000), 'PPp')}</span>
                          </div>
                          <div>
                            {tx.type === 'sent' ? 'To: ' : 'From: '}
                            <code className="text-white">{truncateHash(tx.type === 'sent' ? tx.to : tx.from)}</code>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Search Result Dialog */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="bg-[#2d1f16] border-[#f97316] text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#fb923c] flex items-center gap-2">
              <Hash className="w-5 h-5" />
              Transaction Details
            </DialogTitle>
          </DialogHeader>
          {searchResult && (
            <div className="space-y-4">
              {searchResult.error ? (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-center">
                  <XCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
                  <div className="text-red-400 font-semibold">{searchResult.error}</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Status and Type Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {searchResult.status === 'Success' && <CheckCircle className="w-5 h-5 text-green-400" />}
                    {searchResult.status === 'Failed' && <XCircle className="w-5 h-5 text-red-400" />}
                    {searchResult.status === 'Pending' && <Clock className="w-5 h-5 text-yellow-400" />}
                    <Badge className={
                      searchResult.status === 'Success' ? 'bg-green-500/20 text-green-400' :
                      searchResult.status === 'Failed' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }>
                      {searchResult.status}
                    </Badge>
                    {searchResult.isContractCreation && (
                      <Badge className="bg-purple-500/20 text-purple-400">
                        Contract Creation
                      </Badge>
                    )}
                    {searchResult.isContractInteraction && !searchResult.isContractCreation && (
                      <Badge className="bg-blue-500/20 text-blue-400">
                        Contract Interaction
                      </Badge>
                    )}
                  </div>

                  <div className="bg-[#3d2f22] border border-[rgba(249, 115, 22, 0.3)] rounded-lg p-3">
                    <div className="text-xs text-[#9a6b3e] mb-1">Transaction Hash</div>
                    <code className="text-sm text-white font-mono break-all">{searchResult.hash}</code>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#3d2f22] border border-[rgba(249, 115, 22, 0.3)] rounded-lg p-3">
                      <div className="text-xs text-[#9a6b3e] mb-1">Block Number</div>
                      <div className="text-lg font-semibold text-white">{searchResult.blockNumber?.toLocaleString() || 'Pending'}</div>
                    </div>
                    <div className="bg-[#3d2f22] border border-[rgba(249, 115, 22, 0.3)] rounded-lg p-3">
                      <div className="text-xs text-[#9a6b3e] mb-1">Nonce</div>
                      <div className="text-lg font-semibold text-white">{searchResult.nonce}</div>
                    </div>
                    <div className="bg-[#3d2f22] border border-[rgba(249, 115, 22, 0.3)] rounded-lg p-3">
                      <div className="text-xs text-[#9a6b3e] mb-1">Timestamp</div>
                      <div className="text-xs text-white">
                        {searchResult.timestamp ? format(new Date(searchResult.timestamp * 1000), 'PPp') : 'Pending'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#3d2f22] border border-[rgba(249, 115, 22, 0.3)] rounded-lg p-3">
                    <div className="text-xs text-[#9a6b3e] mb-1">From</div>
                    <code className="text-sm text-white font-mono break-all">{searchResult.from}</code>
                  </div>

                  <div className="bg-[#3d2f22] border border-[rgba(249, 115, 22, 0.3)] rounded-lg p-3">
                    <div className="text-xs text-[#9a6b3e] mb-1">To {searchResult.isContractCreation && '(New Contract)'}</div>
                    <code className="text-sm text-white font-mono break-all">{searchResult.to}</code>
                    {searchResult.contractAddress && (
                      <div className="mt-2 pt-2 border-t border-[rgba(249, 115, 22, 0.2)]">
                        <div className="text-xs text-purple-400 mb-1">Contract Address</div>
                        <code className="text-sm text-purple-300 font-mono break-all">{searchResult.contractAddress}</code>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#3d2f22] border border-[rgba(249, 115, 22, 0.3)] rounded-lg p-3">
                      <div className="text-xs text-[#9a6b3e] mb-1">Value</div>
                      <div className="text-xl font-bold text-[#fb923c]">{parseFloat(searchResult.value).toFixed(6)} ETH</div>
                    </div>
                    <div className="bg-[#3d2f22] border border-[rgba(249, 115, 22, 0.3)] rounded-lg p-3">
                      <div className="text-xs text-[#9a6b3e] mb-1">Gas Price</div>
                      <div className="text-xl font-bold text-white">{parseFloat(searchResult.gasPrice).toFixed(4)} Gwei</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#3d2f22] border border-[rgba(249, 115, 22, 0.3)] rounded-lg p-3">
                      <div className="text-xs text-[#9a6b3e] mb-1">Gas Limit</div>
                      <div className="text-lg text-white">{searchResult.gasLimit.toLocaleString()}</div>
                    </div>
                    <div className="bg-[#3d2f22] border border-[rgba(249, 115, 22, 0.3)] rounded-lg p-3">
                      <div className="text-xs text-[#9a6b3e] mb-1">Gas Used</div>
                      <div className="text-lg text-white">{searchResult.gasUsed === 'Pending' ? 'Pending' : searchResult.gasUsed.toLocaleString()}</div>
                    </div>
                    <div className="bg-[#3d2f22] border border-[rgba(249, 115, 22, 0.3)] rounded-lg p-3">
                      <div className="text-xs text-[#9a6b3e] mb-1">Transaction Fee</div>
                      <div className="text-lg text-yellow-400">
                        {searchResult.gasUsed !== 'Pending' 
                          ? ((parseFloat(searchResult.gasUsed) * parseFloat(searchResult.gasPrice)) / 1e9).toFixed(6) + ' ETH'
                          : 'Pending'}
                      </div>
                    </div>
                  </div>

                  {/* Input Data */}
                  {searchResult.isContractInteraction && (
                    <div className="bg-[#3d2f22] border border-[rgba(249, 115, 22, 0.3)] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-[#9a6b3e]">Input Data</div>
                        <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                          {searchResult.inputLength} bytes
                        </Badge>
                      </div>
                      <code className="text-xs text-white font-mono break-all block max-h-24 overflow-y-auto">
                        {searchResult.input.slice(0, 200)}...
                      </code>
                    </div>
                  )}

                  {/* Token Transfers */}
                  {searchResult.tokenTransfers && searchResult.tokenTransfers.length > 0 && (
                    <div className="bg-gradient-to-br from-green-900/20 to-blue-900/20 border border-green-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Coins className="w-5 h-5 text-green-400" />
                        <h3 className="text-lg font-semibold text-green-400">Token Transfers ({searchResult.tokenTransfers.length})</h3>
                      </div>
                      <div className="space-y-2">
                        {searchResult.tokenTransfers.map((transfer: any, idx: number) => (
                          <div key={idx} className="bg-[#2d1f16]/50 border border-green-500/20 rounded p-3">
                            <div className="flex items-center justify-between mb-2">
                              <Badge className="bg-green-500/20 text-green-400">{transfer.type}</Badge>
                              <div className="text-green-400 font-semibold">{transfer.valueFormatted} Tokens</div>
                            </div>
                            <div className="text-xs text-gray-400 space-y-1">
                              <div>Token: <code className="text-green-300">{transfer.tokenAddress}</code></div>
                              <div>From: <code className="text-white">{transfer.from}</code></div>
                              <div>To: <code className="text-white">{transfer.to}</code></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Event Logs */}
                  {searchResult.logCount > 0 && (
                    <div className="bg-[#3d2f22] border border-[rgba(249, 115, 22, 0.3)] rounded-lg p-3">
                      <div className="text-xs text-[#9a6b3e] mb-1">Event Logs</div>
                      <div className="text-lg text-white">{searchResult.logCount} events emitted</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Block History Dialog */}
      <Dialog open={showBlockHistory} onOpenChange={setShowBlockHistory}>
        <DialogContent className="bg-[#2d1f16] border-[#8B4513] text-white max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#B8860B] flex items-center gap-2">
              <Database className="w-6 h-6" />
              Block Explorer History
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-400">
              Showing last {blockHistory.length} blocks on Ethereum Mainnet
            </div>
            
            <div className="space-y-2">
              {blockHistory.map((blk, idx) => (
                <div 
                  key={blk.hash}
                  className="bg-gradient-to-r from-[#1a1a1a] to-[#0f0f0f] border border-[#8B4513]/30 rounded-lg p-4 hover:border-[#B8860B]/50 transition-all cursor-pointer"
                  onClick={() => openBlockDetails(blk)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-[#8B4513]/20 text-[#D2B48C] border-[#8B4513]/30 text-lg font-mono">
                        #{blk.number.toLocaleString()}
                      </Badge>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {getBlockAge(blk.timestamp)} ago
                      </div>
                      {idx === 0 && (
                        <Badge className="bg-green-500/20 text-green-400 text-xs">Latest</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-[#B8860B]">
                        <Activity className="w-4 h-4 inline mr-1" />
                        {blk.txCount} TXs
                      </div>
                      <div className="text-[#D2B48C]">
                        {(parseInt(blk.gasUsed) / 1e6).toFixed(2)}M Gas
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="text-gray-500 mb-1">Block Hash</div>
                      <code className="text-[#B8860B] font-mono text-xs">{truncateHash(blk.hash)}</code>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Miner</div>
                      <code className="text-gray-300 font-mono text-xs">{truncateHash(blk.miner)}</code>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <div>Gas Limit: {(parseInt(blk.gasLimit) / 1e6).toFixed(0)}M</div>
                      <div>Utilization: {((parseInt(blk.gasUsed) / parseInt(blk.gasLimit)) * 100).toFixed(1)}%</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#8B4513]/30 hover:bg-[#8B4513]/10 text-[#B8860B] text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        openBlockDetails(blk);
                      }}
                    >
                      View Details →
                    </Button>
                  </div>

                  {/* Progress bar for gas utilization */}
                  <div className="mt-3 w-full h-1.5 bg-[#3d2f22] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#8B4513] to-[#B8860B] transition-all"
                      style={{ width: `${(parseInt(blk.gasUsed) / parseInt(blk.gasLimit)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {blockHistory.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Database className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <div>No block history available yet</div>
                <div className="text-sm mt-2">Blocks will appear as they are fetched</div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a] bg-[#2d1f16] mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-[#9a6b3e]">
          <p>
            Real-time Ethereum Mainnet Explorer
          </p>
        </div>
      </footer>
    </div>
  );
};

export default EthereumViz;
