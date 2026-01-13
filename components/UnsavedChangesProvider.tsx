'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

type SaveHandler = () => boolean | void | Promise<boolean | void>;

type UnsavedChangesContextValue = {
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
  registerSaveHandler: (handler: SaveHandler | null) => void;
  saveChanges: () => Promise<boolean>;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const [isDirty, setIsDirty] = useState(false);
  const saveHandlerRef = useRef<SaveHandler | null>(null);

  const registerSaveHandler = useCallback((handler: SaveHandler | null) => {
    saveHandlerRef.current = handler;
  }, []);

  const saveChanges = useCallback(async () => {
    if (!saveHandlerRef.current) return true;
    try {
      const result = await saveHandlerRef.current();
      return result !== false;
    } catch {
      return false;
    }
  }, []);

  const value: UnsavedChangesContextValue = {
    isDirty,
    setDirty: setIsDirty,
    registerSaveHandler,
    saveChanges,
  };

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error('useUnsavedChanges must be used within UnsavedChangesProvider');
  }
  return context;
}
