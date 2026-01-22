/**
 * Build icons for all platforms
 * Generates .icns for Mac, .ico for Windows, and .png for Linux
 */
import icongen from 'icon-gen';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const iconsDir = join(projectRoot, 'resources/icons');
const buildDir = join(projectRoot, 'build');
const publicIconPath = join(projectRoot, 'public', 'icon.png');

// Ensure directories exist
for (const dir of [iconsDir, buildDir]) {
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        console.log(`✓ Created ${dir} directory`);
    }
}

console.log('='.repeat(60));
console.log('OpenCowork Icon Generator');
console.log('='.repeat(60));
console.log('\n📝 Source icon:', publicIconPath);
console.log('📁 Output directory:', iconsDir);
console.log('📁 Also copying to:', buildDir);

try {
    // Check if source icon exists
    const { existsSync } = await import('fs');
    if (!existsSync(publicIconPath)) {
        throw new Error(`Source icon not found: ${publicIconPath}`);
    }

    console.log('\n🔨 Generating icons...\n');

    // Generate icons to resources/icons (tracked by git)
    await icongen(publicIconPath, iconsDir, {
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

    // Copy to build directory for local development
    copyFileSync(join(iconsDir, 'icon.icns'), join(buildDir, 'icon.icns'));
    copyFileSync(join(iconsDir, 'icon.ico'), join(buildDir, 'icon.ico'));

    console.log('\n' + '='.repeat(60));
    console.log('✅ Icon generation completed!');
    console.log('='.repeat(60));
    console.log('\n📦 Generated files:');
    console.log('   • resources/icons/icon.icns (Mac - Git tracked)');
    console.log('   • resources/icons/icon.ico (Windows - Git tracked)');
    console.log('   • build/icon.icns (Mac - Local dev)');
    console.log('   • build/icon.ico (Windows - Local dev)');
    console.log('   • resources/icons/favicon.ico (Web)');
    console.log('\n💡 Next steps:');
    console.log('   1. Commit the new icons in resources/icons/');
    console.log('   2. electron-builder will use resources/icons/ for CI/CD');
    console.log('   3. Run "npm run build" to create installers with custom icons');

} catch (error) {
    console.error('\n❌ Error generating icons:', error.message);
    console.error(error.stack);
    process.exit(1);
}
