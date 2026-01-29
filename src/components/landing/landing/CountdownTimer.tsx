"use client";
import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = useState(false);

  // Beta launch date: February 3, 2026 at 12:00 CET
  const launchDate = new Date("2026-02-03T12:00:00+01:00").getTime();

  useEffect(() => {
    setMounted(true);
    
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const difference = launchDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [launchDate]);

  if (!mounted) return null;

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <span className="font-mono text-base font-bold text-gray-900 tabular-nums">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[8px] text-gray-400 uppercase tracking-wider font-sans font-medium">{label}</span>
    </div>
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-8 duration-1000" role="timer" aria-label={`Beta launch countdown: ${timeLeft.days} days, ${timeLeft.hours} hours, ${timeLeft.minutes} minutes, ${timeLeft.seconds} seconds`} aria-live="polite">
       <div className="inline-flex items-center gap-3 px-3.5 py-2 bg-white/90 backdrop-blur-xl rounded-xl border border-white/20 shadow-xl scale-75 origin-bottom-right">
          <div className="flex items-center gap-2">
             <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
             </span>
             <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 whitespace-nowrap">Release In</span>
          </div>

          <div className="flex items-center gap-1.5 border-l border-gray-200 pl-2.5">
            <TimeBlock value={timeLeft.days} label="Days" />
            <span className="text-gray-300 font-bold mb-3 text-[10px]">:</span>
            <TimeBlock value={timeLeft.hours} label="Hrs" />
            <span className="text-gray-300 font-bold mb-3 text-[10px]">:</span>
            <TimeBlock value={timeLeft.minutes} label="Min" />
            <span className="text-gray-300 font-bold mb-3 text-[10px]">:</span>
            <div className="flex flex-col items-center">
              <span className="font-mono text-base font-bold text-blue-600 tabular-nums">
                {String(timeLeft.seconds).padStart(2, "0")}
              </span>
              <span className="text-[8px] text-gray-400 uppercase tracking-wider font-sans font-medium">Sec</span>
            </div>
          </div>
      </div>
    </div>
  );
}
