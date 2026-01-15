import { createContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language, TranslationKey } from './translations';

export interface I18nContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey) => string;
}

export const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>(() => {
        const saved = localStorage.getItem('opencowork-language');
        if (saved === 'en' || saved === 'zh') return saved;
        // Detect browser language
        return navigator.language.startsWith('zh') ? 'zh' : 'en';
    });

    useEffect(() => {
        localStorage.setItem('opencowork-language', language);
    }, [language]);

    const t = (key: TranslationKey): string => {
        return translations[language][key] || translations.en[key] || key;
    };

    return (
        <I18nContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </I18nContext.Provider>
    );
}

// Re-export useI18n for convenience
export { useI18n } from './useI18n';
