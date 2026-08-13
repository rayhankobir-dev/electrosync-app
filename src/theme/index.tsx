import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import '@/global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { prefsStorage } from '@/lib/storage';

import { Palette, type ColorScheme, type Colors } from './tokens';

export * from './tokens';
export { fontFamily, numericFontFamily, TabularNumbers, FontAssets } from './fonts';

/** Mirrors the `theme` field on `PATCH /users/me/settings`. */
export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_KEY = 'electrosync.theme';

const MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];

function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && MODES.includes(value as ThemeMode);
}

export type Theme = {
  /** What the user chose, which may be `system`. */
  mode: ThemeMode;
  setMode(next: ThemeMode): void;
  /** What `system` actually resolved to. Never `system`. */
  scheme: ColorScheme;
  colors: Colors;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    let cancelled = false;

    void prefsStorage.get(THEME_KEY).then((stored) => {
      if (!cancelled && isThemeMode(stored)) setModeState(stored);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void prefsStorage.set(THEME_KEY, next);
  }, []);

  const value = useMemo<Theme>(() => {
    // `useColorScheme` reports null before the native module answers, and
    // 'unspecified' on some Android builds. Light is the safer default: a brief
    // flash of light is less jarring than a flash of black.
    const resolved: ColorScheme =
      mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

    return { mode, setMode, scheme: resolved, colors: Palette[resolved] };
  }, [mode, setMode, systemScheme]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): Theme {
  const context = use(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>.');
  return context;
}

/** Shorthand for the common case of only needing colours. */
export function useColors(): Colors {
  return useTheme().colors;
}
