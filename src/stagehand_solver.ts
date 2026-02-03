
import { Stagehand } from "@browserbasehq/stagehand";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Ensure output dir
try { fs.mkdirSync("output", { recursive: true }); } catch {}

async function main() {
  console.log("🚀 Starting Stagehand Agent...");

  const stagehand = new Stagehand({
    env: "LOCAL",
    apiKey: process.env.BROWSERBASE_API_KEY, // Optional if running local Chrome
    verbose: 1,
    debugDom: true,
    modelName: "gemini-1.5-flash", // Use fast model
    modelClientOptions: { 
        apiKey: process.env.GEMINI_API_KEY 
    }
  });

  await stagehand.init();
  const page = stagehand.page;

  console.log("🌍 Navigating...");
  await page.goto("https://serene-frangipane-7fd25b.netlify.app");

  const startTime = Date.now();
  let completed = 0;

  // The Loop
  while ((Date.now() - startTime) < 300000) {
    try {
      // 1. Analyze
      // Stagehand automatically finds the best element based on instruction
      console.log(`\n🧩 Solving step...`);
      
      const actions = [
        "Click the button that says 'Start' or 'Next'",
        "Click the 'Close' button on the modal",
        "Enter the code revealed in the text",
        "Select the correct radio button option",
        "Click 'Submit'"
      ];

      // We ask Stagehand to pick the best action from a generic set + observation
      // Or we just give it a high level goal:
      const result = await stagehand.act({
        action: "Solve the current puzzle step. If there is a popup, close it. If there is a code, type it. If there is a next button, click it.",
      });

      if (result.success) {
        console.log("✅ Action executed:", result.message);
        completed++;
      } else {
        console.log("⚠️ Action failed, retrying...");
        await page.waitForTimeout(500);
      }

      // Check if finished
      const url = page.url();
      if (url.includes("/finish")) {
        console.log("🏆 Finished!");
        break;
      }

    } catch (e) {
      console.error("Loop error:", e);
      // Recovery logic
      await page.reload(); 
    }
  }

  await stagehand.close();
}

main().catch(console.error);
