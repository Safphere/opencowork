import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import os from 'os';
import { app } from 'electron';

export interface SkillDefinition {
    name: string;
    description: string;
    instructions: string;
    input_schema: Record<string, unknown>;
}

export class SkillManager {
    private skillsDir: string;
    private skills: Map<string, SkillDefinition> = new Map();

    getSkillNames(): string[] {
        return Array.from(this.skills.keys());
    }

    getSkillMetadata(): { name: string; description: string }[] {
        return Array.from(this.skills.values()).map(s => ({
            name: s.name,
            description: s.description
        }));
    }

    constructor() {
        this.skillsDir = path.join(os.homedir(), '.opencowork', 'skills');
    }

    async initializeDefaults() {
        console.log('[SkillManager] Initializing default skills...');
        console.log(`[SkillManager] App packaged: ${app.isPackaged}`);
        console.log(`[SkillManager] Resources path: ${app.isPackaged ? process.resourcesPath : 'N/A (dev mode)'}`);
        console.log(`[SkillManager] CWD: ${process.cwd()}`);

        try {
            // Determine source directory for default skills
            let sourceDir = '';
            const possiblePaths: string[] = [];

            if (app.isPackaged) {
                // In production, try multiple possible locations
                possiblePaths.push(
                    path.join(process.resourcesPath, 'skills'),  // Our electron-builder config
                    path.join(process.resourcesPath, 'resources', 'skills'),  // Alternative layout
                    path.join(process.resourcesPath, 'app.asar.unpacked', 'skills')  // Unpacked asar
                );
            } else {
                // In development
                possiblePaths.push(
                    path.join(process.cwd(), 'resources', 'skills'),
                    path.join(process.cwd(), 'skills')  // Alternative dev layout
                );
            }

            // Try each possible path
            for (const testPath of possiblePaths) {
                console.log(`[SkillManager] Checking path: ${testPath}`);
                try {
                    await fs.access(testPath);
                    sourceDir = testPath;
                    console.log(`[SkillManager] ✓ Found skills directory at: ${testPath}`);
                    break;
                } catch {
                    console.log(`[SkillManager] ✗ Path not found: ${testPath}`);
                }
            }

            if (!sourceDir) {
                console.error('[SkillManager] ❌ Could not find default skills directory in any of these locations:', possiblePaths);
                return;
            }

            console.log(`[SkillManager] Using source directory: ${sourceDir}`);

            // Ensure target directory exists
            try {
                await fs.access(this.skillsDir);
            } catch {
                console.log(`[SkillManager] Creating target skills directory: ${this.skillsDir}`);
                await fs.mkdir(this.skillsDir, { recursive: true });
            }

            // Copy files
            console.log('[SkillManager] Reading source directory...');
            const files = await fs.readdir(sourceDir);
            console.log(`[SkillManager] Found ${files.length} items in source directory`);

            let installedCount = 0;
            let skippedCount = 0;

            for (const file of files) {
                // Must be a directory (skills are folders now)
                try {
                    const stats = await fs.stat(path.join(sourceDir, file));
                    if (!stats.isDirectory()) {
                        console.log(`[SkillManager] Skipping non-directory item: ${file}`);
                        continue;
                    }
                } catch {
                    console.log(`[SkillManager] Skipping inaccessible item: ${file}`);
                    continue;
                }

                const targetPath = path.join(this.skillsDir, file);

                // Check if skill already exists to avoid re-copying on every startup
                try {
                    await fs.access(targetPath);
                    // Exists, skip
                    console.log(`[SkillManager] ⊙ Skipped existing skill: ${file}`);
                    skippedCount++;
                } catch {
                    // Doesn't exist, proceed to copy
                    try {
                        await fs.cp(path.join(sourceDir, file), targetPath, { recursive: true });
                        console.log(`[SkillManager] ✓ Installed default skill: ${file}`);
                        installedCount++;
                    } catch (e) {
                        console.error(`[SkillManager] ✗ Failed to install skill ${file}:`, e);
                    }
                }
            }

            console.log(`[SkillManager] ✅ Default skills initialization complete: ${installedCount} installed, ${skippedCount} skipped.`);
        } catch (e) {
            console.error('[SkillManager] ❌ Failed to initialize default skills:', e);
        }
    }

    private isLoading = false;
    private lastLoaded = 0;
    private readonly LOAD_COOLDOWN = 60000; // Increase cache to 60 seconds
    private defaultsInitialized = false;

