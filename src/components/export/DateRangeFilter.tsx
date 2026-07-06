'use client';

import { useState, useRef, useEffect } from 'react';
import { getCurrentFY } from '@/lib/utils/dateUtils';
import { Calendar } from 'lucide-react';

interface DateRangeFilterProps {
  fromDate: string;
  toDate: string;
  onDateChange: (from: string, to: string) => void;
  allRange?: { from: string; to: string } | null;
}

export function DateRangeFilter({ fromDate, toDate, onDateChange, allRange }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onEscape);
    };
  }, [isOpen]);

  const today = new Date().toISOString().split('T')[0];
  const fy = getCurrentFY();

  const presets = [
    {
      label: 'This Month',
      getRange: () => {
        const now = new Date();
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
          to: today,
        };
      },
    },
    {
      label: 'This Quarter',
      getRange: () => {
        const now = new Date();
        const qMonth = Math.floor(now.getMonth() / 3) * 3;
        return {
          from: new Date(now.getFullYear(), qMonth, 1).toISOString().split('T')[0],
          to: today,
        };
      },
    },
    {
      label: 'This FY',
      getRange: () => {
        return { from: fy.start, to: fy.end };
      },
    },
    {
      label: 'Last FY',
      getRange: () => {
        const now = new Date();
        const y = now.getMonth() < 3 ? now.getFullYear() - 2 : now.getFullYear() - 1;
        return { from: `${y}-04-01`, to: `${y + 1}-03-31` };
      },
    },
    ...(allRange ? [{ label: 'All', getRange: () => allRange }] : []),
  ];

  const hasActiveFilter = fromDate !== fy.start || toDate !== fy.end;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className={`inline-flex items-center justify-center h-7 px-2.5 gap-1.5 border rounded-lg transition-colors text-xs font-medium ${
          isOpen || hasActiveFilter
            ? 'border-blue-500 bg-blue-50 text-blue-600'
            : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 bg-white'
        }`}
        title="Date Filters"
      >
        <Calendar className="h-3.5 w-3.5" />
        {hasActiveFilter ? 'Date Filtered' : 'Date Range'}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-4 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-700">Date Range</span>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => {
                  onDateChange(fy.start, fy.end);
                  setIsOpen(false);
                }}
                className="text-[11px] text-blue-600 hover:underline"
              >
                Reset
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="mb-1 block text-[11px] font-semibold text-gray-500">From</span>
              <input
                type="date"
                value={fromDate}
                onChange={e => onDateChange(e.target.value, toDate)}
                className="h-8 w-full px-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </label>
            <label>
              <span className="mb-1 block text-[11px] font-semibold text-gray-500">To</span>
              <input
                type="date"
                value={toDate}
                onChange={e => onDateChange(fromDate, e.target.value)}
                className="h-8 w-full px-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {presets.map(preset => (
              <button
                key={preset.label}
                onClick={() => { 
                  const { from, to } = preset.getRange(); 
                  onDateChange(from, to); 
                  setIsOpen(false);
                }}
                className="h-7 px-2.5 text-xs font-medium text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
