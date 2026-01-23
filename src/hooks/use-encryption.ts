/**
 * useEncryption Hook - Key Management
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  generateKeyPair,
  saveKeyToStorage,
  loadKeyFromStorage,
  clearKeyFromStorage,
  keyToRecoveryPhrase,
  recoveryPhraseToKey,
  getUserKeyHash,
} from "@/lib/crypto";

export function useEncryption() {
  const [secretKey, setSecretKey] = useState<Uint8Array | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [userKeyHash, setUserKeyHash] = useState<string | null>(null);

  // Load key on mount
  useEffect(() => {
    const loadKey = async () => {
      const key = loadKeyFromStorage();
      if (key) {
        setSecretKey(key);
        setRecoveryPhrase(keyToRecoveryPhrase(key));
        const hash = await getUserKeyHash(key);
        setUserKeyHash(hash);
      }
      setIsInitialized(true);
    };
    loadKey();
  }, []);

  // Generate new key
  const generateNewKey = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      setIsGeneratingKey(true);

      // Simulate key generation time
      setTimeout(async () => {
        const keyPair = generateKeyPair();
        const key = keyPair.secretKey;

        setSecretKey(key);
        saveKeyToStorage(key);

        const phrase = keyToRecoveryPhrase(key);
        setRecoveryPhrase(phrase);

        const hash = await getUserKeyHash(key);
        setUserKeyHash(hash);

        setIsGeneratingKey(false);
        resolve(phrase);
      }, 1500);
    });
  }, []);

  // Restore from recovery phrase
  const restoreFromPhrase = useCallback((phrase: string) => {
    try {
      const key = recoveryPhraseToKey(phrase);
      setSecretKey(key);
      saveKeyToStorage(key);
      setRecoveryPhrase(phrase);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Logout / Clear key
  const clearKey = useCallback(() => {
    setSecretKey(null);
    setRecoveryPhrase(null);
    clearKeyFromStorage();
  }, []);

  return {
    secretKey,
    isInitialized,
    hasKey: !!secretKey,
    recoveryPhrase,
    userKeyHash,
    isGeneratingKey,
    generateNewKey,
    restoreFromPhrase,
    clearKey,
  };
}
