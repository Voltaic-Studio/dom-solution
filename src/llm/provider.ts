/**
 * LLM Provider - OpenRouter (one key, many models)
 * 
 * Uses OpenRouter's OpenAI-compatible API
 * https://openrouter.ai/models
 */

import { generateText, generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { GROUNDING_PROMPT } from '../prompts/index.js';

// OpenRouter uses OpenAI-compatible API
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
});

// Current models - check https://openrouter.ai/models for latest
export const models = {
  // Vision model (Gemini 2.5 for analyzing screenshots)
  vision: openrouter('google/gemini-2.5-flash'),
  
  // Planning model (Kimi K2 for reasoning and planning)
  fast: openrouter('moonshotai/kimi-k2'),
};

/**
 * Ask vision model to analyze a screenshot
 */
export async function askVision(imageBuffer: Buffer, prompt: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: models.vision,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image', image: imageBuffer }
          ]
        }
      ]
    });
    return text;
  } catch (error) {
    console.error('Vision error:', error);
    return '{"error": "Vision analysis failed", "suggestedAction": "try clicking visible buttons"}';
  }
}

/**
 * Ground a visual description to a CSS selector
 */
const GroundingSchema = z.object({
  selector: z.string().describe("CSS selector for the target element"),
  confidence: z.number().describe("0.0-1.0 confidence in the selector"),
  fallback: z.string().optional().describe("Alternative selector")
});

export async function askGrounding(
  interactiveElements: string,
  targetDescription: string
): Promise<{ selector: string | null; confidence: number }> {
  try {
    const { object } = await generateObject({
      model: models.fast,
      schema: GroundingSchema,
      prompt: GROUNDING_PROMPT
        .replace('{dom}', interactiveElements)
        .replace('{target}', targetDescription)
    });

    if (object.confidence > 0.5) {
      return { selector: object.selector, confidence: object.confidence };
    }
    return { selector: object.fallback || null, confidence: object.confidence };
  } catch (error) {
    console.error('Grounding error:', error);
    return { selector: null, confidence: 0 };
  }
}
