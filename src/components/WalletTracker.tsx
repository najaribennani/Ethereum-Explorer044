import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Wallet, Search, TrendingUp, TrendingDown, Activity, Clock, DollarSign, ArrowUpRight, ArrowDownLeft, Copy, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface WalletData {
  address: string;
  balance: string;
  balanceUsd: string;
  txCount: number;
  firstSeen: number;
  lastActivity: number;
  tokens?: Array<{
    symbol: string;
    name: string;
    balance: string;
    value: string;
  }>;
  recentTransactions: Array<{
    hash: string;
    type: 'send' | 'receive';
    value: string;
    timestamp: number;
    from: string;
    to: string;
    status: 'success' | 'failed';
  }>;
}

interface WalletTrackerProps {
  ethPrice?: { usd: number };
}

export const WalletTracker: React.FC<WalletTrackerProps> = ({ ethPrice }) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const trackWallet = async () => {
    if (!walletAddress || walletAddress.length !== 42) {
      setError('Please enter a valid Ethereum address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ethereum/wallet/${walletAddress}`);
      if (response.ok) {
        const data = await response.json();
        setWalletData(data);
      } else {
        setError('Failed to fetch wallet data');
      }
    } catch (err) {
      setError('Error fetching wallet data');
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Card className="bg-gradient-to-br from-[#3d2f22] to-[#2d1f16] border-[#8B4513]/40" data-wallet-tracker>
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Wallet className="w-5 h-5 text-green-400" />
          Wallet Balance Tracker
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter wallet address (0x...)"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="bg-[#1a0f0a] border-[#8B4513]/40 text-white placeholder:text-gray-500"
              data-wallet-input
            />
            <Button
              onClick={trackWallet}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-track-button
            >
              {loading ? (
                <Activity className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {error && (
            <div className="text-red-400 text-sm p-3 bg-red-500/10 rounded-lg border border-red-500/30">
              {error}
            </div>
          )}

          {/* Wallet Data Display */}
          {walletData && (
            <div className="space-y-4 animate-in fade-in duration-500">
              {/* Balance Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#1a0f0a] rounded-lg p-4 border border-[#8B4513]/30">
                  <div className="text-gray-400 text-sm mb-1">Balance</div>
                  <div className="text-2xl font-bold text-white flex items-center gap-2">
                    {parseFloat(walletData.balance).toFixed(4)} ETH
                  </div>
                  {ethPrice && (
                    <div className="text-green-400 text-sm mt-1">
                      ≈ ${(parseFloat(walletData.balance) * ethPrice.usd).toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="bg-[#1a0f0a] rounded-lg p-4 border border-[#8B4513]/30">
                  <div className="text-gray-400 text-sm mb-1">Transactions</div>
                  <div className="text-2xl font-bold text-white">
                    {walletData.txCount.toLocaleString()}
                  </div>
                  <div className="text-gray-500 text-sm mt-1">
                    Total count
                  </div>
                </div>
              </div>

              {/* Address Info */}
              <div className="bg-[#1a0f0a] rounded-lg p-4 border border-[#8B4513]/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Address</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyAddress(walletData.address)}
                    className="text-xs h-6 text-gray-400 hover:text-white"
                  >
                    {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
                <code className="text-white text-sm break-all">{walletData.address}</code>
              </div>

              {/* Activity Timeline */}
              <div className="bg-[#1a0f0a] rounded-lg p-4 border border-[#8B4513]/30">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-white font-semibold">Activity</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">First Seen</span>
                    <span className="text-white">
                      {walletData.firstSeen > 0 
                        ? format(new Date(walletData.firstSeen * 1000), 'MMM dd, yyyy')
                        : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Activity</span>
                    <span className="text-white">
                      {walletData.lastActivity > 0
                        ? format(new Date(walletData.lastActivity * 1000), 'MMM dd, yyyy HH:mm')
                        : 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              {walletData.recentTransactions && walletData.recentTransactions.length > 0 && (
                <div className="bg-[#1a0f0a] rounded-lg p-4 border border-[#8B4513]/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-gray-400" />
                    <span className="text-white font-semibold">Recent Transactions</span>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {walletData.recentTransactions.map((tx, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-2 rounded-lg bg-black/30 hover:bg-black/50 transition-colors"
                      >
                        <div className={`p-2 rounded-full ${
                          tx.type === 'receive' ? 'bg-green-500/20' : 'bg-red-500/20'
                        }`}>
                          {tx.type === 'receive' ? (
                            <ArrowDownLeft className="w-3 h-3 text-green-400" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 text-red-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${
                              tx.type === 'receive' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {tx.type === 'receive' ? '+' : '-'}{parseFloat(tx.value).toFixed(4)} ETH
                            </span>
                            <Badge variant={tx.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                              {tx.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {tx.type === 'receive' ? 'From' : 'To'}: {formatAddress(tx.type === 'receive' ? tx.from : tx.to)}
                          </div>
                          <div className="text-xs text-gray-600">
                            {format(new Date(tx.timestamp * 1000), 'MMM dd, HH:mm:ss')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Token Holdings (if available) */}
              {walletData.tokens && walletData.tokens.length > 0 && (
                <div className="bg-[#1a0f0a] rounded-lg p-4 border border-[#8B4513]/30">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-white font-semibold">Token Holdings</span>
                  </div>
                  <div className="space-y-2">
                    {walletData.tokens.map((token, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 rounded bg-black/30">
                        <div>
                          <div className="text-white font-semibold">{token.symbol}</div>
                          <div className="text-xs text-gray-500">{token.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-white">{token.balance}</div>
                          <div className="text-xs text-green-400">{token.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!walletData && !loading && !error && (
            <div className="text-center py-8 text-gray-500">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Enter a wallet address to track balance and transactions</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
