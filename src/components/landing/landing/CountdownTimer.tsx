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
      <span className="font-syne text-lg font-bold text-white tabular-nums" aria-hidden="true">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[9px] text-white/70 uppercase tracking-wider" aria-hidden="true">{label}</span>
    </div>
  );

  return (
    <div className="fixed bottom-4 right-4 z-50" role="timer" aria-label={`Beta launch countdown: ${timeLeft.days} days, ${timeLeft.hours} hours, ${timeLeft.minutes} minutes, ${timeLeft.seconds} seconds`} aria-live="polite">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl px-4 py-3 shadow-2xl border border-white/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-white/80" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <TimeBlock value={timeLeft.days} label="D" />
            <span className="text-white/50 font-bold" aria-hidden="true">:</span>
            <TimeBlock value={timeLeft.hours} label="H" />
            <span className="text-white/50 font-bold" aria-hidden="true">:</span>
            <TimeBlock value={timeLeft.minutes} label="M" />
            <span className="text-white/50 font-bold" aria-hidden="true">:</span>
            <TimeBlock value={timeLeft.seconds} label="S" />
          </div>
        </div>
        <p className="text-[10px] text-white/60 text-center mt-1" aria-hidden="true">Beta Launch</p>
      </div>
    </div>
  );
}
