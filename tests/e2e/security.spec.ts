import { test, expect } from '@playwright/test';

test.describe('Security & Forensics', () => {
    // We cannot easily seed data without SUPABASE_SERVICE_ROLE_KEY.
    // So we focus on the negative test which doesn't require a valid code if it works as intended (it should block).

    test('Phase 1: Vulnerability Check - Signup without code MUST FAIL', async ({ request }) => {
        try {
            // Attempt to signup directly via API without an access code
            const response = await request.post('/api/auth/sign-up/email', {
                data: {
                    email: `bypass-${Date.now()}@example.com`,
                    password: 'SecurePassword123!',
                    name: 'Hacker',
                    // No access code provided
                }
            });

            // If the server is not running, this might throw or return connection error.
            // If it runs:
            // - Before fix: 200 OK (Vulnerability exists)
            // - After fix: 400/500/403 (Protected)

            console.log(`Signup response status: ${response.status()}`);

            if (response.status() === 200) {
                 // Check if it actually created a user or just returned 200 with error (Better Auth sometimes does this?)
                 // Usually better-auth returns 200 with data.
                 const body = await response.json();
                 if (body.user) {
                     throw new Error('VULNERABILITY CONFIRMED: User created without access code!');
                 }
            }

            expect(response.status(), 'Signup without access code should not succeed').not.toBe(200);

        } catch (e: any) {
            if (e.message.includes('ECONNREFUSED')) {
                console.log('Server not running. Skipping test.');
                test.skip();
            } else {
                throw e;
            }
        }
    });

    test('Phase 4: Account Deletion Endpoint Check', async ({ request }) => {
        try {
            // We just check if the route exists (even if unauthorized)
            // It should NOT be 404.
            const response = await request.delete('/api/auth/delete-account');
            console.log(`Delete endpoint status: ${response.status()}`);
            expect(response.status()).not.toBe(404);
        } catch (e: any) {
             if (e.message.includes('ECONNREFUSED')) {
                test.skip();
            } else {
                throw e;
            }
        }
    });
});
