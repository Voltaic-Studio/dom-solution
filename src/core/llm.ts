
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

export class LLMClient {
  private genAI: GoogleGenerativeAI;
  private openai: OpenAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });
  }

  async generateGemini(prompt: string, model: string = "gemini-1.5-flash") {
    const m = this.genAI.getGenerativeModel({ model });
    const result = await m.generateContent(prompt);
    return result.response.text();
  }

  async generateOpenAI(prompt: string, model: string = "gpt-4-turbo") {
    const completion = await this.openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model,
    });
    return completion.choices[0].message.content;
  }
}
