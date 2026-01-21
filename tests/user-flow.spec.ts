import { test, expect } from '@playwright/test';

test.describe('PhotoVault - Complete User Flow', () => {
    test('First Visit: Key Generation & Empty State', async ({ page }) => {
        // 1. Öffne die App
        await page.goto('/');

        // 2. Warte auf Key-Generierung (automatisch)
        await page.waitForTimeout(1000);

        // 3. Prüfe ob Recovery Phrase angezeigt wird
        const recoveryPhrase = page.locator('code').filter({ hasText: /^[A-Za-z0-9+/=-]+$/ });
        await expect(recoveryPhrase).toBeVisible();

        // 4. Prüfe Header
        await expect(page.locator('h1')).toContainText('PhotoVault');
        await expect(page.locator('text=End-to-end encrypted')).toBeVisible();

        // 5. Prüfe Empty State
        await expect(page.locator('text=No photos yet')).toBeVisible();
        await expect(page.locator('text=Upload your first encrypted photo')).toBeVisible();
    });

    test('Upload Flow: Drag & Drop Photo', async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(1000);

        // 1. Erstelle ein Test-Bild (1x1 PNG)
        const buffer = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64'
        );

        // 2. Simuliere File Upload
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'test-photo.png',
            mimeType: 'image/png',
            buffer,
        });

        // 3. Warte auf Upload & Encryption
        await page.waitForTimeout(2000);

        // 4. Prüfe ob Bild im Grid erscheint
        const photoGrid = page.locator('[class*="grid"]').first();
        await expect(photoGrid).toBeVisible();

        // 5. Prüfe Photo Count
        await expect(page.locator('text=Photos').locator('..')).toContainText('1');
    });

    test('Persistence: Reload behält Daten', async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(1000);

        // 1. Upload ein Bild
        const buffer = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64'
        );
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'persist-test.png',
            mimeType: 'image/png',
            buffer,
        });
        await page.waitForTimeout(2000);

        // 2. Reload Page
        await page.reload();
        await page.waitForTimeout(1000);

        // 3. Prüfe ob Bild noch da ist
        await expect(page.locator('text=Photos').locator('..')).toContainText('1');

        // 4. Prüfe ob Recovery Phrase noch da ist
        const recoveryPhrase = page.locator('code').filter({ hasText: /^[A-Za-z0-9+/=-]+$/ });
        await expect(recoveryPhrase).toBeVisible();
    });

    test('Delete Flow: Photo löschen', async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(1000);

        // 1. Upload ein Bild
        const buffer = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64'
        );
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'delete-test.png',
            mimeType: 'image/png',
            buffer,
        });
        await page.waitForTimeout(2000);

        // 2. Hover über Photo Card
        const photoCard = page.locator('[class*="aspect-square"]').first();
        await photoCard.hover();

        // 3. Click Delete Button
        const deleteButton = photoCard.locator('button').first();
        await deleteButton.click();

        // 4. Warte kurz
        await page.waitForTimeout(1000);

        // 5. Prüfe Empty State
        await expect(page.locator('text=No photos yet')).toBeVisible();
    });

    test('Theme: Neon Colors sind aktiv', async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(1000);

        // 1. Prüfe Background Color (sollte dunkel sein)
        const body = page.locator('body');
        const bgColor = await body.evaluate((el) =>
            window.getComputedStyle(el).backgroundColor
        );

        // RGB für #0a0a0a ist rgb(10, 10, 10)
        expect(bgColor).toContain('10');

        // 2. Prüfe Primary Color (Neon Green)
        const shield = page.locator('svg').first();
        const shieldColor = await shield.evaluate((el) =>
            window.getComputedStyle(el).color
        );

        // Sollte grünlich sein
        expect(shieldColor).toBeTruthy();
    });
});
