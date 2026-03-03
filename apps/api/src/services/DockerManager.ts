import Docker from "dockerode";
import { AgentDTO } from "@apex-os/types";
import { env } from "../lib/env.js";
import path from "path";
import fs from "fs/promises";

export interface ContainerStatus {
    id: string;
    state: string;
    status: string;
    health?: string;
}

class DockerManager {
    private docker: Docker;

    constructor() {
        // Connect to local docker daemon
        // On Windows, this usually works if Docker Desktop is running
        this.docker = new Docker({ socketPath: process.platform === "win32" ? "//./pipe/docker_engine" : "/var/run/docker.sock" });
    }

    /**
     * Pulls the agent runner image if it doesn't exist locally
     */
    async ensureImage(image: string = "apex-os/agent-runner:latest"): Promise<void> {
        const images = await this.docker.listImages();
        const exists = images.some((img: any) => img.RepoTags?.includes(image));

        if (!exists) {
            console.log(`Pulling image ${image}...`);
            await new Promise((resolve, reject) => {
                this.docker.pull(image, (err: Error | null, stream: any) => {
                    if (err) return reject(err);
                    this.docker.modem.followProgress(stream, (err: Error | null, output: any) => {
                        if (err) return reject(err);
                        resolve(output);
                    });
                });
            });
        }
    }

    /**
     * Spawns a new agent container
     */
    async spawnAgent(agent: AgentDTO): Promise<string> {
        const containerName = `apex-agent-${agent.id}`;
        const image = "apex-os/agent-runner:latest";

        await this.ensureImage(image);

        // Prepare host memory directory
        const hostMemoryPath = path.resolve(process.cwd(), `../../data/agents/${agent.id}/memory`);
        await fs.mkdir(hostMemoryPath, { recursive: true });

        // Map AgentDTO to container Env
        const containerEnv = [
            `AGENT_NAME=${agent.name}`,
            `AGENT_PERSONA=${agent.persona || ""}`,
            `MODEL=${agent.model}`,
            `CHANNEL_TYPE=${agent.channel || "direct"}`,
            `CHANNEL_TOKEN=${process.env.CHANNEL_TOKEN || ""}`, // Should come from somewhere else in real app
            `ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY || ""}`,
            `SKILLS_MANIFEST=${JSON.stringify(agent.skills?.map(s => s.skillName) || [])}`, // Prompt says JSON array of URLs, but skillName is what we have for now. Actually, let's just send the whole config if needed.
        ];

        const container = await this.docker.createContainer({
            Image: image,
            name: containerName,
            Env: containerEnv,
            HostConfig: {
                Binds: [`${hostMemoryPath}:/app/agent/memory`],
                NetworkMode: "apex-network",
                RestartPolicy: { Name: "unless-stopped" },
            },
            Labels: {
                "apex.agentId": agent.id,
                "apex.workspaceId": agent.workspaceId,
            },
        });

        await container.start();

        // Wait for health check (max 30s)
        let attempts = 0;
        while (attempts < 30) {
            const data = await container.inspect();
            const health = (data.State as any).Health?.Status;
            if (health === "healthy") break;
            if (health === "unhealthy") throw new Error("Agent container failed health check");

            await new Promise(res => setTimeout(res, 1000));
            attempts++;
        }

        return container.id;
    }

    /**
     * Stops an agent container
     */
    async stopAgent(agentId: string): Promise<void> {
        const container = this.docker.getContainer(`apex-agent-${agentId}`);
        try {
            await container.stop();
        } catch (err: any) {
            if (err.statusCode !== 304 && err.statusCode !== 404) throw err;
        }
    }

    /**
     * Restarts an agent container
     */
    async restartAgent(agentId: string): Promise<void> {
        const container = this.docker.getContainer(`apex-agent-${agentId}`);
        await container.restart();
    }

    /**
     * Gets the current status of a container
     */
    async getContainerStatus(agentId: string): Promise<ContainerStatus> {
        const container = this.docker.getContainer(`apex-agent-${agentId}`);
        try {
            const data = await container.inspect();
            return {
                id: data.Id,
                state: (data.State as any).Status || "unknown",
                status: (data as any).Status || (data.State as any).Status || "unknown",
                health: (data.State as any).Health?.Status,
            };
        } catch (err: any) {
            if (err.statusCode === 404) {
                return { id: "", state: "not_found", status: "Container not found" };
            }
            throw err;
        }
    }

    /**
     * Streams logs from the container and forwards them to a callback
     */
    async streamLogs(agentId: string, onLog: (line: string) => void): Promise<void> {
        const container = this.docker.getContainer(`apex-agent-${agentId}`);
        const stream = await container.logs({
            follow: true,
            stdout: true,
            stderr: true,
            timestamps: true,
            tail: 10,
        });

        container.modem.demuxStream(stream, process.stdout, process.stderr); // Optional: also log to console

        stream.on("data", (chunk: Buffer) => {
            // Docker logs are multiplexed, they have a header. demuxStream handles it if we pass it streams.
            // But if we want to process it as string lines for a callback:
            const line = chunk.toString("utf8").trim();
            if (line) onLog(line);
        });

        stream.on("error", (err) => {
            console.error(`Log stream error for agent ${agentId}:`, err);
        });
    }

    /**
     * Lists all agent containers managed by Apex
     */
    async listAgentContainers(): Promise<any[]> {
        return this.docker.listContainers({
            all: true,
            filters: JSON.stringify({ label: ["apex.agentId"] }),
        });
    }
}

export const dockerManager = new DockerManager();
export default dockerManager;
