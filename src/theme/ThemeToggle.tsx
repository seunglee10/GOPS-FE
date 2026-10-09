import { Monitor, Moon, Sun } from "lucide-react";
import { useThemeMode, type ThemeMode } from "./themeMode";

const nextMode: Record<ThemeMode, ThemeMode> = {
  light: "dark",
  dark: "system",
  system: "light"
};

const modeLabel: Record<ThemeMode, string> = {
  light: "Light",
  dark: "Dark",
  system: "System"
};

const modeIcon: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor
};

export function ThemeToggle() {
  const { mode, select } = useThemeMode();
  const Icon = modeIcon[mode];
  const label = `Theme: ${modeLabel[mode]} — switch to ${modeLabel[nextMode[mode]]}`;

  return (
    <button
      type="button"
      className="workspace-theme-toggle"
      aria-label={label}
      title={label}
      onClick={() => select(nextMode[mode])}
    >
      <Icon size={15} aria-hidden="true" />
    </button>
  );
}
