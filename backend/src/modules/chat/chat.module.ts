import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { ChatController } from './controllers/chat.controller';
import { ChatGateway } from './gateways/chat.gateway';
import { ChatRepository } from './repositories/chat.repository';
import { ChatService } from './services/chat.service';

@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [ChatService, ChatRepository, ChatGateway],
  exports: [ChatService, ChatRepository, ChatGateway],
})
export class ChatModule {}
