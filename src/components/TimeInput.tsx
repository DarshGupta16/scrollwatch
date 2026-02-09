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
 * Click each segment to edit directly - text input without spinners
 */
export const TimeInput: React.FC<TimeInputProps> = ({
  label,
  value,
  onChange,
}) => {
  // Handle input change with validation
  const handleChange = (field: "h" | "m" | "s", inputValue: string) => {
    // Only allow digits
    const digits = inputValue.replace(/\D/g, "");

    // Take only last 2 digits (allows overtyping)
    const truncated = digits.slice(-2);

    // Parse to number
    let num = parseInt(truncated) || 0;

    // Apply max constraints
    if (field === "h") {
      num = Math.min(99, num);
    } else {
      num = Math.min(59, num);
    }

    onChange({ ...value, [field]: num });
  };

  // Format value for display (always 2 digits)
  const formatValue = (num: number) => num.toString().padStart(2, "0");

  // Common input styles - text input without spinners
  const inputClass = `
    w-20 text-5xl font-bold text-center bg-transparent outline-none 
    focus:bg-border/30 transition-colors
    [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
  `;

  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold text-muted uppercase tracking-widest">
        {label}
      </label>

      <div className="flex items-center justify-center gap-1 py-4 bg-surface border border-border">
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={formatValue(value.h)}
          onChange={(e) => handleChange("h", e.target.value)}
          onFocus={(e) => e.target.select()}
          className={inputClass}
        />
        <span className="text-4xl text-muted">:</span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={formatValue(value.m)}
          onChange={(e) => handleChange("m", e.target.value)}
          onFocus={(e) => e.target.select()}
          className={inputClass}
        />
        <span className="text-4xl text-muted">:</span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={formatValue(value.s)}
          onChange={(e) => handleChange("s", e.target.value)}
          onFocus={(e) => e.target.select()}
          className={inputClass}
        />
      </div>
    </div>
  );
};

export type { TimeValue };
