import { test, expect, Page } from '@playwright/test';

/**
 * PhotoVault User Flow Tests
 *
 * These tests verify the complete user journey including:
 * - Onboarding flow (key generation, source selection, plan selection)
 * - Navigation between screens
 * - Photo upload and display
 * - Settings and security features
 * - Key import functionality
 * - Device pairing
 */

// Reset state before each test
test.beforeEach(async ({ page }) => {
    // Clear localStorage and IndexedDB to start fresh
    await page.goto('/');
    await page.evaluate(() => {
        localStorage.clear();
        indexedDB.deleteDatabase('PhotoVaultDB');
    });
});

test.describe('Onboarding Flow', () => {
    test('Complete Setup: New Key Generation', async ({ page }) => {
        await page.goto('/');

        // Wait for loader to finish (2 seconds)
        await page.waitForTimeout(2500);

        // Should show onboarding (Step 1)
        await expect(page.locator('text=Erstelle deinen Schlüssel')).toBeVisible({ timeout: 10000 });

        // Click "Schlüssel erstellen"
        await page.click('button:has-text("Schlüssel erstellen")');

        // Wait for key generation (1.5 seconds + buffer)
        await page.waitForTimeout(2000);

        // Should show backup phrase (Step 1b)
        await expect(page.locator('text=Notiere diese Wörter')).toBeVisible({ timeout: 10000 });

        // Verify phrase chunks are shown (base64 split into ~6 chunks)
        const wordElements = page.locator('div.grid.grid-cols-3 span.font-mono');
        const count = await wordElements.count();
        expect(count).toBeGreaterThanOrEqual(1);

        // Check "Ich habe die Wörter notiert"
        await page.click('button:has-text("Ich habe die Wörter notiert")');

        // Click "Weiter"
        await page.click('button:has-text("Weiter")');

        // Should show Step 2: Source Selection
        await expect(page.locator('text=Wähle Backup-Quelle')).toBeVisible({ timeout: 5000 });

        // Select "Fotos-App"
        await page.click('button:has-text("Fotos-App")');

        // Should show Step 3: Plan Selection
        await expect(page.locator('text=Wähle Speicherplan')).toBeVisible({ timeout: 5000 });

        // Select "FREE" plan (it's pre-selected, but click to confirm)
        await page.click('button:has-text("FREE")');

        // Click "PhotoVault starten"
        await page.click('button:has-text("PhotoVault starten")');

        // Should land on Gallery screen
        await expect(page.locator('h1:has-text("Galerie")')).toBeVisible({ timeout: 5000 });
    });

    test('Key Import: User can import existing key', async ({ page }) => {
        // First complete onboarding to get a valid key
        const recoveryPhrase = await completeOnboardingAndGetKey(page);

        // Clear state to simulate new device
        await page.evaluate(() => {
            localStorage.clear();
            indexedDB.deleteDatabase('PhotoVaultDB');
        });

        await page.reload();
        await page.waitForTimeout(2500); // Wait for loader

        // Should show onboarding
        await expect(page.locator('text=Erstelle deinen Schlüssel')).toBeVisible({ timeout: 10000 });

        // Click "Ich habe bereits einen Schlüssel"
        await page.click('button:has-text("Ich habe bereits einen Schlüssel")');

        // Import dialog should appear
        await expect(page.locator('text=Schlüssel importieren')).toBeVisible({ timeout: 5000 });

        // Enter the recovery phrase
        await page.fill('textarea', recoveryPhrase);

        // Click import
        await page.click('button:has-text("Importieren")');

        // Should complete onboarding and go to gallery
        await expect(page.locator('h1:has-text("Galerie")')).toBeVisible({ timeout: 10000 });
    });

    test('Key Import: Invalid key shows error', async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(2500); // Wait for loader

        await expect(page.locator('text=Erstelle deinen Schlüssel')).toBeVisible({ timeout: 10000 });

        // Click import
        await page.click('button:has-text("Ich habe bereits einen Schlüssel")');

        // Enter invalid key
        await page.fill('textarea', 'invalid-key-that-is-completely-wrong');

        // Click import
        await page.click('button:has-text("Importieren")');

        // Should show error
        await expect(page.locator('text=Ungültiger Schlüssel')).toBeVisible({ timeout: 5000 });

        // Should still be on import dialog
        await expect(page.locator('text=Schlüssel importieren')).toBeVisible();
    });
});

