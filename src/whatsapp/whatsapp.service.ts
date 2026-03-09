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
    this.logger.log(`Processing: ${text} from ${from} to ${to}`);

    // 1. Identify the Business (Tenant) by the number receiving the message
    let tenant = await this.db.findTenantByBusinessNumber(to);

    // 2. Handle Onboarding (Special case: sender wants to register this 'to' number)
    if (text.toLowerCase().includes('onboard:')) {
      try {
        const payload = text.split('onboard:')[1];
        const [businessName, adminPhone] = payload
          .split(',')
          .map((s) => s.trim());

        // Ensure admin phone is in international format for Twilio
        const formattedAdminPhone = adminPhone.startsWith('whatsapp:')
          ? adminPhone
          : `whatsapp:${adminPhone}`;

        tenant = await this.db.saveTenantOnboarding({
          business_name: businessName,
          admin_phone: formattedAdminPhone,
          whatsapp_number: to,
        });
        return this.twilio.sendMessage(
          from,
          `✅ Registered ${businessName}! You are now the Admin of this number.`,
          to,
        );
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        return this.twilio.sendMessage(
          from,
          '❌ Use format: onboard: Name, Phone',
          to,
        );
      }
    }

    // 3. Check if the sender is the Admin
    const isAdmin = tenant && tenant.admin_phone === from;

    if (isAdmin && tenant && text.toLowerCase().includes('add product:')) {
      try {
        const payload = text.toLowerCase().split('add product:')[1];
        const [name, price] = payload.split(',').map((s) => s.trim());
        await this.db.addProduct(tenant._id, name, Number(price));
        return this.twilio.sendMessage(
          from,
          `✅ Added ${name} (₦${price}) to your catalog.`,
          to,
        );
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        return this.twilio.sendMessage(
          from,
          '❌ Error adding product. Use: add product: Name, Price',
          to,
        );
      }
    }

    // 4. AI Response (Contextual based on whether it's the Admin or a Customer)
    const context = tenant
      ? `You are the assistant for ${tenant.business_name}. ${isAdmin ? 'Speaking to the Owner.' : 'Speaking to a Customer.'}`
      : "You are a helpful assistant for a new business. Tell them to use 'onboard:' to start.";

    const aiResponse = await this.gemini.generateResponse(text, context);
    await this.twilio.sendMessage(from, aiResponse, to);
  }
}

/* Old version 1
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
*/
