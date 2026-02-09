import React from "react";

interface TimeValue {
  h: number;
  m: number;
  s: number;
}

interface TimeInputProps {
  label: string;
  value: TimeValue;
  onChange: (time: TimeValue) => void;
}

/**
 * Large editable time display (HH:MM:SS format)
 * Click each segment to edit directly
 */
export const TimeInput: React.FC<TimeInputProps> = ({
  label,
  value,
  onChange,
}) => {
  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold text-muted uppercase tracking-widest">
        {label}
      </label>

      <div className="flex items-center justify-center gap-1 py-4 bg-surface border border-border">
        <input
          type="number"
          min="0"
          max="99"
          value={value.h.toString().padStart(2, "0")}
          onChange={(e) =>
            onChange({
              ...value,
              h: Math.max(0, parseInt(e.target.value) || 0),
            })
          }
          className="w-20 text-5xl font-bold text-center bg-transparent outline-none focus:bg-border/30 transition-colors"
        />
        <span className="text-4xl text-muted">:</span>
        <input
          type="number"
          min="0"
          max="59"
          value={value.m.toString().padStart(2, "0")}
          onChange={(e) =>
            onChange({
              ...value,
              m: Math.min(59, Math.max(0, parseInt(e.target.value) || 0)),
            })
          }
          className="w-20 text-5xl font-bold text-center bg-transparent outline-none focus:bg-border/30 transition-colors"
        />
        <span className="text-4xl text-muted">:</span>
        <input
          type="number"
          min="0"
          max="59"
          value={value.s.toString().padStart(2, "0")}
          onChange={(e) =>
            onChange({
              ...value,
              s: Math.min(59, Math.max(0, parseInt(e.target.value) || 0)),
            })
          }
          className="w-20 text-5xl font-bold text-center bg-transparent outline-none focus:bg-border/30 transition-colors"
        />
      </div>
    </div>
  );
};

export type { TimeValue };