test.describe('Navigation', () => {
    test('Bottom Navigation: All Tabs Work', async ({ page }) => {
        await completeOnboarding(page);

        // Should be on Gallery
        await expect(page.locator('h1:has-text("Galerie")')).toBeVisible({ timeout: 5000 });

        // Click "Backup" tab
        await page.click('button:has-text("Backup")', { force: true });
        await expect(page.locator('h1:has-text("Backup")')).toBeVisible({ timeout: 5000 });

        // Click "Einstellungen" tab
        await page.click('button:has-text("Einstellungen")', { force: true });
        await expect(page.locator('h1:has-text("Einstellungen")')).toBeVisible({ timeout: 5000 });

        // Click back to "Galerie"
        await page.click('button:has-text("Galerie")', { force: true });
        await expect(page.locator('h1:has-text("Galerie")')).toBeVisible({ timeout: 5000 });
    });
});

test.describe('Gallery', () => {
    test('Upload Photo', async ({ page }) => {
        await completeOnboarding(page);

        // Create a simple 1x1 PNG
        const buffer = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64'
        );

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'test-photo.png',
            mimeType: 'image/png',
            buffer,
        });

        // Wait for encryption and save
        await page.waitForTimeout(3000);

        // Photo should appear in grid
        const photoGrid = page.locator('div.grid.grid-cols-3');
        await expect(photoGrid).toBeVisible({ timeout: 5000 });

        const photos = page.locator('div.grid.grid-cols-3 button');
        await expect(photos.first()).toBeVisible({ timeout: 5000 });
    });

    test('Search Functionality', async ({ page }) => {
        await completeOnboarding(page);

        // Search button is first button in header
        const searchButton = page.locator('header button').first();
        await searchButton.click();

        await expect(page.locator('input[placeholder="Suchen..."]')).toBeVisible({ timeout: 5000 });

        await page.fill('input[placeholder="Suchen..."]', 'test');

        await page.click('button:has-text("Abbrechen")');

        await expect(page.locator('input[placeholder="Suchen..."]')).not.toBeVisible();
    });

    test('Filter Functionality', async ({ page }) => {
        await completeOnboarding(page);

        // Filter button is second button in header
        const filterButton = page.locator('header button').nth(1);
        await filterButton.click();

        await expect(page.locator('button:has-text("Alle")')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('button:has-text("Natur")')).toBeVisible();

        await page.click('button:has-text("Natur")');

        const naturButton = page.locator('button:has-text("Natur")');
        await expect(naturButton).toHaveClass(/bg-\[#007AFF\]/);
    });
});

test.describe('Dashboard', () => {
    test('Shows Photo Count', async ({ page }) => {
        await completeOnboarding(page);
        await uploadTestPhoto(page);

        await page.click('button:has-text("Backup")', { force: true });

        await expect(page.locator('text=Fotos gesichert')).toBeVisible({ timeout: 5000 });
        const countElement = page.locator('text=Fotos gesichert').locator('..');
        await expect(countElement).toContainText('1');
    });

    test('Toggle Backup', async ({ page }) => {
        await completeOnboarding(page);
        await page.click('button:has-text("Backup")', { force: true });

        // Wait for dashboard to load
        await expect(page.locator('h1:has-text("Backup")')).toBeVisible({ timeout: 5000 });

        // Click on the backup toggle area (contains "Backup Aus" or "Backup Aktiv")
        const toggleButton = page.locator('button').filter({ hasText: /Backup (Aus|Aktiv)/ }).first();
        await expect(toggleButton).toBeVisible({ timeout: 5000 });
        await toggleButton.click();

        // Confirmation dialog should appear
        await expect(page.locator('text=Backup aktivieren?')).toBeVisible({ timeout: 5000 });

        // Click the "Aktivieren" button in the modal dialog (not the main page button)
        // The modal has a specific structure with border-t border-[#E5E5EA]
        const modalDialog = page.locator('div.fixed.inset-0').first();
        const activateButtonInModal = modalDialog.locator('button:has-text("Aktivieren")').last();
        await activateButtonInModal.click({ force: true });

        // Now backup should be active
        await expect(page.locator('text=Backup Aktiv')).toBeVisible({ timeout: 5000 });
    });

    test('Link Device Button Opens Pairing Modal', async ({ page }) => {
        await completeOnboarding(page);

        // Go to Dashboard
        await page.click('button:has-text("Backup")', { force: true });
        await expect(page.locator('h1:has-text("Backup")')).toBeVisible({ timeout: 5000 });

        // Click "Gerät verbinden"
        await page.click('button:has-text("Gerät verbinden")');

        // Pairing modal should appear with title
        await expect(page.locator('h2:has-text("Gerät verbinden")')).toBeVisible({ timeout: 5000 });

        // Should show QR code tab by default
        await expect(page.locator('text=Schlüssel zeigen')).toBeVisible();

        // Can switch to input tab
        await page.click('text=Schlüssel eingeben');
        await expect(page.locator('textarea[placeholder*="Schlüssel"]')).toBeVisible();

        // Close modal
        const closeButton = page.locator('button').filter({ has: page.locator('svg.lucide-x') });
        await closeButton.click();

        // Modal should be closed
        await expect(page.locator('h2:has-text("Gerät verbinden")')).not.toBeVisible();
    });

    test('Manual Backup Button', async ({ page }) => {
        await completeOnboarding(page);
        await uploadTestPhoto(page);

        await page.click('button:has-text("Backup")', { force: true });
        await expect(page.locator('h1:has-text("Backup")')).toBeVisible({ timeout: 5000 });

        // First activate backup by clicking the toggle
        const toggleButton = page.locator('button').filter({ hasText: /Backup (Aus|Aktiv)/ }).first();
        await toggleButton.click();

        // Wait for confirmation dialog to appear
        await page.waitForTimeout(500);

        // If confirmation dialog appeared, click the modal's Aktivieren button
        const modalDialog = page.locator('div.fixed.inset-0');
        if (await modalDialog.isVisible().catch(() => false)) {
            const activateButtonInModal = modalDialog.locator('button:has-text("Aktivieren")').last();
            await activateButtonInModal.click({ force: true });
        }

        // Wait for backup to be active
        await expect(page.locator('text=Backup Aktiv')).toBeVisible({ timeout: 5000 });

        // Now click "Jetzt sichern"
        await page.click('button:has-text("Jetzt sichern")');

        // Should show loading state or complete
        // The button might show "Vorbereiten..." or progress
        await page.waitForTimeout(2000);
    });
});

