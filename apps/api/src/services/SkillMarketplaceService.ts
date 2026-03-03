import { redis } from "../lib/redis.js";
import axios from "axios";

export interface ClawHubSkill {
    id: string;
    name: string;
    description: string;
    author: string;
    downloads: number;
    tags: string[];
    codeUrl: string;
}

class SkillMarketplaceService {
    private readonly CACHE_KEY = "clawhub:skills";
    private readonly CACHE_TTL = 3600; // 1 hour

    async getMarketplaceSkills(): Promise<ClawHubSkill[]> {
        // 1. Try Cache
        const cached = await redis.get(this.CACHE_KEY);
        if (cached) {
            return JSON.parse(cached);
        }

        // 2. Fetch from ClawHub (Mocked for now as per requirements)
        // In reality: const res = await axios.get("https://clawhub.ai/api/v1/skills");
        const skills = this.getMockSkills();

        // 3. Cache and Return
        await redis.set(this.CACHE_KEY, JSON.stringify(skills), "EX", this.CACHE_TTL);
        return skills;
    }

    async downloadSkillCode(url: string): Promise<string> {
        // In production: const res = await axios.get(url); return res.data;
        // Mocking based on URL/ID
        if (url.includes("web-search")) return `// Web Search Skill\nmodule.exports = async (ctx) => { /* logic */ };`;
        if (url.includes("gmail")) return `// Gmail Integration Skill\nmodule.exports = async (ctx) => { /* logic */ };`;
        return `// Generic Skill\nmodule.exports = async (ctx) => { console.log("Skill executed"); };`;
    }

    private getMockSkills(): ClawHubSkill[] {
        return [
            {
                id: "web-search-v2",
                name: "Web Search Pro",
                description: "Deep research using Brave Search and Serper.",
                author: "OpenClaw Team",
                downloads: 4200,
                tags: ["search", "research"],
                codeUrl: "https://clawhub.ai/skills/web-search.js"
            },
            {
                id: "gmail-operator",
                name: "Gmail Operator",
                description: "Read, draft, and send emails via OAuth.",
                author: "ApexOS",
                downloads: 1540,
                tags: ["email", "productivity"],
                codeUrl: "https://clawhub.ai/skills/gmail.js"
            },
            {
                id: "slack-notifier",
                name: "Slack Notifier",
                description: "Push notifications to specific channels.",
                author: "Community",
                downloads: 890,
                tags: ["chat", "alerts"],
                codeUrl: "https://clawhub.ai/skills/slack.js"
            }
        ];
    }
}

export const skillMarketplaceService = new SkillMarketplaceService();
