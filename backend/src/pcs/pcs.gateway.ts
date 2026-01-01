import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    namespace: 'pcs',
})
export class PcsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private logger: Logger = new Logger('PcsGateway');

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('ping')
    handlePing(client: Socket): string {
        return 'pong';
    }

    @SubscribeMessage('join_lan')
    handleJoinLan(client: Socket, lanId: string) {
        client.join(lanId);
        this.logger.log(`Client ${client.id} joined LAN room: ${lanId}`);
    }

    // Method to emit status updates to all connected clients
    emitStatusUpdate(pc: any, lanId: string) {
        // Emitir el objeto PC completo (incluyendo activeUser) a la sala del LAN Center
        this.server.to(lanId).emit('pc_status_update', pc);
        this.logger.log(`Emitted real-time update for PC ${pc.id} (${pc.name}) to room ${lanId}`);
    }
}
