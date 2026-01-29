/**
 * Keychain Module - Secure Native Key Storage
 *
 * Uses OS-native keychain for secure secret key storage:
 * - macOS: Keychain
 * - Windows: Credential Manager
 * - Linux: Secret Service API / Keyring
 */

use keyring::{Entry, Error as KeyringError};

const SERVICE_NAME: &str = "photovault";
const USERNAME: &str = "secret_key";

/// Store the encryption key in the OS keychain
///
/// # Security
/// - Uses OS-native secure storage (Keychain on macOS)
/// - Key is encrypted at rest by the OS
/// - Requires user authentication to access (depending on OS policy)
#[tauri::command]
pub fn store_secret_key(key: String) -> Result<(), String> {
    log::info!("[Keychain] Storing secret key");

    let entry = Entry::new(SERVICE_NAME, USERNAME)
        .map_err(|e| format!("Failed to create keychain entry: {}", e))?;

    entry.set_password(&key)
        .map_err(|e| format!("Failed to store key: {}", e))?;

    log::info!("[Keychain] Secret key stored successfully");
    Ok(())
}

/// Load the encryption key from the OS keychain
///
/// # Returns
/// - `Ok(Some(key))` if key exists
/// - `Ok(None)` if no key is stored
/// - `Err` on access errors
#[tauri::command]
pub fn load_secret_key() -> Result<Option<String>, String> {
    log::info!("[Keychain] Loading secret key");

    let entry = Entry::new(SERVICE_NAME, USERNAME)
        .map_err(|e| format!("Failed to create keychain entry: {}", e))?;

    match entry.get_password() {
        Ok(password) => {
            log::info!("[Keychain] Secret key loaded successfully");
            Ok(Some(password))
        }
        Err(KeyringError::NoEntry) => {
            log::info!("[Keychain] No secret key found");
            Ok(None)
        }
        Err(e) => {
            log::error!("[Keychain] Failed to load key: {}", e);
            Err(format!("Failed to load key: {}", e))
        }
    }
}

/// Remove the encryption key from the OS keychain
///
/// # Security
/// - Securely erases the key from keychain
/// - Safe to call even if key doesn't exist
#[tauri::command]
pub fn clear_secret_key() -> Result<(), String> {
    log::info!("[Keychain] Clearing secret key");

    let entry = Entry::new(SERVICE_NAME, USERNAME)
        .map_err(|e| format!("Failed to create keychain entry: {}", e))?;

    match entry.delete_password() {
        Ok(_) => {
            log::info!("[Keychain] Secret key cleared successfully");
            Ok(())
        }
        Err(KeyringError::NoEntry) => {
            log::info!("[Keychain] No key to clear");
            Ok(())
        }
        Err(e) => {
            log::error!("[Keychain] Failed to clear key: {}", e);
            Err(format!("Failed to clear key: {}", e))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_store_and_load_key() {
        let test_key = "test_encryption_key_12345";

        // Store key
        let store_result = store_secret_key(test_key.to_string());
        assert!(store_result.is_ok(), "Should store key successfully");

        // Load key
        let load_result = load_secret_key();
        assert!(load_result.is_ok(), "Should load key successfully");
        assert_eq!(load_result.unwrap(), Some(test_key.to_string()));

        // Cleanup
        clear_secret_key().ok();
    }

    #[test]
    fn test_load_nonexistent_key() {
        // Ensure key is cleared first
        clear_secret_key().ok();

        let result = load_secret_key();
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), None, "Should return None for nonexistent key");
    }

    #[test]
    fn test_clear_key() {
        // Store a key first
        store_secret_key("test_key".to_string()).ok();

        // Clear it
        let result = clear_secret_key();
        assert!(result.is_ok(), "Should clear key successfully");

        // Verify it's gone
        let load_result = load_secret_key();
        assert_eq!(load_result.unwrap(), None, "Key should be cleared");
    }

    #[test]
    fn test_clear_nonexistent_key() {
        // Ensure key doesn't exist
        clear_secret_key().ok();

        // Should not error when clearing nonexistent key
        let result = clear_secret_key();
        assert!(result.is_ok(), "Should handle clearing nonexistent key gracefully");
    }
}
