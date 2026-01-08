/**
 * XIV Dye Tools - Tool Navigation Tests
 *
 * Tests for the tool-nav module
 * Covers: getLocalizedTools function and TOOL_ICONS constant
 */

import { getLocalizedTools, TOOL_ICONS } from '../tool-nav';
import { LanguageService } from '@services/index';
import type { ToolId } from '@services/router-service';

// ============================================================================
// Tests
// ============================================================================

describe('tool-nav', () => {
  // ==========================================================================
  // getLocalizedTools Tests
  // ==========================================================================

  describe('getLocalizedTools', () => {
    it('should return an array of tools', () => {
      const tools = getLocalizedTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should include all expected tools', () => {
      const tools = getLocalizedTools();
      const toolIds = tools.map(t => t.id);

      expect(toolIds).toContain('harmony');
      expect(toolIds).toContain('matcher');
      expect(toolIds).toContain('accessibility');
      expect(toolIds).toContain('comparison');
      expect(toolIds).toContain('mixer');
      expect(toolIds).toContain('presets');
      expect(toolIds).toContain('budget');
    });

    it('should have correct structure for each tool', () => {
      const tools = getLocalizedTools();

      tools.forEach(tool => {
        expect(tool).toHaveProperty('id');
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('shortName');
        expect(tool).toHaveProperty('icon');
        expect(tool).toHaveProperty('description');

        expect(typeof tool.id).toBe('string');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.shortName).toBe('string');
        expect(typeof tool.icon).toBe('string');
        expect(typeof tool.description).toBe('string');
      });
    });

    it('should have SVG icons for each tool', () => {
      const tools = getLocalizedTools();

      tools.forEach(tool => {
        expect(tool.icon).toContain('<svg');
        expect(tool.icon).toContain('</svg>');
      });
    });

    it('should return localized names from LanguageService', () => {
      const tools = getLocalizedTools();
      const harmonyTool = tools.find(t => t.id === 'harmony');

      expect(harmonyTool).toBeDefined();
      // Verify it's using the translation function
      expect(harmonyTool?.name).toBe(LanguageService.t('tools.harmony.title'));
    });

    it('should return 8 tools total', () => {
      const tools = getLocalizedTools();
      expect(tools.length).toBe(8);
    });

    it('should have harmony as the first tool', () => {
      const tools = getLocalizedTools();
      expect(tools[0].id).toBe('harmony');
    });

    it('should have character as the last tool', () => {
      const tools = getLocalizedTools();
      expect(tools[tools.length - 1].id).toBe('character');
    });

    it('should have non-empty names and descriptions', () => {
      const tools = getLocalizedTools();

      tools.forEach(tool => {
        expect(tool.name.length).toBeGreaterThan(0);
        expect(tool.shortName.length).toBeGreaterThan(0);
        expect(tool.description.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // TOOL_ICONS Tests
  // ==========================================================================

  describe('TOOL_ICONS', () => {
    it('should have icons for all tool IDs', () => {
      const expectedToolIds: ToolId[] = [
        'harmony',
        'matcher',
        'accessibility',
        'comparison',
        'mixer',
        'presets',
        'budget',
      ];

      expectedToolIds.forEach(toolId => {
        expect(TOOL_ICONS[toolId]).toBeDefined();
      });
    });

    it('should have SVG content for each icon', () => {
      Object.values(TOOL_ICONS).forEach(icon => {
        expect(icon).toContain('<svg');
        expect(icon).toContain('</svg>');
      });
    });

    it('should match icons from getLocalizedTools', () => {
      const tools = getLocalizedTools();

      tools.forEach(tool => {
        expect(TOOL_ICONS[tool.id]).toBe(tool.icon);
      });
    });

    it('should have unique icons for each tool', () => {
      const icons = Object.values(TOOL_ICONS);
      const uniqueIcons = new Set(icons);

      expect(uniqueIcons.size).toBe(icons.length);
    });

    it('should have valid viewBox attribute in icons', () => {
      Object.values(TOOL_ICONS).forEach(icon => {
        expect(icon).toMatch(/viewBox="[\d\s]+"/);
      });
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration', () => {
    it('should be usable for navigation rendering', () => {
      const tools = getLocalizedTools();

      // Simulate rendering nav items
      const navItems = tools.map(tool => ({
        href: `/${tool.id}`,
        label: tool.name,
        icon: TOOL_ICONS[tool.id],
        isActive: false,
      }));

      expect(navItems.length).toBe(8);
      expect(navItems[0].href).toBe('/harmony');
    });

    it('should have matching tool IDs between function and constant', () => {
      const toolsFromFunction = getLocalizedTools().map(t => t.id);
      const idsFromConstant = Object.keys(TOOL_ICONS);

      expect(toolsFromFunction.sort()).toEqual(idsFromConstant.sort());
    });
  });
});
