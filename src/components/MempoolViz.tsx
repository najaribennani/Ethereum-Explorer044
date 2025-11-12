import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, DollarSign } from 'lucide-react';

interface Transaction {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  value: number;
  gasPrice: number;
  from: string;
  to: string;
  hash: string;
}

interface MempoolVizProps {
  transactions: any[];
  mempoolStats: {
    pendingCount: number;
    avgGasPrice: string;
    totalValue: string;
  };
}

export const MempoolViz: React.FC<MempoolVizProps> = ({ transactions, mempoolStats }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const txsRef = useRef<Transaction[]>([]);
  const [hoveredTx, setHoveredTx] = useState<Transaction | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const animationRef = useRef<number>();
  const [isPaused, setIsPaused] = useState(false);
  const [attractionMode, setAttractionMode] = useState(false);
  const [bubbleCount, setBubbleCount] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Initialize transactions - Larger bubbles for better visualization
    const initTxs: Transaction[] = [];
    // Show 50 larger bubbles
    const numTxs = 50;
    
    for (let i = 0; i < numTxs; i++) {
      const tx = transactions[i];
      const value = tx ? parseFloat(tx.value || '0') : Math.random() * 5;
      const gasPrice = tx ? parseFloat(tx.gasPrice || '0') : (Math.random() * 80 + 20);
      const size = Math.max(25, Math.min(45, Math.random() * 25 + 25)); // Larger bubbles
      
      initTxs.push({
        id: tx?.hash || `bubble-${i}`,
        x: Math.random() * (canvas.width - size * 2) + size,
        y: Math.random() * (canvas.height - size * 2) + size,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: size,
        value: value,
        gasPrice: gasPrice,
        from: tx?.from || `0x${Math.random().toString(16).substr(2, 40)}`,
        to: tx?.to || `0x${Math.random().toString(16).substr(2, 40)}`,
        hash: tx?.hash || `0x${Math.random().toString(16).substr(2, 64)}`,
      });
    }
    
    txsRef.current = initTxs;
    setBubbleCount(initTxs.length);
    console.log('✓ Initialized', initTxs.length, 'bubbles');

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (isPaused) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update positions first
      txsRef.current = txsRef.current.map((tx) => {
          let { x, y, vx, vy } = tx;

          // Update position
          x += vx;
          y += vy;

          // Bounce off edges
          if (x < tx.size || x > canvas.width - tx.size) {
            vx = -vx * 0.8;
            x = Math.max(tx.size, Math.min(canvas.width - tx.size, x));
          }
          if (y < tx.size || y > canvas.height - tx.size) {
            vy = -vy * 0.8;
            y = Math.max(tx.size, Math.min(canvas.height - tx.size, y));
          }

          // Apply slight friction
          vx *= 0.995;
          vy *= 0.995;

          return { ...tx, x, y, vx, vy };
      });

      // Collision detection between bubbles
      for (let i = 0; i < txsRef.current.length; i++) {
        for (let j = i + 1; j < txsRef.current.length; j++) {
          const tx1 = txsRef.current[i];
          const tx2 = txsRef.current[j];

          const dx = tx2.x - tx1.x;
          const dy = tx2.y - tx1.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDist = tx1.size + tx2.size;

          // If bubbles are overlapping
          if (distance < minDist) {
            // Calculate collision angle
            const angle = Math.atan2(dy, dx);
            
            // Move bubbles apart
            const overlap = minDist - distance;
            const separateX = overlap * Math.cos(angle) / 2;
            const separateY = overlap * Math.sin(angle) / 2;
            
            tx1.x -= separateX;
            tx1.y -= separateY;
            tx2.x += separateX;
            tx2.y += separateY;

            // Calculate new velocities (elastic collision)
            const v1 = { x: tx1.vx, y: tx1.vy };
            const v2 = { x: tx2.vx, y: tx2.vy };
            
            tx1.vx = v2.x * 0.9;
            tx1.vy = v2.y * 0.9;
            tx2.vx = v1.x * 0.9;
            tx2.vy = v1.y * 0.9;
          }
        }
      }

      // Draw all bubbles
      txsRef.current = txsRef.current.map((tx) => {
          let { x, y, vx, vy } = tx;

          // Draw bubble with gradient
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, tx.size);
          
          // Color based on gas price - Vibrant colors
          let mainColor, secondColor, textColor;
          if (tx.gasPrice > 50) {
            // High gas - Bright Red
            mainColor = 'rgba(255, 69, 58, 0.9)';
            secondColor = 'rgba(255, 120, 90, 0.3)';
            textColor = 'white';
          } else if (tx.gasPrice > 30) {
            // Medium gas - Bright Amber
            mainColor = 'rgba(255, 191, 0, 0.9)';
            secondColor = 'rgba(255, 204, 51, 0.3)';
            textColor = 'black';
          } else {
            // Low gas - Bright Cyan
            mainColor = 'rgba(0, 191, 255, 0.9)';
            secondColor = 'rgba(51, 204, 255, 0.3)';
            textColor = 'white';
          }

          gradient.addColorStop(0, mainColor);
          gradient.addColorStop(1, secondColor);

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, tx.size, 0, Math.PI * 2);
          ctx.fill();

          // Draw border
          ctx.strokeStyle = mainColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, tx.size, 0, Math.PI * 2);
          ctx.stroke();

          // Draw text inside bubble
          ctx.fillStyle = textColor;
          ctx.font = `bold ${Math.max(8, tx.size / 4)}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Gas price
          ctx.fillText(`${tx.gasPrice.toFixed(0)} Gwei`, x, y - tx.size / 4);
          
          // Value
          ctx.font = `${Math.max(7, tx.size / 5)}px Inter, sans-serif`;
          ctx.fillText(`${tx.value.toFixed(2)} ETH`, x, y + tx.size / 4);

        return { ...tx, x, y, vx, vy };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPaused, attractionMode, mousePos]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePos({ x, y });

    // Check if hovering over a transaction
    let found = false;
    for (const tx of txsRef.current) {
      const distance = Math.sqrt((x - tx.x) ** 2 + (y - tx.y) ** 2);
      if (distance < tx.size + 5) {
        setHoveredTx(tx);
        found = true;
        break;
      }
    }
    if (!found) {
      setHoveredTx(null);
    }
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
    setHoveredTx(null);
  };

  return (
    <Card className="bg-gradient-to-br from-[#3d2f22] to-[#2d1f16] border-[#8B4513]/40">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Interactive Mempool Visualization
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant={isPaused ? 'secondary' : 'default'}>
              <button onClick={() => setIsPaused(!isPaused)} className="text-xs">
                {isPaused ? 'Paused' : 'Live'}
              </button>
            </Badge>
            <Badge variant={attractionMode ? 'default' : 'secondary'}>
              <button onClick={() => setAttractionMode(!attractionMode)} className="text-xs">
                {attractionMode ? 'Attraction: ON' : 'Attraction: OFF'}
              </button>
            </Badge>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div className="text-xs text-gray-400">
            <div className="text-white font-semibold">{mempoolStats.pendingCount.toLocaleString()}</div>
            <div>Pending TXs</div>
          </div>
          <div className="text-xs text-gray-400">
            <div className="text-white font-semibold">{mempoolStats.avgGasPrice} Gwei</div>
            <div>Avg Gas Price</div>
          </div>
          <div className="text-xs text-gray-400">
            <div className="text-white font-semibold">{mempoolStats.totalValue} ETH</div>
            <div>Total Value</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full h-[400px] rounded-lg bg-[#1a0f0a] cursor-pointer border border-[#8B4513]/20"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ touchAction: 'none' }}
          />
          
          {hoveredTx && (
            <div
              className="absolute z-10 bg-[#2d1f16] border border-[#8B4513] rounded-lg p-3 shadow-xl pointer-events-none"
              style={{
                left: Math.min(mousePos.x + 10, canvasRef.current!.clientWidth - 250),
                top: Math.min(mousePos.y + 10, canvasRef.current!.clientHeight - 100),
              }}
            >
              <div className="text-white text-xs space-y-1">
                <div className="font-semibold text-yellow-400 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {hoveredTx.value.toFixed(4)} ETH
                </div>
                <div className="text-gray-300">Gas: {hoveredTx.gasPrice.toFixed(2)} Gwei</div>
                <div className="text-gray-400 truncate max-w-[200px]">
                  {hoveredTx.hash.slice(0, 20)}...
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-gray-300">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#00BFFF] shadow-lg shadow-[#00BFFF]/50"></div>
              <span className="text-cyan-400">Low Gas (&lt;30 Gwei)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FFBF00] shadow-lg shadow-[#FFBF00]/50"></div>
              <span className="text-amber-400">Medium Gas (30-50 Gwei)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF453A] shadow-lg shadow-[#FF453A]/50"></div>
              <span className="text-red-400">High Gas (&gt;50 Gwei)</span>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-500 text-center">
            {attractionMode 
              ? '🧲 Move your mouse to attract transactions' 
              : '💡 Tip: Enable attraction mode to interact with transactions'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
