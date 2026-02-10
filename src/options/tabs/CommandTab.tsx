import { TimeInput, TimeValue } from "../../components/TimeInput";
import { RuleCard } from "../../components/RuleCard";
import { Rule } from "../../utils/storage";

type ModeType = "quota" | "cooldown";

interface CommandTabProps {
  newDomain: string;
  setNewDomain: (domain: string) => void;
  durationTime: TimeValue;
  setDurationTime: (time: TimeValue) => void;
  resetTime: TimeValue;
  setResetTime: (time: TimeValue) => void;
  rules: Rule[];
  onAddRule: (e: React.FormEvent) => void;
  onDeleteRule: (domain: string) => void;
  onEditRule: (rule: Rule) => void;
  isEditing: boolean;
  mode: ModeType;
  setMode: (mode: ModeType) => void;
}

const ModeButton = ({
  label,
  value,
  current,
  onClick,
}: {
  label: string;
  value: ModeType;
  current: ModeType;
  onClick: (mode: ModeType) => void;
}) => (
  <button
    type="button"
    onClick={() => onClick(value)}
    className={`w-full text-center text-xs uppercase tracking-widest py-3 border transition-colors ${
      current === value
        ? "bg-white text-black border-white"
        : "bg-transparent text-muted border-border hover:bg-surface"
    }`}
  >
    {label}
  </button>
);

export const CommandTab = ({
  newDomain,
  setNewDomain,
  durationTime,
  setDurationTime,
  resetTime,
  setResetTime,
  rules,
  onAddRule,
  onDeleteRule,
  onEditRule,
  isEditing,
  mode,
  setMode,
}: CommandTabProps) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
    <section className="lg:col-span-1">
      <h2 className="text-xl font-bold uppercase tracking-widest mb-6 border-l-4 border-accent pl-4">
        {isEditing ? "Edit Protocol" : "Add Protocol"}
      </h2>
      <form
        onSubmit={onAddRule}
        className="space-y-6 bg-surface p-8 border border-border"
      >
        <div>
          <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">
            Target Domain
          </label>
          <input
            type="text"
            placeholder="twitter.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            className="w-full bg-bg border border-border p-3 text-sm focus:border-accent outline-none font-mono"
          />
        </div>
        <TimeInput
          label="Duration Limit (H:M:S)"
          value={durationTime}
          onChange={setDurationTime}
        />
        <TimeInput
          label={
            mode === "cooldown"
              ? "Cooldown Duration (H:M:S)"
              : "Reset Interval (H:M:S)"
          }
          value={resetTime}
          onChange={setResetTime}
        />
        <div>
          <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">
            Mode
          </label>
          <div className="flex gap-2">
            <ModeButton
              label="Quota"
              value="quota"
              current={mode}
              onClick={setMode}
            />
            <ModeButton
              label="Cooldown"
              value="cooldown"
              current={mode}
              onClick={setMode}
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full bg-white text-black font-bold py-4 hover:bg-gray-200 transition-colors uppercase tracking-widest border border-white !mt-8"
        >
          {isEditing ? "Update Protocol" : "Initialize Rule"}
        </button>
      </form>
    </section>

    <section className="lg:col-span-2">
      <h2 className="text-xl font-bold uppercase tracking-widest mb-6 border-l-4 border-border pl-4">
        Active Protocols
      </h2>
      <div className="grid gap-4">
        {rules.length === 0 ? (
          <div className="p-12 border border-border border-dashed text-center text-muted uppercase tracking-widest">
            No active protocols detected.
          </div>
        ) : (
          rules.map((rule) => (
            <RuleCard
              key={rule.domain}
              rule={rule}
              onDelete={onDeleteRule}
              onEdit={onEditRule}
            />
          ))
        )}
      </div>
    </section>
  </div>
);
