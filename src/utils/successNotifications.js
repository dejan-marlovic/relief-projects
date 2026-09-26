const listeners = new Set();
export const notifySuccess = (message) => { for (const listener of listeners) listener(message); };
export const subscribeSuccess = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
