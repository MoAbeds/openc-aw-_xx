/**
 * Delegation Skill for OpenClaw Agents
 * Allows a parent agent to delegate tasks to subordinate agents in the fleet.
 */
export default {
    name: "delegate",
    description: "Delegates a task to another agent within the APEX fleet.",
    parameters: {
        type: "object",
        properties: {
            targetAgentId: {
                type: "string",
                description: "The unique identifier of the subordinate agent."
            },
            task: {
                type: "string",
                description: "The description or type of the task to be performed."
            },
            payload: {
                type: "object",
                description: "Any structured data required by the sub-agent for this task."
            }
        },
        required: ["targetAgentId", "task"]
    },
    async execute({ targetAgentId, task, payload }) {
        // The API URL is accessible via the network alias 'api' inside the 'apex-network'
        const API_BASE = process.env.APEX_API_URL || "http://api:3001";

        try {
            const response = await fetch(`${API_BASE}/api/internal/delegate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    targetAgentId,
                    task,
                    payload
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Delegation Protocol Error: ${errorText}`);
            }

            const result = await response.json();
            return {
                status: "success",
                message: `Task successfully enqueued for sub-agent ${targetAgentId}`,
                taskId: result.taskId
            };
        } catch (error) {
            return {
                status: "error",
                message: `Failed to delegate task: ${error.message}`
            };
        }
    }
};
