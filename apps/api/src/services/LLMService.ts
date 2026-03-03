import Anthropic from "@anthropic-ai/sdk";
import { env } from "../lib/env.js";

const anthropic = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY || "",
});

export interface CourseExtractionResult {
    persona: string;
    suggestedSkills: string[];
    extractedFrameworks: string[];
}

export class LLMService {
    async extractAgentFromCourse(
        transcript: string,
        focusArea: string
    ): Promise<CourseExtractionResult> {
        if (!env.ANTHROPIC_API_KEY) {
            // Mock response if no API key is set for now (to avoid blocking build)
            return this.getMockExtraction(focusArea);
        }

        const systemPrompt = `You are an expert at distilling educational content into AI agent personas.
Given this course transcript, create a CLAUDE.md persona that makes an AI agent deeply knowledgeable in the taught methodology.

The agent should focus specifically on: ${focusArea}

Your response must be a valid JSON object with the following structure:
{
  "persona": "The full content for a CLAUDE.md file using professional markdown, including sections for <role>, <context>, <mission>, <framework_application>, and <tone_and_style>.",
  "suggestedSkills": ["List of 3-5 generic skill names that would complement this agent, e.g., 'Web Search', 'Data Analysis', 'Email Outreach'"],
  "extractedFrameworks": ["List of core frameworks or methodologies mentioned in the transcript"]
}`;

        try {
            const msg = await anthropic.messages.create({
                model: "claude-3-5-sonnet-20240620",
                max_tokens: 4000,
                system: systemPrompt,
                messages: [{ role: "user", content: transcript }],
            });

            const content = msg.content && msg.content[0]?.type === 'text' ? msg.content[0].text : '';
            return JSON.parse(content) as CourseExtractionResult;
        } catch (err) {
            console.error("LLM Extraction Error:", err);
            return this.getMockExtraction(focusArea);
        }
    }

    async *diagnoseAgentStream(agentData: any): AsyncGenerator<string> {
        if (!env.ANTHROPIC_API_KEY) {
            yield "AI Diagnosis is currently in mock mode. Root cause: Socket hangup during container initialization. Fix: Ensure the Docker daemon is accessible and the network 'apex-network' exists. [FIX: restart_container]";
            return;
        }

        const systemPrompt = `You are an OpenClaw agent debugging expert. Analyze this agent failure and provide: 
1) root cause, 
2) fix steps, 
3) config changes needed. 
Be specific and actionable.

Available Actions (if applicable, mention them exactly as [ACTION: identifier]):
- [ACTION: restart_container]
- [ACTION: regenerate_api_key]
- [ACTION: reinstall_skill:SKILL_NAME]`;

        try {
            const stream = await anthropic.messages.create({
                model: "claude-3-5-sonnet-20240620",
                max_tokens: 2000,
                system: systemPrompt,
                messages: [{ role: "user", content: JSON.stringify(agentData) }],
                stream: true,
            });

            for await (const event of stream) {
                if (event.type === 'content_block_delta' && (event.delta as any).text) {
                    yield (event.delta as any).text;
                }
            }
        } catch (err) {
            console.error("LLM Diagnosis Error:", err);
            yield "Failed to generate diagnosis via AI.";
        }
    }

    private getMockExtraction(focusArea: string): CourseExtractionResult {
        return {
            persona: `# Agent Persona: ${focusArea} Expert\n\nDerived from course transcript.\n\n## Role\nYou are a high-level specialist in ${focusArea}.\n\n## Mission\nApply course methodologies to user queries.`,
            suggestedSkills: ["Web Search", "Methodology Compliance", "Outreach"],
            extractedFrameworks: [`${focusArea} Core Framework`],
        };
    }
}

export const llmService = new LLMService();
