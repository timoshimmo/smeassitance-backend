/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GeminiService {
  private genAI: GoogleGenAI;

  constructor(private config: ConfigService) {
    this.genAI = new GoogleGenAI({
      apiKey: this.config.get('GEMINI_API_KEY'),
    });
  }

  async generateResponse(prompt: string, tenant: any): Promise<string> {
    const model = this.genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: `You are the SME Assistant for ${tenant.business_name}. 
        Answer professionally in simple English or Nigerian Pidgin. 
        Always focus on helping customers with prices and orders.`,
      },
    });
    const result = await model;
    return result.text || "Sorry, I couldn't process that.";
  }
}
