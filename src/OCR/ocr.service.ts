import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class OcrService implements OnModuleInit {
  private visionClient: import('@google-cloud/vision').ImageAnnotatorClient | null =
    null;
  private readonly logger = new Logger(OcrService.name);

  onModuleInit() {
    const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
    const keyFilename = raw
      ? path.isAbsolute(raw)
        ? raw
        : path.join(process.cwd(), raw)
      : null;

    if (!keyFilename || !fs.existsSync(keyFilename)) {
      this.logger.warn(
        'GOOGLE_APPLICATION_CREDENTIALS not set or file missing — OCR disabled',
      );
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const vision = require('@google-cloud/vision');
      this.visionClient = new vision.ImageAnnotatorClient({ keyFilename });
      this.logger.log(
        'Google Cloud Vision client initialized via service account',
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to init Vision client: ${msg}`);
    }
  }

  isEnabled(): boolean {
    return this.visionClient != null;
  }

  async extractTextFromImageUrl(imageUrl: string): Promise<{
    fullText: string;
    confidence: number;
    blocks: unknown[];
  }> {
    if (!this.visionClient) {
      throw new Error(
        'OCR service not initialized — set GOOGLE_APPLICATION_CREDENTIALS to a valid JSON path',
      );
    }

    const [result] = await this.visionClient.documentTextDetection({
      image: { source: { imageUri: imageUrl } },
    });

    const fullText = result.fullTextAnnotation?.text || '';
    const pages = result.fullTextAnnotation?.pages || [];
    let totalConfidence = 0;
    let blockCount = 0;
    for (const page of pages) {
      for (const block of page.blocks || []) {
        totalConfidence += block.confidence || 0;
        blockCount++;
      }
    }
    const avgConfidence = blockCount > 0 ? totalConfidence / blockCount : 0;

    return {
      fullText,
      confidence: avgConfidence,
      blocks: pages.flatMap((p) => p.blocks || []),
    };
  }

  async extractTextFromBase64(
    base64Data: string,
    _mimeType: string = 'image/jpeg',
  ): Promise<{
    fullText: string;
    confidence: number;
    blocks: unknown[];
  }> {
    if (!this.visionClient) {
      throw new Error('OCR service not initialized');
    }

    const [result] = await this.visionClient.documentTextDetection({
      image: { content: Buffer.from(base64Data, 'base64') },
    });

    const fullText = result.fullTextAnnotation?.text || '';
    const pages = result.fullTextAnnotation?.pages || [];
    let totalConf = 0;
    let blockCount = 0;
    for (const page of pages) {
      for (const block of page.blocks || []) {
        totalConf += block.confidence || 0;
        blockCount++;
      }
    }

    return {
      fullText,
      confidence: blockCount > 0 ? totalConf / blockCount : 0,
      blocks: pages.flatMap((p) => p.blocks || []),
    };
  }
}
