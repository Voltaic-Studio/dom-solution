
import { LLMClient } from './llm';
import { Page } from 'playwright';

export class ExplorerAgent {
  constructor(private llm: LLMClient, private page: Page) {}

  async analyzeDOM() {
    // Extract interactive elements
    const elements = await this.page.evaluate(() => {
      const interactive = document.querySelectorAll('button, a, input, [role="button"]');
      return Array.from(interactive).map((el, i) => ({
        index: i,
        tag: el.tagName,
        text: el.textContent?.slice(0, 50) || "",
        visible: el.checkVisibility(),
      }));
    });

    const prompt = `Analyze these DOM elements and suggest the next logical action to solve a navigation puzzle:\n${JSON.stringify(elements)}`;
    const analysis = await this.llm.generateGemini(prompt, "gemini-1.5-flash");
    
    return analysis;
  }
}
