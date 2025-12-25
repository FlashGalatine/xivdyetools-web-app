/**
 * XIV Dye Tools - Tool Navigation Fallback Tests
 *
 * Tests for fallback values when translations are missing
 * Improves branch coverage for tool-nav.ts
 */

import { getLocalizedTools } from '../tool-nav';
import { LanguageService } from '@services/index';

describe('tool-nav fallbacks', () => {
  describe('Budget Tool Fallbacks', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should use fallback value when budget title translation is empty', () => {
      const originalT = LanguageService.t;
      vi.spyOn(LanguageService, 't').mockImplementation((key: string) => {
        if (key === 'tools.budget.title') return '';
        return originalT.call(LanguageService, key);
      });

      const tools = getLocalizedTools();
      const budgetTool = tools.find(t => t.id === 'budget');

      expect(budgetTool?.name).toBe('Budget Suggestions');
    });

    it('should use fallback value when budget shortName translation is empty', () => {
      const originalT = LanguageService.t;
      vi.spyOn(LanguageService, 't').mockImplementation((key: string) => {
        if (key === 'tools.budget.shortName') return '';
        return originalT.call(LanguageService, key);
      });

      const tools = getLocalizedTools();
      const budgetTool = tools.find(t => t.id === 'budget');

      expect(budgetTool?.shortName).toBe('Budget');
    });

    it('should use fallback value when budget description translation is empty', () => {
      const originalT = LanguageService.t;
      vi.spyOn(LanguageService, 't').mockImplementation((key: string) => {
        if (key === 'tools.budget.description') return '';
        return originalT.call(LanguageService, key);
      });

      const tools = getLocalizedTools();
      const budgetTool = tools.find(t => t.id === 'budget');

      expect(budgetTool?.description).toBe('Find affordable dye alternatives');
    });

    it('should use fallback values when all budget translations are empty', () => {
      vi.spyOn(LanguageService, 't').mockImplementation((key: string) => {
        if (key.startsWith('tools.budget.')) return '';
        return key;
      });

      const tools = getLocalizedTools();
      const budgetTool = tools.find(t => t.id === 'budget');

      expect(budgetTool?.name).toBe('Budget Suggestions');
      expect(budgetTool?.shortName).toBe('Budget');
      expect(budgetTool?.description).toBe('Find affordable dye alternatives');
    });
  });
});
