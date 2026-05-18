import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

/**
 * MOCK-IMPL — see DEMO-TO-PROD-MIGRATION.md#chat-realtime
 * Demo-grade gateway: no auth on socket (REST API enforces RBAC for actual data fetch).
 * Real-time fanout only — client must re-fetch via HTTP after receiving event.
 * Productize: validate JWT cookie in handleConnection + verify project membership in handleJoin.
 */
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket): void {
    this.logger.debug(`Chat client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Chat client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { projectId: string },
  ): { ok: boolean; room: string } {
    const room = `project:${payload.projectId}`;
    void client.join(room);
    return { ok: true, room };
  }

  @SubscribeMessage('leave')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { projectId: string },
  ): { ok: boolean } {
    const room = `project:${payload.projectId}`;
    void client.leave(room);
    return { ok: true };
  }

  /**
   * Server-side trigger when a new message is posted.
   * Emits to all connected sockets in the project's room.
   */
  emitNewMessage(projectId: string, messageId: string): void {
    this.server
      .to(`project:${projectId}`)
      .emit('message:new', { projectId, messageId });
  }

  emitMessageRead(projectId: string, messageId: string, userId: string): void {
    this.server
      .to(`project:${projectId}`)
      .emit('message:read', { projectId, messageId, userId });
  }
}
