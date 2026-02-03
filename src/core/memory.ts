
import fs from 'fs';

export class SkillMemory {
  private skills: Map<string, any> = new Map();
  private path = 'skills.json';

  constructor() {
    if (fs.existsSync(this.path)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.path, 'utf-8'));
        this.skills = new Map(Object.entries(data));
      } catch (e) {
        console.warn("Failed to load skills.json, starting fresh.");
      }
    }
  }

  getSkill(contextHash: string) {
    return this.skills.get(contextHash);
  }

  saveSkill(contextHash: string, action: any) {
    this.skills.set(contextHash, action);
    this.persist();
  }

  private persist() {
    fs.writeFileSync(this.path, JSON.stringify(Object.fromEntries(this.skills), null, 2));
  }
}
