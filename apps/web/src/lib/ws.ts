import { EventEmitter } from "events";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";

class WsManager extends EventEmitter {
    private socket: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private token: string | null = null;

    connect(token: string) {
        this.token = token;
        const url = `${WS_URL}/ws/fleet?token=${token}`;

        if (this.socket?.readyState === WebSocket.OPEN) return;

        console.log("🔌 Connecting to APEX OS Fleet Stream...");
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.log("✅ Fleet Stream connected");
            this.reconnectAttempts = 0;
            this.emit("connected");
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.emit("message", data);
                if (data.type) {
                    this.emit(data.type, data.payload || data);
                }
            } catch (err) {
                console.error("Failed to parse WS message:", err);
            }
        };

        this.socket.onclose = (event) => {
            console.warn("❌ Fleet Stream disconnected", event.reason);
            this.emit("disconnected");
            this.handleReconnect();
        };

        this.socket.onerror = (err) => {
            console.error("WS Error:", err);
            this.emit("error", err);
        };
    }

    private handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
            console.log(`🔄 Reconnecting in ${delay}ms... (Attempt ${this.reconnectAttempts})`);
            setTimeout(() => {
                if (this.token) this.connect(this.token);
            }, delay);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    subscribeToLogs(agentId: string) {
        if (!this.token) return;
        const url = `${WS_URL}/ws/logs/${agentId}?token=${this.token}`;
        const logSocket = new WebSocket(url);

        logSocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.emit(`logs:${agentId}`, data);
            } catch (err) {
                console.error("Failed to parse agent logs:", err);
            }
        };

        return () => logSocket.close();
    }
}

export const wsManager = new WsManager();
export default wsManager;
