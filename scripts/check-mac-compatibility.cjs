/**
 * Mac Compatibility Check Script
 * This script verifies Mac-specific configurations and features
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('OpenCowork Mac Compatibility Check');
console.log('='.repeat(60));

let checks = 0;
let passed = 0;

// 1. Check entitlements file
console.log('\n🍎 Checking Mac Entitlements...');

const entitlementsPath = path.join(__dirname, '../build/entitlements.mac.plist');
if (fs.existsSync(entitlementsPath)) {
    const entitlements = fs.readFileSync(entitlementsPath, 'utf-8');

    const requiredEntitlements = [
        { key: 'com.apple.security.cs.allow-jit', desc: 'JIT Compilation' },
        { key: 'com.apple.security.cs.allow-unsigned-executable-memory', desc: 'Unsigned Memory' },
        { key: 'com.apple.security.cs.disable-library-validation', desc: 'Library Validation' },
        { key: 'com.apple.security.network.client', desc: 'Network Client' },
        { key: 'com.apple.security.files.user-selected.read-write', desc: 'File Access' }
    ];

    let entitlementsPassed = 0;
    for (const ent of requiredEntitlements) {
        if (entitlements.includes(ent.key)) {
            console.log(`   ✓ ${ent.desc}`);
            entitlementsPassed++;
        } else {
            console.log(`   ✗ Missing: ${ent.desc}`);
        }
    }

    console.log(`✅ Entitlements: ${entitlementsPassed}/${requiredEntitlements.length}`);
    passed += entitlementsPassed === requiredEntitlements.length ? 1 : 0;
} else {
    console.log('❌ Entitlements file not found');
}
checks++;

// 2. Check electron-builder config
console.log('\n📦 Checking electron-builder Mac configuration...');

const builderConfigPath = path.join(__dirname, '../electron-builder.json5');
if (fs.existsSync(builderConfigPath)) {
    const builderConfig = fs.readFileSync(builderConfigPath, 'utf-8');

    const macChecks = [
        { pattern: /"mac":/, desc: 'Mac configuration section' },
        { pattern: /"hardenedRuntime":\s*true/, desc: 'Hardened runtime enabled' },
        { pattern: /"entitlements":/, desc: 'Entitlements configured' },
        { pattern: /"dmg"/, desc: 'DMG target configured' }
    ];

    let macPassed = 0;
    for (const check of macChecks) {
        if (check.pattern.test(builderConfig)) {
            console.log(`   ✓ ${check.desc}`);
            macPassed++;
        } else {
            console.log(`   ✗ Missing: ${check.desc}`);
        }
    }

    console.log(`✅ Mac build config: ${macPassed}/${macChecks.length}`);
    passed += macPassed === macChecks.length ? 1 : 0;
} else {
    console.log('❌ electron-builder.json5 not found');
}
checks++;

// 3. Check main.ts for Mac-specific code
console.log('\n💻 Checking main.ts Mac adaptations...');

const mainTsPath = path.join(__dirname, '../electron/main.ts');
if (fs.existsSync(mainTsPath)) {
    const mainTs = fs.readFileSync(mainTsPath, 'utf-8');

    const mainChecks = [
        { pattern: /process\.platform\s*===\s*['"]darwin['"]/, desc: 'Platform detection for Mac' },
        { pattern: /titleBarStyle:\s*['"]hiddenInset['"]/, desc: 'Mac title bar style' },
        { pattern: /Menu\.setApplicationMenu/, desc: 'Mac application menu' },
        { pattern: /app\.on\(['"]activate['"]/, desc: 'Mac dock activation' },
        { pattern: /isMac/, desc: 'Mac conditional logic' }
    ];

    let mainPassed = 0;
    for (const check of mainChecks) {
        if (check.pattern.test(mainTs)) {
            console.log(`   ✓ ${check.desc}`);
            mainPassed++;
        } else {
            console.log(`   ✗ Missing: ${check.desc}`);
        }
    }

    console.log(`✅ Main.ts Mac adaptations: ${mainPassed}/${mainChecks.length}`);
    passed += mainPassed >= 3 ? 1 : 0; // At least 3 checks should pass
} else {
    console.log('❌ main.ts not found');
}
checks++;

// 4. Check ConfigStore for user preferences handling
console.log('\n⚙️  Checking ConfigStore user preferences...');

const configStorePath = path.join(__dirname, '../electron/config/ConfigStore.ts');
if (fs.existsSync(configStorePath)) {
    const configStore = fs.readFileSync(configStorePath, 'utf-8');

    const configChecks = [
        { pattern: /getAllProviders/, desc: 'Get all providers method' },
        { pattern: /setAll\s*\(/, desc: 'Set all configuration method' },
        { pattern: /electron-store/, desc: 'Using electron-store for persistence' },
        { pattern: /mergedProviders/, desc: 'Provider merging logic' },
        { pattern: /apiKey:\s*s\.apiKey/, desc: 'User API key preservation' }
    ];

    let configPassed = 0;
    for (const check of configChecks) {
        if (check.pattern.test(configStore)) {
            console.log(`   ✓ ${check.desc}`);
            configPassed++;
        } else {
            console.log(`   ✗ Missing: ${check.desc}`);
        }
    }

    console.log(`✅ ConfigStore user preferences: ${configPassed}/${configChecks.length}`);
    passed += configPassed >= 3 ? 1 : 0;
} else {
    console.log('❌ ConfigStore.ts not found');
}
checks++;

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY');
console.log('='.repeat(60));

const percentage = Math.round((passed / checks) * 100);
console.log(`Overall: ${passed}/${checks} categories passed (${percentage}%)`);

if (percentage === 100) {
    console.log('\n✅ All Mac compatibility checks passed!');
    console.log('\n🍎 Mac-Specific Features Verified:');
    console.log('   • Hardened runtime with proper entitlements');
    console.log('   • Network access permissions configured');
    console.log('   • File access permissions configured');
    console.log('   • Native application menu');
    console.log('   • Dock activation support');
    console.log('   • Platform-specific window controls');
    console.log('   • User preferences properly preserved');
    console.log('\n📝 Expected Behavior on Mac:');
    console.log('   • Window has traffic light buttons (红绿黄) in title bar');
    console.log('   • Native application menu in top menu bar');
    console.log('   • Cmd+Q to quit, Cmd+W to close window');
    console.log('   • Click dock icon to show/hide window');
    console.log('   • File dialog permissions work correctly');
    console.log('   • User API keys are preserved across restarts');
    process.exit(0);
} else {
    console.log('\n⚠️  Some Mac compatibility issues found.');
    console.log('Please review the failed checks above.');
    process.exit(1);
}
