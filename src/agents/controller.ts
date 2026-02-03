
import { LLMClient } from '../core/llm';

export class ControllerAgent {
  constructor(private llm: LLMClient) {}

  async plan(level: number, domState: any, history: any[]) {
    // Strategy: Use a strong model to decide the next move or fallback to exploration
    const prompt = `
      You are the Strategic Controller for a DOM-based automation agent.
      Current Level: ${level}
      
      DOM Interactive Elements:
      ${JSON.stringify(domState, null, 2)}
      
      Action History:
      ${JSON.stringify(history)}
      
      Goal: Identify the single most likely element to click or interact with to solve the puzzle.
      If the solution is obvious (e.g. "Click Me", "Next", "Submit"), choose it.
      If it requires exploration, choose the most promising candidate.
      
      Return ONLY a JSON object: { "action": "click" | "type", "index": number, "value": string (if typing), "reason": string }
    `;

    try {
      // Default to Gemini Pro/Flash for speed/cost balance, configurable to Opus
      const response = await this.llm.generateGemini(prompt, "gemini-1.5-flash"); 
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error("Controller planning failed:", e);
      return { action: "wait", reason: "Error in planning" };
    }
  }
}
