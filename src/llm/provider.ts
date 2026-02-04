
import { generateText, generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';

// We can swap this for Anthropic/OpenAI easily
const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Define model tiers
export const models = {
  // Fast Vision (for seeing the screen)
  vision: google('gemini-2.0-flash'), 
  
  // Reasoning (for planning the next move)
  reasoning: google('gemini-2.0-flash'),
  
  // Cheap/Fast (for DOM parsing)
  fast: google('gemini-1.5-flash'),
};

export async function askVision(imageBuffer: Buffer, prompt: string) {
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
}
