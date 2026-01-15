import { createContext, useState, useEffect, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = 'blue' | 'purple' | 'green' | 'orange' | 'pink';

export interface ThemeContextType {
    mode: ThemeMode;
    setMode: (mode: ThemeMode) => void;
    accentColor: AccentColor;
    setAccentColor: (color: AccentColor) => void;
    isDark: boolean;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

const accentColors: Record<AccentColor, { primary: string; ring: string }> = {
    blue: { primary: '217 91% 60%', ring: '217 91% 60%' },
    purple: { primary: '262 83% 58%', ring: '262 83% 58%' },
    green: { primary: '142 71% 45%', ring: '142 71% 45%' },
    orange: { primary: '25 95% 53%', ring: '25 95% 53%' },
    pink: { primary: '330 81% 60%', ring: '330 81% 60%' },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<ThemeMode>(() => {
        const saved = localStorage.getItem('opencowork-theme');
        if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
        return 'system';
    });

    const [accentColor, setAccentColor] = useState<AccentColor>(() => {
        const saved = localStorage.getItem('opencowork-accent');
        if (['blue', 'purple', 'green', 'orange', 'pink'].includes(saved || '')) {
            return saved as AccentColor;
        }
        return 'blue';
    });

    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        localStorage.setItem('opencowork-theme', mode);

        const updateDark = () => {
            let dark = false;
            if (mode === 'dark') dark = true;
            else if (mode === 'system') {
                dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            }
            setIsDark(dark);
            document.documentElement.classList.toggle('dark', dark);
        };

        updateDark();

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', updateDark);
        return () => mediaQuery.removeEventListener('change', updateDark);
    }, [mode]);

    useEffect(() => {
        localStorage.setItem('opencowork-accent', accentColor);
        const colors = accentColors[accentColor];
        document.documentElement.style.setProperty('--primary', colors.primary);
        document.documentElement.style.setProperty('--ring', colors.ring);
    }, [accentColor]);

    return (
        <ThemeContext.Provider value={{ mode, setMode, accentColor, setAccentColor, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
}

// Re-export useTheme for convenience
export { useTheme } from './useTheme';
