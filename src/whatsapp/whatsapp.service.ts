import { Injectable, Logger } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { GeminiService } from '../ai/gemini.service';
import { DbService } from '../database/db.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private twilio: TwilioService,
    private gemini: GeminiService,
    private db: DbService,
  ) {}

  async processIncomingMessage(from: string, text: string, to: string) {
    const tenant = await this.db.findTenantByWhatsApp(to);
    if (!tenant) {
      this.logger.error(`Tenant not found for WhatsApp number: ${to}`);
      return;
    }

    const aiResponse = await this.gemini.generateResponse(text, tenant);
    return this.twilio.sendMessage(from, aiResponse, to);
  }
}
