import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Monitor, Moon, Sun, Globe, DollarSign, Bell, Activity } from 'lucide-react';

const Settings: React.FC = () => {
  const { settings, setTheme, updateSettings } = useSettings();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Gérez vos préférences et paramètres d'application.</p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-card-foreground">Apparence</h2>
          <p className="text-sm text-muted-foreground mt-1">Personnalisez l'apparence de l'application.</p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground">Thème</h3>
                <p className="text-sm text-muted-foreground">Sélectionnez le thème clair ou sombre.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <button
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                  settings.theme === 'light'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/50 hover:border-muted-foreground/50'
                }`}
              >
                <Sun className="w-8 h-8 mb-2" />
                <span className="font-medium">Clair</span>
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                  settings.theme === 'dark'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/50 hover:border-muted-foreground/50'
                }`}
              >
                <Moon className="w-8 h-8 mb-2" />
                <span className="font-medium">Sombre</span>
              </button>

              <button
                onClick={() => setTheme('system')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                  settings.theme === 'system'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/50 hover:border-muted-foreground/50'
                }`}
              >
                <Monitor className="w-8 h-8 mb-2" />
                <span className="font-medium">Système</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-card-foreground">Général</h2>
          <p className="text-sm text-muted-foreground mt-1">Paramètres régionaux et préférences.</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground">Langue</h3>
                <p className="text-sm text-muted-foreground">Sélectionnez la langue de l'interface.</p>
              </div>
            </div>
            <select
              value={settings.language}
              onChange={(e) => updateSettings({ language: e.target.value as 'fr' | 'en' | 'ar' })}
              className="bg-background border border-border text-foreground rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-auto"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground">Devise</h3>
                <p className="text-sm text-muted-foreground">Devise utilisée pour les factures et paiements.</p>
              </div>
            </div>
            <select
              value={settings.currency}
              onChange={(e) => updateSettings({ currency: e.target.value as 'MAD' | 'EUR' | 'USD' })}
              className="bg-background border border-border text-foreground rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-auto"
            >
              <option value="MAD">Dirham Marocain (MAD)</option>
              <option value="EUR">Euro (€)</option>
              <option value="USD">Dollar Américain ($)</option>
            </select>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground">Notifications</h3>
                <p className="text-sm text-muted-foreground">Activer ou désactiver les notifications système.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings.notifications}
                onChange={(e) => updateSettings({ notifications: e.target.checked })}
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Activity className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground">Graphique du Tableau de bord</h3>
                <p className="text-sm text-muted-foreground">Afficher le graphique des revenus sur le tableau de bord.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings.showChart}
                onChange={(e) => updateSettings({ showChart: e.target.checked })}
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

        </div>
      </div>
      
    </div>
  );
};

export default Settings;