    async loadSkills(force = false) {
        if (this.isLoading) {
            console.log('[SkillManager] Already loading skills, skipping concurrent request.');
            return;
        }

        // Skip if loaded recently (unless forced)
        if (!force && Date.now() - this.lastLoaded < this.LOAD_COOLDOWN) {
            console.log('[SkillManager] Skills loaded recently (cache hit), skipping reload.');
            return;
        }

        this.isLoading = true;
        console.log('[SkillManager] Starting loadSkills...');

        try {
            // Only initialize defaults ONCE per app session or if forced
            if (!this.defaultsInitialized || force) {
                // Wrap initializeDefaults in a timeout to prevent hanging
                const defaultsTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Defaults init timeout')), 5000));
                try {
                    await Promise.race([this.initializeDefaults(), defaultsTimeout]);
                    this.defaultsInitialized = true;
                } catch (e: any) {
                    console.error(`[SkillManager] Defaults initialization warning: ${e.message}`);
                }
            }

            console.log('[SkillManager] Clearing existing skills...');
            this.skills.clear();
            try {
                await fs.access(this.skillsDir);
            } catch {
                console.log('[SkillManager] No skills directory found, skipping load.');
                return; // No skills directory
            }

            console.log(`[SkillManager] Reading skills directory: ${this.skillsDir}`);
            const files = await fs.readdir(this.skillsDir);
            console.log(`[SkillManager] Found ${files.length} files/folders.`);

            for (const file of files) {
                // console.log(`[SkillManager] Checking file: ${file}`); // Reduced verbosity
                const filePath = path.join(this.skillsDir, file);
                let stats;
                try {
                    stats = await fs.stat(filePath);
                } catch { continue; }

                if (stats.isDirectory()) {
                    // Look for SKILL.md inside directory
                    const skillMdPath = path.join(filePath, 'SKILL.md');
                    try {
                        await fs.access(skillMdPath);
                        console.log(`[SkillManager] Parsing skill (directory): ${file}`);
                        await this.parseSkill(skillMdPath);
                    } catch {
                        // console.log(`[SkillManager] No SKILL.md found in ${file}`);
                    }
                } else if (file.endsWith('.md')) {
                    // Support legacy single-file skills
                    console.log(`[SkillManager] Parsing skill (file): ${file}`);
                    await this.parseSkill(filePath);
                }
            }
            this.lastLoaded = Date.now();
            console.log(`[SkillManager] Loaded ${this.skills.size} skills total.`);
        } finally {
            this.isLoading = false;
        }
    }

    private async parseSkill(filePath: string) {
        try {
            console.log(`[SkillManager] Reading content of ${filePath}`);
            const content = await fs.readFile(filePath, 'utf-8');
            const parts = content.split('---');
            if (parts.length < 3) {
                console.warn(`[SkillManager] Invalid frontmatter structure in ${filePath}`);
                return;
            }

            const frontmatter = yaml.load(parts[1]) as { name?: string; description?: string; input_schema?: Record<string, unknown> } | undefined;
            const instructions = parts.slice(2).join('---').trim();

            if (frontmatter && frontmatter.name && frontmatter.description) {
                console.log(`[SkillManager] Successfully loaded ${frontmatter.name}`);
                this.skills.set(frontmatter.name, {
                    name: frontmatter.name,
                    description: frontmatter.description,
                    input_schema: frontmatter.input_schema || { type: 'object', properties: {} },
                    instructions: instructions
                });
            } else {
                console.warn(`[SkillManager] Missing name/description in frontmatter of ${filePath}`);
            }
        } catch (e) {
            console.error(`[SkillManager] Failed to load skill from ${filePath}`, e);
        }
    }

    getTools() {
        return Array.from(this.skills.values()).map(skill => ({
            name: skill.name,
            description: skill.description,
            input_schema: skill.input_schema
        }));
    }

    getSkillInstructions(name: string): string | undefined {
        return this.getSkillInfo(name)?.instructions;
    }

    getSkillInfo(name: string): { instructions: string, skillDir: string } | undefined {
        // Try exact match first
        let skill = this.skills.get(name);
        let skillName = name;

        // Try underscore/hyphen swap if not found
        if (!skill) {
            const alternativeName = name.includes('_') ? name.replace(/_/g, '-') : name.replace(/-/g, '_');
            skill = this.skills.get(alternativeName);
            if (skill) skillName = alternativeName;
        }

        if (!skill) return undefined;

        // Return both instructions and the skill directory path
        const skillDir = path.join(this.skillsDir, skillName);
        return {
            instructions: skill.instructions,
            skillDir: skillDir
        };
    }
}
