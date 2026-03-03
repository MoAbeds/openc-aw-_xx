import fp from "fastify-plugin";
import fastifyWebsocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";

export default fp(async (app: FastifyInstance) => {
    await app.register(fastifyWebsocket, {
        options: {
            maxPayload: 1_048_576, // 1 MiB
        },
    });
});
