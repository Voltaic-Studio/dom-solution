/**
 * Agent Orchestrator - The main agent loop
 * 
 * Perceive → Analyze → Plan → Execute → Evaluate → Repeat
 */

import { BrowserManager, Snapshot } from '../core/browser.js';
import { models, askVision, askGrounding } from '../llm/provider.js';
import { VISION_PROMPT, PLANNER_PROMPT } from '../prompts/index.js';
import { generateObject } from 'ai';
import { z } from 'zod';

const ActionSchema = z.object({
  action: z.enum(['click', 'type', 'scroll', 'wait', 'done']),
  target: z.string().describe("What to interact with"),
  value: z.string().optional().describe("Text to type"),
  reasoning: z.string().describe("Why this action")
});

type Action = z.infer<typeof ActionSchema>;

interface StepReward {
  urlChanged: boolean;
  newContentVisible: boolean;
  actionSucceeded: boolean;
  goalReached: boolean;
  score: number;
}

export interface AgentResult {
  success: boolean;
  stepsCompleted: number;
  totalReward: number;
  duration: number;
  history: { action: Action; reward: StepReward }[];
  finalUrl: string;
  error?: string;
}

export class AgentOrchestrator {
  private browser: BrowserManager;
  private history: { action: Action; reward: StepReward }[] = [];
  private totalReward = 0;
  private lastActions: string[] = []; // Track last 3 actions to prevent loops

  constructor() {
    this.browser = new BrowserManager();
  }

  async run(url: string, goal: string = 'complete the challenge', maxSteps = 50): Promise<AgentResult> {
    const startTime = Date.now();
    console.log(`🤖 Agent starting on ${url}`);
    console.log(`🎯 Goal: ${goal}\n`);

    try {
      const page = await this.browser.init(false);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.browser.wait(1000);

      let prevSnapshot: Snapshot | null = null;
      let sameStateCount = 0;

      for (let step = 0; step < maxSteps; step++) {
        console.log(`\n━━━ Step ${step + 1} ━━━`);

        const snapshot = await this.browser.getSnapshot();
        console.log(`📍 URL: ${snapshot.url}`);

        // Check for goal
        if (this.checkGoalReached(snapshot, goal)) {
          console.log(`\n🏆 Goal reached!`);
          break;
        }

        // Detect stuck state
        if (prevSnapshot && snapshot.url === prevSnapshot.url && snapshot.dom === prevSnapshot.dom) {
          sameStateCount++;
          if (sameStateCount >= 3) {
            console.log(`⚠️ Stuck detected, trying different approach`);
          }
        } else {
          sameStateCount = 0;
        }

        // 1. PERCEIVE (Vision)
        const visionAnalysis = await askVision(snapshot.screenshot, VISION_PROMPT);
        console.log(`👁️ Vision: ${visionAnalysis.slice(0, 120)}...`);

        // 2. BUILD CONTEXT
        const observation = `
Vision: ${visionAnalysis}
Elements: ${snapshot.interactiveElements}
Text: ${snapshot.dom.slice(0, 400)}
        `.trim();

        const historyStr = this.lastActions.slice(-3).join('\n') || 'None';
        const rewardFeedback = this.history.length > 0
          ? `Last: ${this.history[this.history.length - 1].reward.score.toFixed(1)}`
          : 'First action';

        // 3. PLAN
        const { object: plan } = await generateObject({
          model: models.fast,
          schema: ActionSchema,
          prompt: PLANNER_PROMPT
            .replace('{history}', historyStr)
            .replace('{observation}', observation)
            .replace('{reward_feedback}', rewardFeedback)
        });

        console.log(`🧠 Plan: ${plan.reasoning.slice(0, 80)}`);
        console.log(`   → ${plan.action} "${plan.target}"${plan.value ? ` = "${plan.value}"` : ''}`);

        // Only skip if we've done the EXACT same action 3+ times
        const actionKey = `${plan.action}:${plan.target}:${plan.value || ''}`;
        const repeatCount = this.lastActions.filter(a => a === actionKey).length;
        
        if (repeatCount >= 2 && plan.action === 'type') {
          console.log(`   ⚠️ Typed ${repeatCount}x, forcing submit...`);
          const forceSubmit = await this.trySubmit();
          if (forceSubmit) {
            this.lastActions.push('click:submit:');
            await this.browser.wait(800);
            const newSnap = await this.browser.getSnapshot();
            const reward = this.computeReward(newSnap, snapshot, true, false, this.checkGoalReached(newSnap, goal));
            this.history.push({ action: { ...plan, action: 'click', target: 'submit' }, reward });
            this.totalReward += reward.score;
            prevSnapshot = snapshot;
            continue;
          }
        }

        this.lastActions.push(actionKey);
        if (this.lastActions.length > 10) this.lastActions.shift();

        if (plan.action === 'done') {
          console.log(`\n🏁 Agent decided complete`);
          break;
        }

        // 4. EXECUTE
        const actionSuccess = await this.executeAction(plan, snapshot);
        console.log(`   ${actionSuccess ? '✓' : '✗'} ${actionSuccess ? 'Success' : 'Failed'}`);

        // 5. AUTO-SUBMIT after type
        if (plan.action === 'type' && actionSuccess) {
          console.log(`   → Auto-clicking submit...`);
          await this.browser.wait(300);
          await this.trySubmit();
        }

        await this.browser.wait(600);

        // 6. EVALUATE
        const newSnapshot = await this.browser.getSnapshot();
        const goalReached = this.checkGoalReached(newSnapshot, goal);
        const reward = this.computeReward(newSnapshot, snapshot, actionSuccess, false, goalReached);

        this.history.push({ action: plan, reward });
        this.totalReward += reward.score;

        console.log(`   📊 Reward: ${reward.score.toFixed(1)} (total: ${this.totalReward.toFixed(1)})`);

        if (goalReached) {
          console.log(`\n🏆 Goal reached!`);
          break;
        }

        prevSnapshot = snapshot;

        if (Date.now() - startTime > 300000) {
          console.log(`\n⏰ Timeout`);
          break;
        }
      }

      const duration = (Date.now() - startTime) / 1000;
      const finalSnapshot = await this.browser.getSnapshot();

      console.log(`\n${'═'.repeat(40)}`);
      console.log(`✅ Steps: ${this.history.length}`);
      console.log(`📊 Reward: ${this.totalReward.toFixed(1)}`);
      console.log(`⏱️ Time: ${duration.toFixed(1)}s`);
      console.log(`${'═'.repeat(40)}`);

      await this.browser.close();

      return {
        success: this.checkGoalReached(finalSnapshot, goal),
        stepsCompleted: this.history.length,
        totalReward: this.totalReward,
        duration,
        history: this.history,
        finalUrl: finalSnapshot.url
      };

    } catch (error) {
      console.error(`❌ Error: ${error}`);
      await this.browser.close();
      return {
        success: false,
        stepsCompleted: this.history.length,
        totalReward: this.totalReward,
        duration: (Date.now() - startTime) / 1000,
        history: this.history,
        finalUrl: '',
        error: String(error)
      };
    }
  }

