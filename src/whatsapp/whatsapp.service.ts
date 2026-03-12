import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    private config: ConfigService,
  ) {}

  async processIncomingMessage(from: string, text: string, to: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const PLATFORM_NUMBER =
      this.config.get('PLATFORM_NUMBER') || 'whatsapp:+14155238886';
    this.logger.log(`Processing: ${text} from ${from} to ${to}`);

    // 1. PLATFORM FLOW: User is messaging the main platform number
    if (to === PLATFORM_NUMBER) {
      const normalizedText = text.toLowerCase().trim();

      // Check if this is a registered merchant
      const existingTenant = await this.db.findTenantByAdminPhone(from);
      if (existingTenant) {
        const merchantContext = `You are the SME Assistant Platform Manager. You are speaking to ${existingTenant.business_name} (the Owner). 
        They can:
        1. View Orders
        2. View Transactions
        3. Add Products (using: add product: Name, Price)
        4. Edit Profile
        
        Help them navigate these options.`;

        const aiResponse = await this.gemini.generateResponse(
          text,
          merchantContext,
        );
        return this.twilio.sendMessage(from, aiResponse, to);
      }

      if (normalizedText === 'start') {
        return this.twilio.sendMessage(
          from,
          'To register your business, please type: onboard: Business Name, Your Phone Number',
          to,
        );
      }
      if (normalizedText.includes('onboard:')) {
        return this.handleOnboarding(from, text, to);
      }

      return this.twilio.sendMessage(
        from,
        '👋 Welcome! I am your SME Assistant. Type **START** make we start to onboard your business',
        to,
      );
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
      const formattedAdminPhone = adminPhone;

      await this.db.saveTenantOnboarding({
        business_name: businessName,
        admin_phone: formattedAdminPhone,
        whatsapp_number: to,
      });

      const successMsg = `✅ Success! ${businessName} is now active.
      
Admin: ${formattedAdminPhone}

To start selling, you need to add products. Type:
*add product: Name, Price*
(Example: add product: Leather Bag, 5000)`;

      return this.twilio.sendMessage(from, successMsg, to);
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

/*import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    private config: ConfigService,
  ) {}

  async processIncomingMessage(from: string, text: string, to: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const PLATFORM_NUMBER =
      this.config.get('PLATFORM_NUMBER') || 'whatsapp:+14155238886';
    this.logger.log(`Processing: ${text} from ${from} to ${to}`);

    // 1. PLATFORM FLOW: User is messaging the main platform number
    if (to === PLATFORM_NUMBER) {
      const normalizedText = text.toLowerCase().trim();

      if (normalizedText === 'start') {
        return this.twilio.sendMessage(
          from,
          'To register your business, please type: onboard: Business Name, Your Phone Number',
          to,
        );
      }

      if (normalizedText.includes('onboard:')) {
        return this.handleOnboarding(from, text, to);
      }

      return this.twilio.sendMessage(
        from,
        '👋 Welcome! I am your SME Assistant. Type **START** make we start to onboard your business',
        to,
      );
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
*/
/* Old Version 1
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

*/
