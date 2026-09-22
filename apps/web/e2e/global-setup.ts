import { clerkSetup } from '@clerk/testing/playwright';
import { config as loadEnv } from 'dotenv';
import path from 'path';

loadEnv({ path: path.resolve(__dirname, '../.env.test') });

export default async function globalSetup() {
  await clerkSetup();
}