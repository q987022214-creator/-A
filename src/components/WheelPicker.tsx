import React, { useRef, useEffect, useState } from 'react';

interface WheelPickerProps {
  options: { label: string; value: any }[];
  value: any;
  onChange: (value: any) => void;
  itemHeight?: number;
  visibleItems?: number;
  className?: string;
}

export const WheelPicker: React.FC<WheelPickerProps> = ({
  options,
  value,
  onChange,
  itemHeight = 36,
  visibleItems = 5,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const selectedIndex = options.findIndex(opt => opt.value === value);
  const safeSelectedIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const height = itemHeight * visibleItems;
  const padding = (visibleItems - 1) / 2 * itemHeight;

  useEffect(() => {
    if (containerRef.current && !isScrolling) {
      containerRef.current.scrollTop = safeSelectedIndex * itemHeight;
    }
  }, [safeSelectedIndex, itemHeight, isScrolling]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    
    setIsScrolling(true);
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

    scrollTimeout.current = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / itemHeight);
      const safeIndex = Math.max(0, Math.min(index, options.length - 1));
      
      containerRef.current.scrollTo({
        top: safeIndex * itemHeight,
        behavior: 'smooth'
      });

      if (options[safeIndex].value !== value) {
        onChange(options[safeIndex].value);
      }
      setIsScrolling(false);
    }, 150);
  };

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{ height: `${height}px` }}
    >
      <div className="absolute top-1/2 left-0 w-full bg-zinc-800/40 pointer-events-none border-y border-zinc-700/50" style={{ height: `${itemHeight}px`, transform: 'translateY(-50%)' }} />
      <style>{`
        .hide-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div 
        ref={containerRef}
        className="h-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory hide-scroll"
        style={{ 
          scrollBehavior: isScrolling ? 'auto' : 'smooth',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
        onScroll={handleScroll}
      >
        <div style={{ height: `${padding}px` }} />
        {options.map((opt, i) => {
          const isSelected = i === safeSelectedIndex;
          return (
            <div 
              key={i}
              className={`flex items-center justify-center snap-center cursor-pointer transition-all duration-200 ${isSelected ? 'text-emerald-400 font-medium text-base scale-110' : 'text-zinc-500 hover:text-zinc-300 text-sm'}`}
              style={{ height: `${itemHeight}px` }}
              onClick={() => {
                if (containerRef.current) {
                  containerRef.current.scrollTo({ top: i * itemHeight, behavior: 'smooth' });
                  onChange(opt.value);
                }
              }}
            >
              {opt.label}
            </div>
          );
        })}
        <div style={{ height: `${padding}px` }} />
      </div>
    </div>
  );
};
