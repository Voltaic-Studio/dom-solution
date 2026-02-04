
import { Page } from 'playwright';

export type BrowserAction = 
  | { type: 'click'; selector: string; description: string }
  | { type: 'type'; selector: string; text: string; description: string }
  | { type: 'scroll'; direction: 'up' | 'down'; amount?: number; description: string }
  | { type: 'wait'; duration: number; description: string }
  | { type: 'finish'; success: boolean; reason: string }
  | { type: 'solve_captcha'; description: string }; // Placeholder for complex logic

export interface AgentState {
  url: string;
  screenshot: Buffer;
  domSnapshot: string; // Simplified HTML or Accessibility Tree
  history: string[]; // Previous actions log
  goal: string;
}

export abstract class BaseAgent {
  abstract name: string;
  abstract run(state: AgentState): Promise<any>;
}
