/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface ConfirmOptions {
  title: string;
  message: string;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ title: '', message: '' });
  const [resolvePromise, setResolvePromise] = useState<(value: boolean) => void>();

  const confirm = (opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve);
    });
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolvePromise) resolvePromise(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolvePromise) resolvePromise(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-foreground mb-2">{options.title}</h3>
            <p className="text-muted-foreground mb-6">{options.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (context === undefined) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
