import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { Play, Settings2, Zap, RotateCcw, Timer } from 'lucide-react';
import confetti from 'canvas-confetti';
import { logBetActivity } from '../../lib/activity';

const ROWS = 8;
const MULTIPLIERS = [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6];

export const PlinkoGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(10);
  const [isAuto, setIsAuto] = useState(false);
  const [isFast, setIsFast] = useState(false);
  const [autoRounds, setAutoRounds] = useState(10);
  const [remainingRounds, setRemainingRounds] = useState(0);
  const [lastBucket, setLastBucket] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<{ x: number; y: number; vx: number; vy: number; row: number; trail: { x: number; y: number }[] }[]>([]);

  const dropBall = useCallback(() => {
    if (subtractBalance(bet)) {
      const startX = 250; // Center of 500px canvas
      ballsRef.current.push({
        x: startX + (Math.random() - 0.5) * 4, // Slight random offset to prevent stacking
        y: 20,
        vx: 0,
        vy: 0,
        row: 0,
        trail: []
      });
      
      if (isAuto && remainingRounds > 1) {
        setRemainingRounds(prev => prev - 1);
      } else if (isAuto) {
        setIsAuto(false);
        setRemainingRounds(0);
      }
    } else {
      setIsAuto(false);
      setRemainingRounds(0);
    }
  }, [bet, isAuto, remainingRounds, subtractBalance]);

  useEffect(() => {
    if (isAuto && remainingRounds > 0) {
      const interval = isFast ? 100 : 500;
      const timer = setTimeout(dropBall, interval);
      return () => clearTimeout(timer);
    }
  }, [isAuto, remainingRounds, dropBall, isFast]);

  const startAuto = () => {
    if (isAuto) {
      setIsAuto(false);
      setRemainingRounds(0);
    } else {
      setIsAuto(true);
      setRemainingRounds(autoRounds);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Pegs
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      for (let row = 0; row < ROWS; row++) {
        const rowY = 60 + row * 40;
        const pegsInRow = row + 3;
        const rowWidth = (pegsInRow - 1) * 40;
        const startX = (canvas.width - rowWidth) / 2;

        for (let i = 0; i < pegsInRow; i++) {
          ctx.beginPath();
          ctx.arc(startX + i * 40, rowY, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Multipliers
      const lastRowY = 60 + ROWS * 40;
      const bucketWidth = 40;
      const totalBuckets = ROWS + 1;
      const startX = (canvas.width - totalBuckets * bucketWidth) / 2;

      MULTIPLIERS.forEach((m, i) => {
        const x = startX + i * bucketWidth;
        const activeBucket = i === lastBucket;
        ctx.fillStyle = activeBucket
          ? 'rgba(0, 255, 136, 0.22)'
          : m >= 1 ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(x + 2, lastRowY, bucketWidth - 4, 30);
        ctx.fillStyle = activeBucket ? '#ffffff' : m >= 1 ? '#00FF88' : 'rgba(255, 255, 255, 0.4)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${m}x`, x + bucketWidth / 2, lastRowY + 20);
      });

      // Sub-stepping for physics accuracy at high speeds
      const steps = isFast ? 3 : 2;
      for (let s = 0; s < steps; s++) {
        ballsRef.current = ballsRef.current.filter(ball => {
          ball.vy += 0.16 / steps;
          ball.vx *= 0.992;
          ball.vy *= 0.998;
          ball.x += ball.vx / steps;
          ball.y += ball.vy / steps;

          // Collision with pegs
          for (let row = 0; row < ROWS; row++) {
            const rowY = 60 + row * 40;
            if (Math.abs(ball.y - rowY) < 10 && ball.row === row) {
              const pegsInRow = row + 3;
              const rowWidth = (pegsInRow - 1) * 40;
              const rowStartX = (canvas.width - rowWidth) / 2;
              
              const pegIndex = Math.round((ball.x - rowStartX) / 40);
              const pegX = rowStartX + pegIndex * 40;
              const dx = ball.x - pegX;
              const dy = ball.y - rowY;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < 14) {
                const direction = dx >= 0 ? 1 : -1;
                ball.vx = direction * (1.8 + Math.random() * 0.8);
                ball.vy = -0.8 - Math.random() * 0.4;
                ball.row++;
              }
            }
          }

          if (ball.x < 18 || ball.x > canvas.width - 18) {
            ball.vx *= -0.82;
            ball.x = Math.max(18, Math.min(canvas.width - 18, ball.x));
          }

          // Collision with buckets
          if (ball.y >= lastRowY) {
            const bucketIndex = Math.floor((ball.x - startX) / bucketWidth);
            const safeIndex = Math.max(0, Math.min(MULTIPLIERS.length - 1, bucketIndex));
            const mult = MULTIPLIERS[safeIndex];
            setLastBucket(safeIndex);
            const payout = bet * mult;
            addBalance(payout);
            logBetActivity({
              gameKey: 'plinko',
              wager: bet,
              payout,
              multiplier: mult,
              outcome: payout > bet ? 'win' : payout === bet ? 'push' : 'loss',
              detail: `Bucket ${safeIndex + 1}`,
            });
            if (mult >= 2) {
              confetti({
                particleCount: 30,
                spread: 50,
                origin: { x: ball.x / canvas.width, y: ball.y / canvas.height },
                colors: ['#00FF88']
              });
            }
            return false;
          }

          // Update trail (only on last step for performance)
          if (s === steps - 1) {
            ball.trail.push({ x: ball.x, y: ball.y });
            if (ball.trail.length > 10) ball.trail.shift();
          }

          return true;
        });
      }

      // Draw Balls
      ballsRef.current.forEach(ball => {
        // Draw trail
        ball.trail.forEach((pos, i) => {
          const opacity = (i / ball.trail.length) * 0.5;
          ctx.fillStyle = `rgba(0, 255, 136, ${opacity})`;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
          ctx.fill();
        });

        const glow = ctx.createRadialGradient(ball.x, ball.y, 2, ball.x, ball.y, 12);
        glow.addColorStop(0, '#d6ffea');
        glow.addColorStop(1, 'rgba(0, 255, 136, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#00FF88';
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#00FF88';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [bet, isFast, addBalance, lastBucket]);

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 p-4 max-w-6xl mx-auto">
      <div className="lg:col-span-1 bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Bet Amount</label>
            <input
              type="number"
              value={bet}
              onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
              disabled={isAuto}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsFast(!isFast)}
              className={cn(
                "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                isFast ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/50" : "bg-white/5 text-white/20 border border-transparent"
              )}
            >
              <Zap size={12} fill={isFast ? "currentColor" : "none"} />
              FAST
            </button>
            <button
              onClick={startAuto}
              className={cn(
                "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                isAuto ? "bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/50" : "bg-white/5 text-white/20 border border-transparent"
              )}
            >
              <RotateCcw size={12} className={isAuto ? "animate-spin" : ""} />
              AUTO
            </button>
          </div>

          {isAuto && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/20">
                <span>Rounds</span>
                <span>{remainingRounds} left</span>
              </div>
              <input
                type="number"
                value={autoRounds}
                onChange={(e) => setAutoRounds(Math.max(1, Number(e.target.value)))}
                disabled={isAuto}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#00FF88]/50"
              />
            </div>
          )}

          <button
            onClick={isAuto ? startAuto : dropBall}
            disabled={balance < bet && !isAuto}
            className={cn(
              "w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50",
              isAuto ? "bg-red-500 text-white" : "bg-[#00FF88] text-black"
            )}
          >
            {isAuto ? (
              <>
                <Timer size={18} />
                STOP AUTO
              </>
            ) : (
              <>
                <Play size={18} fill="currentColor" />
                DROP BALL
              </>
            )}
          </button>
        </div>

        <div className="mt-auto p-4 border border-white/5 rounded-xl bg-black/30">
          <div className="flex items-center gap-2 text-white/40 text-xs mb-3">
            <Settings2 size={14} />
            <span>GAME SETTINGS</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px]">
              <span className="text-white/20 uppercase">Risk</span>
              <span className="text-white/60">MEDIUM</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-white/20 uppercase">Rows</span>
              <span className="text-white/60">{ROWS}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 bg-black border border-white/10 rounded-2xl p-4 flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={500}
          height={500}
          className="max-w-full h-auto"
        />
      </div>
    </div>
  );
};
