/**
 * Server-side constants for nuxt-claude-devtools
 * Defines file paths, directory names, and configuration file names
 */

// ============ Directory Names ============

/**
 * Claude's standard configuration directory
 * Contains: commands, agents, skills, docs
 * Standard location recognized by Claude CLI
 */
export const CLAUDE_DIR = '.claude'

/**
 * DevTools-specific data directory
 * Contains: history.json, settings.json, share.json, llms.json
 * Separate from .claude to avoid conflicts with Claude CLI
 */
export const DEVTOOLS_DATA_DIR = '.claude-devtools'

// ============ Subdirectory Names (inside .claude) ============

/**
 * Directory for custom slash commands
 * Path: .claude/commands/
 */
export const COMMANDS_SUBDIR = 'commands'

/**
 * Directory for agent definitions
 * Path: .claude/agents/
 */
export const AGENTS_SUBDIR = 'agents'

/**
 * Directory for skill definitions
 * Path: .claude/skills/
 */
export const SKILLS_SUBDIR = 'skills'

/**
 * Directory for project documentation
 * Path: .claude/docs/
 * Claude automatically reads files from this directory
 */
export const DOCS_SUBDIR = 'docs'

// ============ File Names ============

/**
 * Project guidelines file in repository root
 * Claude reads this file for project-specific instructions
 */
export const CLAUDE_MD_FILE = 'CLAUDE.md'

/**
 * Skill definition file name inside skill subdirectories
 * Path: .claude/skills/<skill-name>/SKILL.md
 */
export const SKILL_FILE = 'SKILL.md'

/**
 * Conversation history storage
 * Path: .claude-devtools/history.json
 */
export const HISTORY_FILE = 'history.json'

/**
 * DevTools settings storage
 * Path: .claude-devtools/settings.json
 */
export const SETTINGS_FILE = 'settings.json'

/**
 * Collaborative sharing data
 * Path: .claude-devtools/share.json
 */
export const SHARE_FILE = 'share.json'

/**
 * External documentation sources (llms.txt URLs)
 * Path: .claude-devtools/llms.json
 */
export const LLMS_FILE = 'llms.json'

// ============ File Extensions ============

/**
 * Default extension for markdown resources
 */
export const MD_EXTENSION = '.md'
