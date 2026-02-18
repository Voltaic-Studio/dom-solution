/**
 * Agent Types
 */

export type BrowserAction = 
  | { type: 'click'; target: string; description: string }
  | { type: 'type'; target: string; text: string; description: string }
  | { type: 'scroll'; direction: 'up' | 'down'; description: string }
  | { type: 'wait'; duration: number; description: string }
  | { type: 'done'; success: boolean; reason: string };

export interface AgentState {
  url: string;
  screenshot: Buffer;
  dom: string;
  interactiveElements: string;
  history: string[];
  goal: string;
}
