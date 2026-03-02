import { useState, useEffect } from 'react';

/**
 * Professional LocalStorage Hook
 * This replaces the need for a Node.js/Firebase backend.
 * @param {string} key - The unique name for your data (e.g., 'pirate_folders')
 * @param {any} initialValue - What to show if the storage is empty (usually [])
 */
const useLocalStorage = (key, initialValue) => {
  // 1. Get the data from LocalStorage or use the initial value
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      // If data exists, parse it from JSON; otherwise, use initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error("LocalStorage Read Error:", error);
      return initialValue;
    }
  });

  // 2. Update LocalStorage whenever the 'storedValue' changes
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error("LocalStorage Write Error:", error);
      // Note: Browsers usually have a 5MB limit for LocalStorage
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
};

export default useLocalStorage;