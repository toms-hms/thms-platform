import path from 'path';
import dotenv from 'dotenv';

export default async function globalSetup() {
  // Load .env.test if present, otherwise fall back to .env
  const testEnvPath = path.join(__dirname, '../../.env.test');
  dotenv.config({ path: testEnvPath });
}
