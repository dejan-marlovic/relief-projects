import { createContext, useContext, useEffect } from "react";

export const UnsavedChangesContext = createContext({
  setUnsavedChange: () => {},
  hasUnsavedChanges: false,
  confirmDiscardUnsavedChanges: () => true,
});

export const useUnsavedChanges = () => useContext(UnsavedChangesContext);

export const useUnsavedChange = (key, isUnsaved) => {
  const { setUnsavedChange } = useUnsavedChanges();
  useEffect(() => {
    setUnsavedChange(key, Boolean(isUnsaved));
    return () => setUnsavedChange(key, false);
  }, [isUnsaved, key, setUnsavedChange]);
};
