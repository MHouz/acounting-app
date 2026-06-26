/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
type Language = 'fr' | 'en' | 'ar';
type Currency = 'MAD' | 'EUR' | 'USD';

interface SettingsState {
  theme: Theme;
  language: Language;
  currency: Currency;
  notifications: boolean;
  showChart: boolean;
}

interface SettingsContextType {
  settings: SettingsState;
  updateSettings: (newSettings: Partial<SettingsState>) => void;
  setTheme: (theme: Theme) => void;
}

const defaultSettings: SettingsState = {
  theme: 'system',
  language: 'fr',
  currency: 'MAD',
  notifications: true,
  showChart: false,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SettingsState>(() => {
    const saved = localStorage.getItem('app-settings');
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to parse settings from local storage', e);
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('app-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (settings.theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        if (settings.theme === 'system') {
          root.classList.remove('light', 'dark');
          root.classList.add(e.matches ? 'dark' : 'light');
        }
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      root.classList.add(settings.theme);
    }
  }, [settings.theme]);

  const updateSettings = (newSettings: Partial<SettingsState>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const setTheme = (theme: Theme) => {
    updateSettings({ theme });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, setTheme }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
