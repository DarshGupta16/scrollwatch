interface TabButtonProps {
  tab: string;
  activeTab: string;
  label: string;
  onClick: (tab: string) => void;
}

export const TabButton = ({
  tab,
  activeTab,
  label,
  onClick,
}: TabButtonProps) => (
  <button
    onClick={() => onClick(tab)}
    className={`px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${
      activeTab === tab
        ? "border-white text-white"
        : "border-transparent text-muted hover:text-white"
    }`}
  >
    {label}
  </button>
);
