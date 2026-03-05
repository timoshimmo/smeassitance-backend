import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { TwilioService } from './twilio.service';
import { AiModule } from 'src/ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, TwilioService],
})
export class WhatsappModule {}
