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

// Action schema - what the planner outputs
const ActionSchema = z.object({
  action: z.enum(['click', 'type', 'scroll', 'wait', 'done']),
  target: z.string().describe("What to interact with - text content, description, or element reference"),
  value: z.string().optional().describe("Text to type if action is 'type'"),
  reasoning: z.string().describe("Why this action makes sense")
});

type Action = z.infer<typeof ActionSchema>;

// Reward signals for learning
interface StepReward {
  urlChanged: boolean;
  newContentVisible: boolean;
  actionSucceeded: boolean;
  errorOccurred: boolean;
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
      await this.browser.wait(1000); // Let page settle

      let prevSnapshot: Snapshot | null = null;

      for (let step = 0; step < maxSteps; step++) {
        console.log(`\n━━━ Step ${step + 1} ━━━`);

        // 1. PERCEIVE
        const snapshot = await this.browser.getSnapshot();
        console.log(`📍 URL: ${snapshot.url}`);

        // 2. ANALYZE (Vision)
        const visionAnalysis = await askVision(snapshot.screenshot, VISION_PROMPT);
        console.log(`👁️ Vision: ${visionAnalysis.slice(0, 150)}...`);

        // 3. Build observation for planner
        const observation = `
Vision Analysis:
${visionAnalysis}

Interactive Elements:
${snapshot.interactiveElements}

Visible Text (excerpt):
${snapshot.dom.slice(0, 500)}
        `.trim();

        // Build reward feedback from history
        const rewardFeedback = this.history.length > 0
          ? `Last action reward: ${this.history[this.history.length - 1].reward.score.toFixed(2)}`
          : 'No previous actions';

        // 4. PLAN
        const { object: plan } = await generateObject({
          model: models.fast,
          schema: ActionSchema,
          prompt: PLANNER_PROMPT
            .replace('{history}', this.history.map(h => `${h.action.action}: ${h.action.target}`).join('\n'))
            .replace('{observation}', observation)
            .replace('{reward_feedback}', rewardFeedback)
        });

        console.log(`🧠 Plan: ${plan.reasoning}`);
        console.log(`   → ${plan.action} "${plan.target}"${plan.value ? ` with "${plan.value}"` : ''}`);

        // Check if done
        if (plan.action === 'done') {
          console.log(`\n🏁 Agent decided task is complete`);
          const reward = this.computeReward(snapshot, prevSnapshot, true, false, true);
          this.history.push({ action: plan, reward });
          this.totalReward += reward.score;
          break;
        }

        // 5. EXECUTE
        const actionSuccess = await this.executeAction(plan, snapshot);
        console.log(`   ${actionSuccess ? '✓' : '✗'} Action ${actionSuccess ? 'succeeded' : 'failed'}`);

        // Wait for page to update
        await this.browser.wait(800);

        // 6. EVALUATE (Reward)
        const newSnapshot = await this.browser.getSnapshot();
        const goalReached = this.checkGoalReached(newSnapshot, goal);
        const reward = this.computeReward(newSnapshot, snapshot, actionSuccess, false, goalReached);

        this.history.push({ action: plan, reward });
        this.totalReward += reward.score;

        console.log(`   📊 Reward: ${reward.score.toFixed(2)} (total: ${this.totalReward.toFixed(2)})`);

        if (goalReached) {
          console.log(`\n🏆 Goal reached!`);
          break;
        }

        prevSnapshot = snapshot;

        // Safety timeout
        if (Date.now() - startTime > 300000) {
          console.log(`\n⏰ 5 minute timeout`);
          break;
        }
      }

      const duration = (Date.now() - startTime) / 1000;
      const finalSnapshot = await this.browser.getSnapshot();

      console.log(`\n${'═'.repeat(40)}`);
      console.log(`✅ Steps: ${this.history.length}`);
      console.log(`📊 Total Reward: ${this.totalReward.toFixed(2)}`);
      console.log(`⏱️ Duration: ${duration.toFixed(1)}s`);
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

  private async executeAction(plan: Action, snapshot: Snapshot): Promise<boolean> {
    const { action, target, value } = plan;

    switch (action) {
      case 'click':
        // Try multiple strategies
        // 1. Try as text content
        if (await this.browser.clickText(target)) return true;
        
        // 2. Try grounding to get selector
        const selector = await this.groundTarget(target, snapshot);
        if (selector && await this.browser.click(selector)) return true;
        
        // 3. Try common patterns
        const lowerTarget = target.toLowerCase();
        if (lowerTarget.includes('close') || lowerTarget.includes('dismiss') || lowerTarget.includes('x')) {
          // Try common close button patterns
          for (const sel of ['button:has-text("×")', 'button:has-text("Close")', '[aria-label="Close"]', '.close']) {
            if (await this.browser.click(sel)) return true;
          }
        }
        if (lowerTarget.includes('submit') || lowerTarget.includes('next')) {
          for (const sel of ['button[type="submit"]', 'button:has-text("Submit")', 'button:has-text("Next")']) {
            if (await this.browser.click(sel)) return true;
          }
        }
        return false;

      case 'type':
        if (!value) return false;
        // 1. Try grounding
        const inputSelector = await this.groundTarget(target, snapshot);
        if (inputSelector && await this.browser.type(inputSelector, value)) return true;
        
        // 2. Try typing into any visible input
        if (await this.browser.typeIntoVisible(value)) return true;
        return false;

      case 'scroll':
        const direction = target.toLowerCase().includes('up') ? 'up' : 'down';
        await this.browser.scroll(direction);
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
      return result.selector || null;
    } catch {
      return null;
    }
  }

  private computeReward(
    current: Snapshot,
    previous: Snapshot | null,
    actionSucceeded: boolean,
    errorOccurred: boolean,
    goalReached: boolean
  ): StepReward {
    const urlChanged = previous ? current.url !== previous.url : false;
    const newContentVisible = previous ? current.dom !== previous.dom : false;

    let score = 0;

    // Positive rewards
    if (goalReached) score += 10;
    if (urlChanged) score += 2;  // Progress indicator
    if (newContentVisible) score += 0.5;  // Something changed
    if (actionSucceeded) score += 0.5;

    // Negative rewards
    if (errorOccurred) score -= 2;
    if (!actionSucceeded) score -= 1;

    return {
      urlChanged,
      newContentVisible,
      actionSucceeded,
      errorOccurred,
      goalReached,
      score
    };
  }

  private checkGoalReached(snapshot: Snapshot, goal: string): boolean {
    const url = snapshot.url.toLowerCase();
    const dom = snapshot.dom.toLowerCase();

    // Common success patterns
    if (url.includes('finish') || url.includes('complete') || url.includes('success')) {
      return true;
    }
    if (dom.includes('congratulations') || dom.includes('challenge complete') || dom.includes('you win')) {
      return true;
    }

    return false;
  }
}
