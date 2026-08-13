export type ThemeId = 'midnight' | 'cyber' | 'amber' | 'forest';

export interface Theme {
  id: ThemeId;
  label: string;
  colors: {
    background: string;
    backgroundDark: string;
    surface: string;
    surfaceLight: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    primary: string;
    primaryDark: string;
    accent: string;
    danger: string;
    success: string;
    warning: string;
  };
}

export const themes: Record<ThemeId, Theme> = {
  midnight: {
    id: 'midnight',
    label: 'Midnight',
    colors: {
      background: '#101e22',
      backgroundDark: '#0a1316',
      surface: '#16262c',
      surfaceLight: '#223f49',
      border: '#223f49',
      textPrimary: '#F0FFF4',
      textSecondary: '#b8e2f2',
      textMuted: '#6c8d99',
      primary: '#0db9f2',
      primaryDark: '#098fb5',
      accent: '#0db9f2',
      danger: '#F87171',
      success: '#4ADE80',
      warning: '#FBBF24',
    },
  },
  cyber: {
    id: 'cyber',
    label: 'Cyber',
    colors: {
      background: '#0b0c15',
      backgroundDark: '#06070d',
      surface: '#131825',
      surfaceLight: '#1f2637',
      border: '#2a3148',
      textPrimary: '#eef1ff',
      textSecondary: '#b3b9d8',
      textMuted: '#6e7491',
      primary: '#7c5cff',
      primaryDark: '#6848d9',
      accent: '#00f2ff',
      danger: '#ff5f7e',
      success: '#3dffb8',
      warning: '#ffd166',
    },
  },
  amber: {
    id: 'amber',
    label: 'Amber',
    colors: {
      background: '#1a1510',
      backgroundDark: '#110f0a',
      surface: '#261f17',
      surfaceLight: '#382d23',
      border: '#3e3328',
      textPrimary: '#fff4e6',
      textSecondary: '#e2cba8',
      textMuted: '#9e8a6e',
      primary: '#f5a623',
      primaryDark: '#d48b14',
      accent: '#ffcc80',
      danger: '#ff6b6b',
      success: '#a3d977',
      warning: '#ffe082',
    },
  },
  forest: {
    id: 'forest',
    label: 'Forest',
    colors: {
      background: '#0f1712',
      backgroundDark: '#0a110d',
      surface: '#18231c',
      surfaceLight: '#243025',
      border: '#2d3b31',
      textPrimary: '#e8fff0',
      textSecondary: '#a8d4b8',
      textMuted: '#6a9178',
      primary: '#22c55e',
      primaryDark: '#1a9e4b',
      accent: '#86efac',
      danger: '#f87171',
      success: '#4ade80',
      warning: '#fbbf24',
    },
  },
};

export const defaultTheme: ThemeId = 'midnight';

export function applyTheme(theme: Theme | ThemeId) {
  const root = document.documentElement;
  if (!root) return;
  const resolved = typeof theme === 'string' ? themes[theme] : theme;
  root.setAttribute('data-theme', resolved.id);
  Object.entries(resolved.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
}

export function getStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem('loxar-ui-theme');
    if (stored && themes[stored as ThemeId]) return stored as ThemeId;
  } catch {}
  return defaultTheme;
}

export function saveTheme(themeId: ThemeId) {
  try {
    localStorage.setItem('loxar-ui-theme', themeId);
  } catch {}
}
