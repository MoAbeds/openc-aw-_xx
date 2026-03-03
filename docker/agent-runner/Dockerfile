# ─────────────────────────────────────────────────────────────────────────────
# Agent Runner Dockerfile
# Based on OpenClaw for stateless, containerized AI Agent execution.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-slim

# Install system dependencies
# curl: for downloading skills and healthchecks
# ca-certificates: for SSL verification
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install OpenClaw globally
RUN npm install -g openclaw@latest

# Set working directory
WORKDIR /app/agent

# Create volume mount point for persistent memory
VOLUME /app/agent/memory

# Copy and prepare internal skills
COPY skills/ /app/internal-skills/

# Copy and prepare entrypoint script
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# OpenClaw Internal API Port
EXPOSE 4000

# Health check
# Checks the internal OpenClaw API every 15 seconds
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:4000/health || exit 1

# Environment variable defaults
ENV AGENT_NAME="Agent" \
    MODEL="claude-3-5-sonnet-latest" \
    CHANNEL_TYPE="direct" \
    SKILLS_MANIFEST="[]"

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
