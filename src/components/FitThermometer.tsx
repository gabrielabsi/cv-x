import { useEffect, useState } from "react";

interface FitThermometerProps {
  score: number;
  animate?: boolean;
}

export function FitThermometer({ score, animate = true }: FitThermometerProps) {
  const [displayScore, setDisplayScore] = useState(animate ? 0 : score);
  
  useEffect(() => {
    if (!animate) {
      setDisplayScore(score);
      return;
    }
    
    const duration = 1500;
    const steps = 60;
    const increment = score / steps;
    let current = 0;
    
    const interval = setInterval(() => {
      current += increment;
      if (current >= score) {
        setDisplayScore(score);
        clearInterval(interval);
      } else {
        setDisplayScore(Math.round(current));
      }
    }, duration / steps);
    
    return () => clearInterval(interval);
  }, [score, animate]);

  const getColor = (value: number) => {
    if (value >= 75) return "hsl(187, 92%, 53%)"; // accent cyan
    if (value >= 50) return "hsl(217, 91%, 60%)"; // primary blue
    if (value >= 25) return "hsl(38, 92%, 50%)"; // amber
    return "hsl(0, 84%, 60%)"; // red
  };

  const getLabel = (value: number) => {
    if (value >= 75) return "Excelente";
    if (value >= 50) return "Bom";
    if (value >= 25) return "Regular";
    return "Baixo";
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;
  const color = getColor(displayScore);
  const label = getLabel(displayScore);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-40 h-40">
        {/* Glow effect */}
        <div 
          className="absolute inset-0 rounded-full blur-xl opacity-30"
          style={{ backgroundColor: color }}
        />
        
        <svg className="relative w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-secondary"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={animate ? "animate-fill-thermometer" : ""}
            style={{
              transition: animate ? "none" : "stroke-dashoffset 0.3s ease-out",
              filter: `drop-shadow(0 0 12px ${color})`,
            }}
          />
        </svg>
        {/* Score display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span 
            className="text-4xl font-bold font-display"
            style={{ color }}
          >
            {displayScore}
          </span>
          <span className="text-sm text-muted-foreground">de 100</span>
        </div>
      </div>
      {/* Label */}
      <div 
        className="px-4 py-2 rounded-full text-sm font-semibold border"
        style={{ 
          backgroundColor: `${color}15`,
          color: color,
          borderColor: `${color}30`
        }}
      >
        {label} Match
      </div>
    </div>
  );
}
