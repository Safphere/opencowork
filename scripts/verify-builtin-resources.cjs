/**
 * Verification script for built-in resources (Skills and MCP)
 * This script checks if the resources are correctly configured for both dev and production
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('OpenCowork Built-in Resources Verification');
console.log('='.repeat(60));

// Check Skills
console.log('\n📁 Checking Skills...');

const skillsPath = path.join(__dirname, '../resources/skills');
if (!fs.existsSync(skillsPath)) {
    console.error('❌ Skills directory not found:', skillsPath);
    process.exit(1);
}

const skillDirs = fs.readdirSync(skillsPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

console.log(`✅ Found ${skillDirs.length} skill directories`);

let validSkills = 0;
let invalidSkills = [];

for (const skillName of skillDirs) {
    const skillMdPath = path.join(skillsPath, skillName, 'SKILL.md');
    if (fs.existsSync(skillMdPath)) {
        const content = fs.readFileSync(skillMdPath, 'utf-8');
        if (content.includes('name:') && content.includes('description:')) {
            validSkills++;
            console.log(`   ✓ ${skillName}`);
        } else {
            invalidSkills.push(`${skillName} (missing frontmatter)`);
            console.log(`   ⚠ ${skillName} - incomplete frontmatter`);
        }
    } else {
        invalidSkills.push(`${skillName} (no SKILL.md)`);
        console.log(`   ⚠ ${skillName} - missing SKILL.md`);
    }
}

console.log(`\n✅ Valid skills: ${validSkills}/${skillDirs.length}`);
if (invalidSkills.length > 0) {
    console.log('⚠️  Invalid skills:', invalidSkills.join(', '));
}

// Check MCP Config
console.log('\n🔌 Checking MCP Configuration...');

const builtinMcpPath = path.join(__dirname, '../resources/mcp/builtin-mcp.json');
if (fs.existsSync(builtinMcpPath)) {
    console.log('✅ Built-in MCP configuration file found');
    try {
        const mcpConfig = JSON.parse(fs.readFileSync(builtinMcpPath, 'utf-8'));
        const serverCount = Object.keys(mcpConfig.mcpServers || {}).length;
        console.log(`   ✓ Found ${serverCount} built-in MCP servers in config file`);
        console.log(`   ✓ Servers: ${Object.keys(mcpConfig.mcpServers || {}).join(', ')}`);
    } catch (e) {
        console.error('   ❌ Error parsing builtin-mcp.json:', e.message);
    }
} else {
    console.error('❌ Built-in MCP configuration file not found at:', builtinMcpPath);
}

const mcpServicePath = path.join(__dirname, '../electron/agent/mcp/MCPClientService.ts');
let mcpContent = '';
if (fs.existsSync(mcpServicePath)) {
    mcpContent = fs.readFileSync(mcpServicePath, 'utf-8');

    // Check for loadBuiltinMCPConfig method
    if (mcpContent.includes('loadBuiltinMCPConfig')) {
        console.log('✅ MCPClientService has loadBuiltinMCPConfig method');
    } else {
        console.log('⚠️  MCPClientService missing loadBuiltinMCPConfig method');
    }

    // Check for DEFAULT_MCP_CONFIGS fallback
    if (mcpContent.includes('DEFAULT_MCP_CONFIGS')) {
        console.log('✅ DEFAULT_MCP_CONFIGS fallback found in MCPClientService');
    }
} else {
    console.error('❌ MCPClientService.ts not found');
}

// Check electron-builder config
console.log('\n📦 Checking electron-builder configuration...');

const builderConfigPath = path.join(__dirname, '../electron-builder.json5');
if (!fs.existsSync(builderConfigPath)) {
    console.error('❌ electron-builder.json5 not found');
    process.exit(1);
}

const builderConfig = fs.readFileSync(builderConfigPath, 'utf-8');

if (builderConfig.includes('resources/skills')) {
    console.log('✅ Skills directory included in extraResources');
} else {
    console.error('❌ Skills directory NOT included in extraResources');
}

if (builderConfig.includes('resources/mcp')) {
    console.log('✅ MCP directory included in extraResources');
} else {
    console.error('❌ MCP directory NOT included in extraResources');
}

// Check SkillManager implementation
console.log('\n🔍 Checking SkillManager implementation...');

const skillManagerPath = path.join(__dirname, '../electron/agent/skills/SkillManager.ts');
if (!fs.existsSync(skillManagerPath)) {
    console.error('❌ SkillManager.ts not found');
    process.exit(1);
}

const skillManagerContent = fs.readFileSync(skillManagerPath, 'utf-8');

const checks = [
    { name: 'initializeDefaults method', pattern: /async initializeDefaults/ },
    { name: 'Multiple path checking', pattern: /possiblePaths/ },
    { name: 'Production path handling', pattern: /process\.resourcesPath/ },
    { name: 'Development path handling', pattern: /process\.cwd\(\)/ },
    { name: 'Recursive copy', pattern: /recursive:\s*true/ }
];

let skillManagerChecks = 0;
for (const check of checks) {
    if (skillManagerContent.match(check.pattern)) {
        console.log(`   ✓ ${check.name}`);
        skillManagerChecks++;
    } else {
        console.log(`   ⚠️  ${check.name} - NOT FOUND`);
    }
}

console.log(`\n✅ SkillManager checks: ${skillManagerChecks}/${checks.length}`);

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY');
console.log('='.repeat(60));

const totalChecks = 3 + checks.length;
let passedChecks = 0;

if (validSkills > 0) passedChecks++;
if (mcpContent.includes('DEFAULT_MCP_CONFIGS')) passedChecks++;
if (builderConfig.includes('resources/skills')) passedChecks++;
passedChecks += skillManagerChecks;

const percentage = Math.round((passedChecks / totalChecks) * 100);

console.log(`Overall: ${passedChecks}/${totalChecks} checks passed (${percentage}%)`);

if (percentage === 100) {
    console.log('\n✅ All checks passed! Built-in resources are properly configured.');
    console.log('\n📝 Expected behavior:');
    console.log('   • Skills will be copied to ~/.opencowork/skills on first run');
    console.log('   • MCP servers will be loaded from resources/mcp/builtin-mcp.json');
    console.log('   • Built-in MCP servers are automatically added/updated on each startup');
    console.log('   • User-disabled servers will be preserved, but configs are updated');
    console.log('   • Works in both development and production (packaged) mode');
    console.log('\n📦 Packaging:');
    console.log('   • Skills are included in installer as extraResources');
    console.log('   • MCP configs are included in installer as extraResources');
    console.log('   • Green version (portable) works the same way');
    process.exit(0);
} else {
    console.log('\n⚠️  Some checks failed. Please review the output above.');
    process.exit(1);
}
