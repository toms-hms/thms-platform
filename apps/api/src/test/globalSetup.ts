import path from 'path';
import dotenv from 'dotenv';

export default async function globalSetup() {
  const testEnvPath = path.join(__dirname, '../../.env.test');
  dotenv.config({ path: testEnvPath });
}
