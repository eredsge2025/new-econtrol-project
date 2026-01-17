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

    @SubscribeMessage('join_user')
    handleJoinUser(client: Socket, userId: string) {
        client.join(`user-${userId}`);
        this.logger.log(`Client ${client.id} joined User room: user-${userId}`);
    }

    // Method to emit status updates to all connected clients
    emitStatusUpdate(pc: any, lanId: string) {
        // Emitir el objeto PC completo (incluyendo activeUser) a la sala del LAN Center
        this.server.to(lanId).emit('pc_status_update', pc);
        this.logger.log(`Emitted real-time update for PC ${pc.id} (${pc.name}) to room ${lanId}`);
    }

    // Explicitly emit balance update to the user room
    emitBalanceUpdate(userId: string, newBalance: number) {
        this.server.to(`user-${userId}`).emit('balance_updated', { userId, balance: newBalance });
        this.logger.log(`Emitted real-time balance update for User ${userId}: S/ ${newBalance}`);
    }
}