  private async trySubmit(): Promise<boolean> {
    // Try common submit patterns
    const submitPatterns = [
      'Submit', 'Next', 'Continue', 'OK', 'Go', 'Enter', 'Proceed'
    ];
    
    for (const text of submitPatterns) {
      if (await this.browser.clickText(text)) {
        console.log(`   ✓ Clicked "${text}"`);
        return true;
      }
    }

    // Try button selectors
    const selectors = [
      'button[type="submit"]',
      'button:has-text("Submit")',
      'button:has-text("Next")',
      'input[type="submit"]'
    ];

    for (const sel of selectors) {
      if (await this.browser.click(sel)) {
        console.log(`   ✓ Clicked submit button`);
        return true;
      }
    }

    return false;
  }

  private async executeAction(plan: Action, snapshot: Snapshot): Promise<boolean> {
    const { action, target, value } = plan;

    switch (action) {
      case 'click':
        // Try text first
        if (await this.browser.clickText(target)) return true;
        
        // Try grounding
        const selector = await this.groundTarget(target, snapshot);
        if (selector && await this.browser.click(selector)) return true;
        
        // Common patterns
        const lower = target.toLowerCase();
        if (lower.includes('close') || lower.includes('dismiss') || lower.includes('x')) {
          for (const sel of ['button:has-text("×")', 'button:has-text("Close")', '.close', '[aria-label="Close"]']) {
            if (await this.browser.click(sel)) return true;
          }
        }
        if (lower.includes('accept')) {
          if (await this.browser.clickText('Accept')) return true;
        }
        return false;

      case 'type':
        if (!value) return false;
        const inputSel = await this.groundTarget(target, snapshot);
        if (inputSel && await this.browser.type(inputSel, value)) return true;
        if (await this.browser.typeIntoVisible(value)) return true;
        return false;

      case 'scroll':
        const dir = target.toLowerCase().includes('up') ? 'up' : 'down';
        await this.browser.scroll(dir);
        return true;

      case 'wait':
        await this.browser.wait(1000);
        return true;

      default:
        return false;
    }
  }

  private async groundTarget(target: string, snapshot: Snapshot): Promise<string | null> {
    try {
      const result = await askGrounding(snapshot.interactiveElements, target);
      return result.selector;
    } catch {
      return null;
    }
  }

  private computeReward(current: Snapshot, previous: Snapshot | null, actionSucceeded: boolean, errorOccurred: boolean, goalReached: boolean): StepReward {
    const urlChanged = previous ? current.url !== previous.url : false;
    const newContent = previous ? current.dom !== previous.dom : false;

    let score = 0;
    if (goalReached) score += 10;
    if (urlChanged) score += 3;
    if (newContent) score += 0.5;
    if (actionSucceeded) score += 0.5;
    if (!actionSucceeded) score -= 1;

    return { urlChanged, newContentVisible: newContent, actionSucceeded, goalReached, score };
  }

  private checkGoalReached(snapshot: Snapshot, goal: string): boolean {
    const url = snapshot.url.toLowerCase();
    const dom = snapshot.dom.toLowerCase();

    if (url.includes('finish') || url.includes('complete') || url.includes('success')) return true;
    if (dom.includes('congratulations') || dom.includes('challenge complete') || dom.includes('you win')) return true;

    // Check step progression (step2, step3, etc.)
    const stepMatch = url.match(/step(\d+)/);
    if (stepMatch && parseInt(stepMatch[1]) > 1) {
      // We're making progress
    }

    return false;
  }
}
