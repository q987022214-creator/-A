import React, { useState, useEffect } from 'react';
import { WheelPicker } from './WheelPicker';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: string, time: string) => void;
  initialDate: string;
  initialTime: string;
}

export const DateTimePickerModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, initialDate, initialTime }) => {
  const [year, setYear] = useState(1990);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    if (isOpen) {
      const d = initialDate ? new Date(initialDate) : new Date(1990, 0, 1);
      if (!isNaN(d.getTime())) {
        setYear(d.getFullYear());
        setMonth(d.getMonth() + 1);
        setDay(d.getDate());
      }
      if (initialTime) {
        const [h, m] = initialTime.split(':').map(Number);
        if (!isNaN(h)) setHour(h);
        if (!isNaN(m)) setMinute(m);
      }
    }
  }, [isOpen, initialDate, initialTime]);

  const daysInMonth = new Date(year, month, 0).getDate();
  useEffect(() => {
    if (day > daysInMonth) setDay(daysInMonth);
  }, [year, month, daysInMonth, day]);

  if (!isOpen) return null;

  const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  const years = Array.from({ length: 150 }, (_, i) => ({ label: `${1900 + i}年`, value: 1900 + i }));
  const months = Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1}月`, value: i + 1 }));
  const days = Array.from({ length: daysInMonth }, (_, i) => ({ label: `${i + 1}日`, value: i + 1 }));
  const hours = Array.from({ length: 24 }, (_, i) => {
    const branch = branches[Math.floor(((i + 1) % 24) / 2)];
    return { label: `${i}时(${branch})`, value: i };
  });
  const minutes = Array.from({ length: 60 }, (_, i) => ({ label: `${i}分`, value: i }));

  return (
    <div className="absolute top-full left-0 right-0 mt-1 z-[9999] bg-zinc-900 rounded-lg border border-zinc-700 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
      <div className="flex justify-between items-center p-2 border-b border-zinc-800 bg-zinc-900/80">
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 px-2 py-1 text-xs">取消</button>
        <h3 className="text-zinc-300 text-xs font-medium">选择时间</h3>
        <button onClick={() => {
          const d = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const t = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
          onConfirm(d, t);
        }} className="text-emerald-500 hover:text-emerald-400 font-medium px-2 py-1 text-xs">确定</button>
      </div>
      <div className="flex justify-between px-1 py-3 bg-zinc-950">
        <WheelPicker options={years} value={year} onChange={setYear} className="flex-[1.2]" itemHeight={28} />
        <WheelPicker options={months} value={month} onChange={setMonth} className="flex-1" itemHeight={28} />
        <WheelPicker options={days} value={day} onChange={setDay} className="flex-1" itemHeight={28} />
        <WheelPicker options={hours} value={hour} onChange={setHour} className="flex-[1.2]" itemHeight={28} />
        <WheelPicker options={minutes} value={minute} onChange={setMinute} className="flex-1" itemHeight={28} />
      </div>
    </div>
  );
};
