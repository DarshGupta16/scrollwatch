import { useState, useEffect } from "react";

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
 * Uses internal string state for smooth typing, syncs to parent on blur
 */
export const TimeInput = ({ label, value, onChange }: TimeInputProps) => {
  // Internal string state for each field - allows free typing
  const [hours, setHours] = useState(value.h.toString().padStart(2, "0"));
  const [minutes, setMinutes] = useState(value.m.toString().padStart(2, "0"));
  const [seconds, setSeconds] = useState(value.s.toString().padStart(2, "0"));

  // Sync from parent when value changes externally
  useEffect(() => {
    setHours(value.h.toString().padStart(2, "0"));
    setMinutes(value.m.toString().padStart(2, "0"));
    setSeconds(value.s.toString().padStart(2, "0"));
  }, [value.h, value.m, value.s]);

  // Handle input change - just filter non-digits, allow free typing
  const handleChange = (field: "h" | "m" | "s", inputValue: string) => {
    const digits = inputValue.replace(/\D/g, "").slice(0, 2);

    if (field === "h") setHours(digits);
    else if (field === "m") setMinutes(digits);
    else setSeconds(digits);
  };

  // Format on blur - pad to 2 digits, apply limits, sync to parent
  const handleBlur = (field: "h" | "m" | "s") => {
    let h = parseInt(hours) || 0;
    let m = parseInt(minutes) || 0;
    let s = parseInt(seconds) || 0;

    // Apply max constraints
    h = Math.min(99, h);
    m = Math.min(59, m);
    s = Math.min(59, s);

    // Update internal state with padded values
    setHours(h.toString().padStart(2, "0"));
    setMinutes(m.toString().padStart(2, "0"));
    setSeconds(s.toString().padStart(2, "0"));

    onChange({ h, m, s });
  };

  const inputClass =
    "w-16 bg-transparent text-center border-b-2 border-border focus:border-white transition-colors placeholder:text-border outline-none";

  return (
    <div className="space-y-4">
      <label className="block text-xs uppercase tracking-widest text-muted font-bold">
        {label}
      </label>

      <div className="flex items-center justify-center gap-2 text-4xl font-bold tracking-tighter">
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={hours}
          onChange={(e) => handleChange("h", e.target.value)}
          onBlur={() => handleBlur("h")}
          //   onFocus={(e) => e.target.select()}
          className={inputClass}
          placeholder="00"
        />
        <span className="text-muted pb-2">:</span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={minutes}
          onChange={(e) => handleChange("m", e.target.value)}
          onBlur={() => handleBlur("m")}
          //   onFocus={(e) => e.target.select()}
          className={inputClass}
          placeholder="00"
        />
        <span className="text-muted pb-2">:</span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={seconds}
          onChange={(e) => handleChange("s", e.target.value)}
          onBlur={() => handleBlur("s")}
          //   onFocus={(e) => e.target.select()}
          className={inputClass}
          placeholder="00"
        />
      </div>
    </div>
  );
};

export type { TimeValue };
