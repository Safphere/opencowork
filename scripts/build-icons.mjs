/**
 * Build icons for all platforms
 * Generates .icns for Mac, .ico for Windows, and .png for Linux
 */
import icongen from 'icon-gen';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const buildDir = join(projectRoot, 'build');
const publicIconPath = join(projectRoot, 'public', 'icon.png');

// Ensure build directory exists
if (!existsSync(buildDir)) {
    mkdirSync(buildDir, { recursive: true });
    console.log('✓ Created build directory');
}

console.log('='.repeat(60));
console.log('OpenCowork Icon Generator');
console.log('='.repeat(60));
console.log('\n📝 Source icon:', publicIconPath);
console.log('📁 Output directory:', buildDir);

try {
    // Check if source icon exists
    const { existsSync } = await import('fs');
    if (!existsSync(publicIconPath)) {
        throw new Error(`Source icon not found: ${publicIconPath}`);
    }

    console.log('\n🔨 Generating icons...\n');

    // Generate icons for all platforms
    await icongen(publicIconPath, buildDir, {
        report: true,
        icns: {
            name: 'icon',
            sizes: [16, 32, 64, 128, 256, 512, 1024]
        },
        ico: {
            name: 'icon',
            sizes: [16, 32, 48, 256]
        },
        favicon: {
            name: 'favicon',
            pngSizes: [16, 32, 48],
            icoSizes: [16, 32, 48]
        }
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ Icon generation completed!');
    console.log('='.repeat(60));
    console.log('\n📦 Generated files:');
    console.log('   • build/icon.icns (Mac)');
    console.log('   • build/icon.ico (Windows)');
    console.log('   • build/favicon.ico (Web)');
    console.log('\n💡 Next steps:');
    console.log('   1. electron-builder will automatically use icon.icns for Mac');
    console.log('   2. electron-builder will automatically use icon.ico for Windows');
    console.log('   3. Run "npm run build" to create installers with custom icons');

} catch (error) {
    console.error('\n❌ Error generating icons:', error.message);
    console.error(error.stack);
    process.exit(1);
}
