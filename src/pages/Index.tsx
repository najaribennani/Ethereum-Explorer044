import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Box, Zap, Activity, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

const Index = () => {
    const navigate = useNavigate();
    const [blocks, setBlocks] = useState<EthereumBlock[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchBlocks = async () => {
        try {
          const response = await fetch('/api/ethereum/snapshot');
          if (response.ok) {
            const data = await response.json();
            if (data.blockHistory) {
              setBlocks(data.blockHistory);
              setLoading(false);
            }
          }
        } catch (error) {
          console.error('Error fetching blocks:', error);
        }
      };

      fetchBlocks();
      const interval = setInterval(fetchBlocks, 15000); // Update every 15 seconds
      return () => clearInterval(interval);
    }, []);

    const getBlockAge = (timestamp: number) => {
      const now = Math.floor(Date.now() / 1000);
      const diff = now - timestamp;
      if (diff < 60) return `${diff}s ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      return `${Math.floor(diff / 3600)}h ago`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#1a0f0a] via-[#2d1810] to-[#1a0f0a] flex flex-col">
          {/* Horizontal Live Blocks Bar at Top - Blockchain Style with Chains */}
          <div className="w-full bg-gradient-to-b from-[#4a3428]/40 to-[#2d1f16]/40 backdrop-blur-sm border-b border-[#6b4423]/30 py-6 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center gap-0 overflow-x-auto pb-2">
                {loading ? (
                  <div className="text-orange-300/50 text-sm">Loading blocks...</div>
                ) : blocks.length > 0 ? (
                  <AnimatePresence>
                    {blocks.slice(0, 8).map((block, idx) => (
                      <motion.div
                        key={block.hash}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                        className="flex items-center flex-shrink-0"
                      >
                        {/* Block Card */}
                        <motion.div 
                          className="w-[100px] h-[100px] relative cursor-pointer group"
                          onClick={() => navigate('/ethereum')}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <div className="w-full h-full bg-gradient-to-br from-[#8b6f47] via-[#6b5333] to-[#4a3b2a] rounded-lg border-2 border-[#5a4632] shadow-xl hover:shadow-2xl hover:border-[#8b6f47] transition-all duration-300 relative overflow-hidden">
                            <motion.div 
                              className="absolute inset-[2px] bg-gradient-to-br from-[#7a5f3f]/30 to-transparent rounded-md"
                              animate={{ opacity: [0.3, 0.6, 0.3] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            ></motion.div>
                            
                            <div className="relative h-full flex flex-col items-center justify-center p-2 text-center">
                              <motion.div 
                                className="mb-2"
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                              >
                                <Box className="w-7 h-7 text-[#d4a574]" strokeWidth={2.5} />
                              </motion.div>
                              
                              <div className="text-[#e8d5b5] text-[9px] font-semibold tracking-wide mb-1">
                                Live Blocks
                              </div>
                              
                              <div className="absolute inset-0 bg-gradient-to-br from-[#4a3b2a]/95 via-[#3d2f22]/95 to-[#2d1f16]/95 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex flex-col items-center justify-center p-2">
                                <div className="text-[#d4a574] font-bold text-[10px] mb-1">
                                  #{block.number}
                                </div>
                                <div className="text-[#b8956d] text-[8px] mb-1">
                                  {getBlockAge(block.timestamp)}
                                </div>
                                <div className="text-[#9d8159] text-[8px] space-y-0.5">
                                  <div>{block.txCount} TXs</div>
                                  <div>{(parseInt(block.gasUsed) / 1e6).toFixed(1)}M Gas</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                        
                        {/* Chain Connection */}
                        {idx < blocks.slice(0, 8).length - 1 && (
                          <div className="flex items-center justify-center w-[30px] h-[100px]">
                            <div className="flex flex-col items-center gap-1">
                              {/* Chain links */}
                              <div className="w-[24px] h-[8px] border-2 border-[#8b6f47] rounded-full bg-[#5a4632]"></div>
                              <div className="w-[24px] h-[8px] border-2 border-[#8b6f47] rounded-full bg-[#5a4632]"></div>
                              <div className="w-[24px] h-[8px] border-2 border-[#8b6f47] rounded-full bg-[#5a4632]"></div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                ) : (
                  [...Array(8)].map((_, i) => (
                    <div 
                      key={i}
                      className="flex items-center flex-shrink-0"
                    >
                      <div 
                        className="w-[100px] h-[100px] relative cursor-pointer group"
                        onClick={() => navigate('/ethereum')}
                      >
                        <div className="w-full h-full bg-gradient-to-br from-[#8b6f47] via-[#6b5333] to-[#4a3b2a] rounded-lg border-2 border-[#5a4632] shadow-xl hover:shadow-2xl hover:border-[#8b6f47] transition-all duration-300 relative overflow-hidden">
                          <div className="absolute inset-[2px] bg-gradient-to-br from-[#7a5f3f]/30 to-transparent rounded-md"></div>
                          <div className="relative h-full flex flex-col items-center justify-center p-2 text-center">
                            <div className="mb-2">
                              <Box className="w-7 h-7 text-[#d4a574]" strokeWidth={2.5} />
                            </div>
                            <div className="text-[#e8d5b5] text-[9px] font-semibold tracking-wide">
                              Live Blocks
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {i < 7 && (
                        <div className="flex items-center justify-center w-[30px] h-[100px]">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-[24px] h-[8px] border-2 border-[#8b6f47] rounded-full bg-[#5a4632]"></div>
                            <div className="w-[24px] h-[8px] border-2 border-[#8b6f47] rounded-full bg-[#5a4632]"></div>
                            <div className="w-[24px] h-[8px] border-2 border-[#8b6f47] rounded-full bg-[#5a4632]"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="max-w-2xl text-center space-y-8">
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">
                Ethereum Network
                <br />
                <span className="bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
                  Explorer
                </span>
              </h1>
              <p className="text-xl text-orange-200 mb-8">
                Real-time blockchain monitoring and transaction tracking
              </p>
              <p className="text-lg text-orange-300/80 mb-12">
                Watch Ethereum blocks being mined in real-time, monitor network metrics, and explore the latest transactions.
              </p>
              
              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
                <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
                  <Box className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                  <h3 className="text-orange-300 font-semibold mb-1">Live Blocks</h3>
                  <p className="text-orange-400/70 text-sm">Real-time block updates</p>
                </div>
                <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
                  <Activity className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                  <h3 className="text-orange-300 font-semibold mb-1">Track Transactions</h3>
                  <p className="text-orange-400/70 text-sm">Monitor all TXs</p>
                </div>
                <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
                  <TrendingUp className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                  <h3 className="text-orange-300 font-semibold mb-1">Gas Analytics</h3>
                  <p className="text-orange-400/70 text-sm">Live gas price charts</p>
                </div>
              </div>

              <Button 
                onClick={() => navigate('/ethereum')}
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-black font-semibold px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-orange-500/50 transition-all"
              >
                Launch Explorer →
              </Button>
            </div>
            
            <footer className="mt-12 mb-8 text-center text-sm text-orange-300/70">
              <p>
                Real-time Ethereum Blockchain Explorer
              </p>
            </footer>
          </div>
        </div>
    );
  };
  
  export default Index;
  