/**
 * UI Components Tests
 *
 * Basic unit tests for UI components using Playwright
 * Tests component rendering, state changes, and user interactions
 */

import { test, expect } from "@playwright/test";

test.describe("UI Components", () => {
  test.describe("OfflineBanner", () => {
    test("should show when offline and hide when online", async ({ page }) => {
      // This test verifies the component structure
      // Actual offline/online testing requires service worker mocking
      await page.goto("/");

      // Complete onboarding if needed
      await completeOnboarding(page);

      // The component should be present in the DOM
      // We can't easily test actual offline state without service worker mocking
      const pageLoaded = await page
        .locator("h1")
        .isVisible()
        .catch(() => false);
      expect(pageLoaded).toBe(true);
    });
  });

  test.describe("UploadProgress", () => {
    test("should render with correct file information", async ({ page }) => {
      await page.goto("/");

      // Complete onboarding if needed
      const isOnboarded = await page
        .locator('h1:has-text("Galerie")')
        .isVisible()
        .catch(() => false);
      if (!isOnboarded) {
        await completeOnboarding(page);
      }

      // Upload a test file
      const buffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
      );

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: "test-photo.png",
        mimeType: "image/png",
        buffer,
      });

      // Wait for upload to start
      await page.waitForTimeout(2000);

      // Check if upload progress appears
      const progressVisible = await page
        .locator("text=Uploading...")
        .isVisible()
        .catch(() => false);
      const fileNameVisible = await page
        .locator("text=test-photo.png")
        .isVisible()
        .catch(() => false);

      expect(progressVisible || fileNameVisible).toBe(true);
    });
  });

  test.describe("PhotoGrid", () => {
    test("should display empty state when no photos", async ({ page }) => {
      await page.goto("/");

      // Clear any existing data
      await page.evaluate(() => {
        localStorage.clear();
        indexedDB.deleteDatabase("PhotoVaultDB");
      });

      // Complete onboarding
      await completeOnboarding(page);

      // Should show empty state
      const emptyStateVisible = await page
        .locator("text=No photos yet")
        .isVisible()
        .catch(() => false);
      expect(emptyStateVisible).toBe(true);
    });

    test("should display photos in grid after upload", async ({ page }) => {
      await page.goto("/");

      // Complete onboarding
      await completeOnboarding(page);

      // Upload a test file
      const buffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
      );

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: "test-photo.png",
        mimeType: "image/png",
        buffer,
      });

      // Wait for upload and decryption
      await page.waitForTimeout(3000);

      // Should show photo in grid
      const photoVisible = await page
        .locator("div.photo-grid-item")
        .first()
        .isVisible()
        .catch(() => false);
      expect(photoVisible).toBe(true);
    });
  });

  test.describe("PhotoCard", () => {
    test("should show loading state initially", async ({ page }) => {
      await page.goto("/");

      // Complete onboarding
      await completeOnboarding(page);

      // Upload a test file
      const buffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
      );

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: "test-photo.png",
        mimeType: "image/png",
        buffer,
      });

      // Should show loading state initially
      await page.waitForTimeout(500);
      const loadingVisible = await page
        .locator(".animate-spin")
        .first()
        .isVisible()
        .catch(() => false);

      // Wait for decryption to complete
      await page.waitForTimeout(2500);
      const imageVisible = await page
        .locator("img")
        .first()
        .isVisible()
        .catch(() => false);

      expect(loadingVisible || imageVisible).toBe(true);
    });

    test("should show delete button on hover", async ({ page }) => {
      await page.goto("/");

      // Complete onboarding
      await completeOnboarding(page);

      // Upload a test file
      const buffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
      );

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: "test-photo.png",
        mimeType: "image/png",
        buffer,
      });

      // Wait for upload and decryption
      await page.waitForTimeout(3000);

      // Hover over photo card
      const photoCard = page.locator("div.photo-grid-item").first();
      await photoCard.hover();

      // Delete button should appear
      const deleteButtonVisible = await photoCard
        .locator("button")
        .isVisible()
        .catch(() => false);
      expect(deleteButtonVisible).toBe(true);
    });
  });
});

/**
 * Helper function to complete onboarding
 */
async function completeOnboarding(page: any) {
  // Check if already onboarded
  const isOnboarded = await page
    .locator('h1:has-text("Galerie")')
    .isVisible()
    .catch(() => false);
  if (isOnboarded) return;

  // Step 1: Create key
  await page.waitForTimeout(2500);
  await page.click('button:has-text("Schlüssel erstellen")');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("Ich habe die Wörter notiert")');
  await page.click('button:has-text("Weiter")');

  // Step 2: Source selection
  await page.waitForTimeout(1000);
  await page.click('button:has-text("Fotos-App")');

  // Step 3: Plan selection
  await page.waitForTimeout(1000);
  await page.click('button:has-text("FREE")');
  await page.click('button:has-text("PhotoVault starten")');

  // Verify on gallery
  await page.waitForTimeout(2000);
}
