import { Injectable, Logger } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { GeminiService } from '../ai/gemini.service';
import { DbService } from '../database/db.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private twilio: TwilioService,
    private gemini: GeminiService,
    private db: DbService,
    private config: ConfigService,
  ) {}

  async processIncomingMessage(from: string, text: string, to: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const PLATFORM_NUMBER =
      this.config.get('PLATFORM_NUMBER') || 'whatsapp:+14155238886';
    this.logger.log(`Processing: ${text} from ${from} to ${to}`);

    // 1. PLATFORM FLOW: User is messaging the main platform number
    if (to === PLATFORM_NUMBER) {
      if (text.toLowerCase().includes('onboard:')) {
        return this.handleOnboarding(from, text, to);
      }

      const platformContext =
        "You are the SME Assistant Onboarding Consultant. Your goal is to help Nigerian business owners automate their shops. Explain that they can register by typing 'onboard: Business Name, Admin Phone'. Be helpful and professional.";
      const response = await this.gemini.generateResponse(
        text,
        platformContext,
      );
      return this.twilio.sendMessage(from, response, to);
    }

    // 2. BUSINESS FLOW: User is messaging a registered tenant's number
    const tenant = await this.db.findTenantByBusinessNumber(to);

    if (!tenant) {
      return this.twilio.sendMessage(
        from,
        'Welcome! This number is not yet registered as an SME Assistant. If you are the owner, please contact our support at the main platform number.',
        to,
      );
    }

    const isAdmin = tenant.admin_phone === from;

    // Admin commands (Add products, etc)
    if (isAdmin && text.toLowerCase().includes('add product:')) {
      return this.handleAddProduct(tenant, from, text, to);
    }

    // Customer Sales Flow
    const businessContext = `You are the Sales Assistant for ${tenant.business_name}. Help the customer with product inquiries and orders. Be friendly and use Nigerian Pidgin if they do.`;
    const aiResponse = await this.gemini.generateResponse(
      text,
      businessContext,
    );
    await this.twilio.sendMessage(from, aiResponse, to);
  }

  private async handleOnboarding(from: string, text: string, to: string) {
    try {
      const payload = text.split('onboard:')[1];
      const [businessName, adminPhone] = payload
        .split(',')
        .map((s) => s.trim());
      const formattedAdminPhone = adminPhone.startsWith('whatsapp:')
        ? adminPhone
        : `whatsapp:${adminPhone}`;

      await this.db.saveTenantOnboarding({
        business_name: businessName,
        admin_phone: formattedAdminPhone,
        whatsapp_number: to,
      });
      return this.twilio.sendMessage(
        from,
        `✅ Success! ${businessName} is now active. Admin: ${formattedAdminPhone}`,
        to,
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      return this.twilio.sendMessage(
        from,
        '❌ Format: onboard: Name, Phone',
        to,
      );
    }
  }

  private async handleAddProduct(
    tenant: any,
    from: string,
    text: string,
    to: string,
  ) {
    try {
      const payload = text.toLowerCase().split('add product:')[1];
      const [name, price] = payload.split(',').map((s) => s.trim());
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
        '❌ Format: add product: Name, Price',
        to,
      );
    }
  }
}

/* Old Version 2
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
*/

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
