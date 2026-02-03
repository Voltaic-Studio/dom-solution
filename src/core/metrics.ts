export class MetricsCollector {
  private startTime: number = 0;
  private levels: { level: number; duration: number; status: string; actions: number }[] = [];
  private totalTokens = 0;
  private totalCost = 0;

  startRun() {
    this.startTime = Date.now();
    this.levels = [];
    console.log("📊 Metrics tracking started");
  }

  logLevel(level: number, duration: number, status: string, actions: number) {
    this.levels.push({ level, duration, status, actions });
  }

  addTokens(tokens: number, cost: number) {
    this.totalTokens += tokens;
    this.totalCost += cost;
  }

  endRun() {
    const totalTime = Date.now() - this.startTime;
    const successCount = this.levels.filter(l => l.status === "success").length;
    
    console.log("\n" + "=".repeat(50));
    console.log("📊 RUN STATISTICS");
    console.log("=".repeat(50));
    console.log(`Total Time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`Levels Solved: ${successCount}/${this.levels.length}`);
    console.log(`Total Tokens: ${this.totalTokens}`);
    console.log(`Total Cost: $${this.totalCost.toFixed(4)}`);
    console.log("=".repeat(50));
    
    // Per-level breakdown
    this.levels.forEach(l => {
      const icon = l.status === "success" ? "✅" : "❌";
      console.log(`  ${icon} Level ${l.level}: ${l.duration}ms (${l.actions} actions)`);
    });

    return { totalTime, successCount, totalTokens: this.totalTokens, totalCost: this.totalCost };
  }
}
