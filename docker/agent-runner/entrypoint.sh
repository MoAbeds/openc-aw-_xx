#!/bin/sh
set -e

# Entrypoint for OpenClaw Agent Runner
# This script prepares the agent environment from workspace-injected env vars.

echo "--- 🤖 Initializing Agent: ${AGENT_NAME:-Unnamed Agent} ---"

# 1. Create CLAUDE.md (Persona & Instructions)
if [ -n "$AGENT_PERSONA" ]; then
    echo "Writing Persona to CLAUDE.md..."
    echo "$AGENT_PERSONA" > CLAUDE.md
else
    echo "# Agent: $AGENT_NAME" > CLAUDE.md
fi

# 2. Write .env (Core configuration)
# Note: These values are used by OpenClaw internally
echo "Writing .env configuration..."
cat <<EOF > .env
AGENT_NAME=$AGENT_NAME
MODEL=$MODEL
CHANNEL_TYPE=$CHANNEL_TYPE
CHANNEL_TOKEN=$CHANNEL_TOKEN
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
OPENCLAW_API_PORT=4000
EOF

# 3. Create skills directory and download manifest
mkdir -p skills
if [ -n "$SKILLS_MANIFEST" ] && [ "$SKILLS_MANIFEST" != "[]" ]; then
    echo "Processing Skills Manifest..."
    node -e "
        const { execSync } = require('child_process');
        try {
            const manifest = JSON.parse(process.env.SKILLS_MANIFEST);
            if (Array.isArray(manifest)) {
                manifest.forEach((url, i) => {
                    const filename = url.split('/').pop().split('?')[0] || \`skill_\${i}.js\`;
                    console.log(\`Downloading skill: \${url} -> skills/\${filename}\`);
                    execSync(\`curl -sSL \"\${url}\" -o \"skills/\${filename}\"\`);
                });
            }
        } catch (e) {
            console.error('Failed to parse or download skills:', e.message);
        }
    "
fi

# 4. Ensure memory directory exists (Volume mount point)
mkdir -p memory

echo "--- 🚀 Launching OpenClaw ---"

# Use exec to ensure signals (SIGTERM/SIGINT) are handled by the main process
exec openclaw start --headless --api-port 4000