test.describe('Settings', () => {
    test('View Recovery Phrase', async ({ page }) => {
        await completeOnboarding(page);

        // Wait a moment for encryption hook to load
        await page.waitForTimeout(500);

        await page.click('button:has-text("Einstellungen")', { force: true });
        await expect(page.locator('h1:has-text("Einstellungen")')).toBeVisible({ timeout: 5000 });

        // Wait for settings to fully render
        await page.waitForTimeout(500);

        await expect(page.locator('text=Backup-Phrase anzeigen')).toBeVisible({ timeout: 5000 });
        await page.click('text=Backup-Phrase anzeigen');

        // Security warning should appear first
        await expect(page.locator('h3:has-text("Sicherheitshinweis")')).toBeVisible({ timeout: 5000 });

        // Find the confirm button within the modal and click it
        // The modal has "Abbrechen" and "Phrase anzeigen" buttons
        const securityModal = page.locator('div.fixed.inset-0.bg-black\\/40').first();
        const confirmButton = securityModal.locator('button:has-text("Phrase anzeigen")');
        await expect(confirmButton).toBeVisible({ timeout: 5000 });
        await confirmButton.click();

        // Should show the backup phrase modal with the title
        await expect(page.locator('h3:has-text("Deine Backup-Phrase")')).toBeVisible({ timeout: 5000 });

        // Should show "Vollständiger Schlüssel" section if key exists, or warning if not
        const hasKey = await page.locator('text=Vollständiger Schlüssel').isVisible().catch(() => false);
        const hasWarning = await page.locator('text=Kein Schlüssel gefunden').isVisible().catch(() => false);
        expect(hasKey || hasWarning).toBe(true);

        // Close modal
        await page.click('button:has-text("Fertig")');
    });

    test('Connected Devices List', async ({ page }) => {
        await completeOnboarding(page);
        await page.click('button:has-text("Einstellungen")', { force: true });

        await expect(page.locator('h1:has-text("Einstellungen")')).toBeVisible({ timeout: 5000 });

        // Click on "Verbundene Geräte" button
        const devicesButton = page.locator('button').filter({ hasText: 'Verbundene Geräte' });
        await expect(devicesButton).toBeVisible({ timeout: 5000 });
        await devicesButton.click();

        // Should show devices view with header "Geräte"
        await expect(page.locator('h1.sf-pro-display:has-text("Geräte")')).toBeVisible({ timeout: 5000 });

        // Should show at least current device indicator
        const hasActiveDevice = await page.locator('text=Aktiv').first().isVisible().catch(() => false);
        const hasThisDevice = await page.locator('text=Dieses Gerät').isVisible().catch(() => false);
        expect(hasActiveDevice || hasThisDevice).toBe(true);

        // Go back
        await page.click('text=← Zurück');
        await expect(page.locator('h1:has-text("Einstellungen")')).toBeVisible({ timeout: 5000 });
    });

    test('Restart Onboarding', async ({ page }) => {
        await completeOnboarding(page);
        await page.click('button:has-text("Einstellungen")', { force: true });

        await expect(page.locator('text=Onboarding wiederholen')).toBeVisible({ timeout: 5000 });
        await page.click('text=Onboarding wiederholen', { force: true });

        // Should go back to onboarding
        await page.waitForTimeout(2500); // Wait for potential loader
        await expect(page.locator('text=Erstelle deinen Schlüssel')).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Persistence', () => {
    test('Data Survives Reload', async ({ page }) => {
        await completeOnboarding(page);
        await uploadTestPhoto(page);

        await page.reload();

        // Wait for loader
        await page.waitForTimeout(2500);

        // Should NOT show onboarding
        await expect(page.locator('text=Erstelle deinen Schlüssel')).not.toBeVisible();

        // Should be on gallery
        await expect(page.locator('h1:has-text("Galerie")')).toBeVisible({ timeout: 5000 });

        // Photo should still be there
        const photos = page.locator('div.grid.grid-cols-3 button');
        await expect(photos.first()).toBeVisible({ timeout: 5000 });
    });
});

test.describe('UI/UX', () => {
    test('iOS Design Elements Present', async ({ page }) => {
        await completeOnboarding(page);

        // Check for SF Pro Display font class
        await expect(page.locator('.sf-pro-display').first()).toBeVisible({ timeout: 5000 });

        // Check background color exists
        const body = page.locator('body');
        const bgColor = await body.evaluate((el) =>
            window.getComputedStyle(el).backgroundColor
        );
        expect(bgColor).toBeTruthy();
    });
});

// ============= Helper Functions =============

/**
 * Complete onboarding flow with default options
 */
async function completeOnboarding(page: Page) {
    await page.goto('/');

    // Wait for loader
    await page.waitForTimeout(2500);

    // Check if already onboarded
    const isOnboarded = await page.locator('h1:has-text("Galerie")').isVisible().catch(() => false);
    if (isOnboarded) return;

    // Step 1: Create key
    await expect(page.locator('text=Erstelle deinen Schlüssel')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Schlüssel erstellen")');

    // Wait for key generation
    await page.waitForTimeout(2000);

    // Step 1b: Confirm phrase
    await expect(page.locator('text=Notiere diese Wörter')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Ich habe die Wörter notiert")');
    await page.click('button:has-text("Weiter")');

    // Step 2: Source selection
    await expect(page.locator('text=Wähle Backup-Quelle')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Fotos-App")');

    // Step 3: Plan selection
    await expect(page.locator('text=Wähle Speicherplan')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("FREE")');
    await page.click('button:has-text("PhotoVault starten")');

    // Verify on gallery
    await expect(page.locator('h1:has-text("Galerie")')).toBeVisible({ timeout: 5000 });
}

/**
 * Complete onboarding and return the recovery phrase for testing key import
 */
async function completeOnboardingAndGetKey(page: Page): Promise<string> {
    await page.goto('/');

    // Wait for loader
    await page.waitForTimeout(2500);

    // Step 1: Create key
    await expect(page.locator('text=Erstelle deinen Schlüssel')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Schlüssel erstellen")');

    // Wait for key generation
    await page.waitForTimeout(2000);

    // Step 1b: Get the recovery phrase
    await expect(page.locator('text=Notiere diese Wörter')).toBeVisible({ timeout: 10000 });

    // Collect phrase chunks from the grid
    const wordElements = page.locator('div.grid.grid-cols-3 span.font-mono');
    const words: string[] = [];
    const count = await wordElements.count();

    for (let i = 0; i < count; i++) {
        const word = await wordElements.nth(i).textContent();
        if (word) words.push(word.trim());
    }

    const recoveryPhrase = words.join('-');
    console.log('Generated recovery phrase:', recoveryPhrase);

    // Continue onboarding
    await page.click('button:has-text("Ich habe die Wörter notiert")');
    await page.click('button:has-text("Weiter")');

    // Step 2: Source selection
    await expect(page.locator('text=Wähle Backup-Quelle')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Fotos-App")');

    // Step 3: Plan selection
    await expect(page.locator('text=Wähle Speicherplan')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("FREE")');
    await page.click('button:has-text("PhotoVault starten")');

    // Verify on gallery
    await expect(page.locator('h1:has-text("Galerie")')).toBeVisible({ timeout: 5000 });

    return recoveryPhrase;
}

/**
 * Upload a test photo to the gallery
 */
async function uploadTestPhoto(page: Page) {
    // Ensure we're on gallery
    await page.click('button:has-text("Galerie")', { force: true });
    await expect(page.locator('h1:has-text("Galerie")')).toBeVisible({ timeout: 5000 });

    // Create a simple 1x1 PNG
    const buffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
        name: `test-photo-${Date.now()}.png`,
        mimeType: 'image/png',
        buffer,
    });

    // Wait for encryption and save
    await page.waitForTimeout(3000);
}
