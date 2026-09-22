import { test, expect } from '@playwright/test';
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright';

test.describe('Login — ContaHub', () => {
  test('contador consegue logar e ver o dashboard', async ({ page }) => {
    test.setTimeout(60_000);

    await setupClerkTestingToken({ page });

    // padrão oficial: carrega a raiz primeiro, não a rota protegida
    await page.goto('/');
    await clerk.loaded({ page });

  await clerk.signIn({
  page,
  signInParams: {
    strategy: 'password',
    identifier: process.env.E2E_CLERK_USER_EMAIL!,
    password: process.env.E2E_CLERK_USER_PASSWORD!,
  },
});

// ── DEBUG detalhado do estado do signIn attempt ──
const signInStatus = await page.evaluate(() => {
  const clerk = (window as any).Clerk;
  return {
    signInStatus: clerk?.client?.signIn?.status,
    firstFactorStatus: clerk?.client?.signIn?.firstFactorVerification?.status,
    createdSessionId: clerk?.client?.signIn?.createdSessionId,
    sessionId: clerk?.session?.id,
  };
});
console.log('DEBUG signIn attempt:', JSON.stringify(signInStatus, null, 2));
    // ── FIM DEBUG ──

    // navegação real pra rota protegida, não reload
    await page.goto('/dashboard');

    console.log('DEBUG URL final:', page.url());

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});