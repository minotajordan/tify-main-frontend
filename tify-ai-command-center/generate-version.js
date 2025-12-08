import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.resolve(__dirname, 'package.json');
const versionFilePath = path.resolve(__dirname, 'version.json');

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  
  const versionInfo = {
    version: packageJson.version,
    buildDate: new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
    timestamp: Date.now()
  };
  
  fs.writeFileSync(versionFilePath, JSON.stringify(versionInfo, null, 2));
  console.log('✅ Version info generated:', versionInfo);
} catch (error) {
  console.error('❌ Error generating version info:', error);
  process.exit(1);
}
