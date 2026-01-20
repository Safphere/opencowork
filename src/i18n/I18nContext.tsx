import { createContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language, TranslationKey } from './translations';

export type LanguageMode = Language | 'system';

export interface I18nContextType {
    language: Language;
    languageMode: LanguageMode;
    setLanguageMode: (mode: LanguageMode) => void;
    t: (key: TranslationKey) => string;
}

export const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
    const [languageMode, setLanguageMode] = useState<LanguageMode>(() => {
        const saved = localStorage.getItem('opencowork-language');
        if (saved === 'en' || saved === 'zh') return saved;
        return 'system';
    });

    const [language, setLanguage] = useState<Language>('en');

    useEffect(() => {
        const updateLanguage = () => {
            if (languageMode === 'system') {
                const sysLang = navigator.language.startsWith('zh') ? 'zh' : 'en';
                setLanguage(sysLang);
            } else {
                setLanguage(languageMode);
            }
        };

        updateLanguage();
        localStorage.setItem('opencowork-language', languageMode);

        // Listen for system language changes if needed (rare but good correctness)
        const listener = () => {
            if (languageMode === 'system') updateLanguage();
        };
        window.addEventListener('languagechange', listener);
        return () => window.removeEventListener('languagechange', listener);
    }, [languageMode]);

    const t = (key: TranslationKey): string => {
        return translations[language][key] || translations.en[key] || key;
    };

    return (
        <I18nContext.Provider value={{ language, languageMode, setLanguageMode, t }}>
            {children}
        </I18nContext.Provider>
    );
}

// Re-export useI18n for convenience
export { useI18n } from './useI18n';
