import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

export class LLMClient {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  }

  async generate(prompt: string, model: string = "gemini-2.5-flash") {
    const m = this.genAI.getGenerativeModel({ model });
    const result = await m.generateContent(prompt);
    return result.response.text();
  }
}
