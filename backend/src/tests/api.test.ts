import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { PDFDocument } from 'pdf-lib';
import { createApp } from '../app';
import { setStorageProvider } from '../storage';
import { LocalDiskStorageProvider } from '../storage/local-storage';
import path from 'path';
import fs from 'fs';

describe('PrintHub Backend API Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: any;
  let testUploadDir: string;
  let businessToken: string;
  let businessSlug: string;
  let businessId: string;
  let customerSessionToken: string;

  beforeAll(async () => {
    // Use local installed mongod binary for instant startup without network download
    if (fs.existsSync('C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe')) {
      process.env.MONGOMS_SYSTEM_BINARY = 'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe';
    }

    // 1. Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // 2. Set up local test storage directory
    testUploadDir = path.resolve(__dirname, '../../test-uploads');
    if (fs.existsSync(testUploadDir)) {
      fs.rmSync(testUploadDir, { recursive: true, force: true });
    }
    const localStorage = new LocalDiskStorageProvider(testUploadDir);
    setStorageProvider(localStorage);

    // 3. Create app
    app = createApp();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    if (fs.existsSync(testUploadDir)) {
      fs.rmSync(testUploadDir, { recursive: true, force: true });
    }
  });

  it('Health endpoint returns ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('Business can signup and receive JWT tokens', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({
        email: 'shop@printhub.local',
        password: 'Password123!',
        shopName: 'Cyber Xerox & Prints',
      });

    expect(res.status).toBe(201);
    expect(res.body.business.shopName).toBe('Cyber Xerox & Prints');
    expect(res.body.business.slug).toBeDefined();
    expect(res.body.tokens.accessToken).toBeDefined();

    businessToken = res.body.tokens.accessToken;
    businessSlug = res.body.business.slug;
    businessId = res.body.business.id;
  });

  it('Public customer can retrieve shop info by slug', async () => {
    const res = await request(app).get(`/public/shops/${businessSlug}`);
    expect(res.status).toBe(200);
    expect(res.body.shop.shopName).toBe('Cyber Xerox & Prints');
    expect(res.body.shop.pricing.A4_BW_SINGLE.pricePaise).toBe(200);
  });

  it('Customer can create an anonymous session token', async () => {
    const res = await request(app)
      .post('/public/sessions')
      .send({ slug: businessSlug });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.sessionId).toBeDefined();

    customerSessionToken = res.body.token;
  });

  it('Customer can request presigned upload URL and upload a valid PDF', async () => {
    // 1. Create a dummy 3-page PDF in memory
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([595, 842]);
    pdfDoc.addPage([595, 842]);
    pdfDoc.addPage([595, 842]);
    const pdfBytes = await pdfDoc.save();

    // 2. Request presigned upload URL
    const presignRes = await request(app)
      .post('/public/uploads/presign')
      .set('x-session-token', customerSessionToken)
      .send({
        kind: 'PDF',
        contentType: 'application/pdf',
        sizeBytes: pdfBytes.length,
      });

    expect(presignRes.status).toBe(200);
    expect(presignRes.body.docId).toBeDefined();
    expect(presignRes.body.uploadUrl).toBeDefined();

    const { storageKey, uploadUrl, docId } = presignRes.body;

    // 3. Upload file via the presigned local URL endpoint
    const urlObj = new URL(uploadUrl);
    const uploadPath = urlObj.pathname + urlObj.search;

    const uploadRes = await request(app)
      .put(uploadPath)
      .set('Content-Type', 'application/pdf')
      .send(Buffer.from(pdfBytes));

    expect(uploadRes.status).toBe(200);

    // 4. Confirm upload: server checks magic bytes and parses page count
    const confirmRes = await request(app)
      .post('/public/uploads/confirm')
      .set('x-session-token', customerSessionToken)
      .send({
        storageKey,
        kind: 'PDF',
      });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.pages).toBe(3); // accurately counted 3 pages!

    // 5. Request live quote
    const quoteRes = await request(app)
      .post('/public/quote')
      .set('x-session-token', customerSessionToken)
      .send({
        docs: [
          {
            docId,
            kind: 'PDF',
            totalPages: 3,
            options: {
              copies: 2,
              colorMode: 'BW',
              sides: 'SINGLE',
              paperSize: 'A4',
              pagesPerSheet: 1,
            },
          },
        ],
      });

    expect(quoteRes.status).toBe(200);
    // 3 pages * 2 copies * ₹2.00 (200 paise) = 1200 paise (₹12)
    expect(quoteRes.body.totals.pricePaise).toBe(1200);
    expect(quoteRes.body.totals.pages).toBe(6);
    expect(quoteRes.body.totals.sheets).toBe(6);

    // 6. Submit job
    const submitRes = await request(app)
      .post('/public/jobs')
      .set('x-session-token', customerSessionToken)
      .send({
        customerName: 'Aman Sharma',
        customerPhone: '9876543210',
        paymentMode: 'COUNTER',
        expectedTotalPaise: 1200,
        docs: [
          {
            docId,
            kind: 'PDF',
            storageKey,
            sizeBytes: pdfBytes.length,
            pages: 3,
            options: {
              copies: 2,
              colorMode: 'BW',
              sides: 'SINGLE',
              paperSize: 'A4',
              pagesPerSheet: 1,
            },
          },
        ],
      });

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.job.code).toBeDefined();
    expect(submitRes.body.job.status).toBe('SUBMITTED');

    const jobId = submitRes.body.job.id;

    // 7. Business accepts the job
    const acceptRes = await request(app)
      .post(`/business/jobs/${jobId}/accept`)
      .set('Authorization', `Bearer ${businessToken}`)
      .send();

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.job.status).toBe('ACCEPTED');

    // 8. Agent retrieves download URLs
    const downloadRes = await request(app)
      .post(`/agent/jobs/${jobId}/download-urls`)
      .set('Authorization', `Bearer ${businessToken}`)
      .send();

    expect(downloadRes.status).toBe(200);
    expect(downloadRes.body.docs[0].downloadUrl).toBeDefined();

    // 9. Agent reports PRINTED -> triggers immediate document purge!
    const printedRes = await request(app)
      .post(`/agent/jobs/${jobId}/status`)
      .set('Authorization', `Bearer ${businessToken}`)
      .send({ status: 'PRINTED' });

    expect(printedRes.status).toBe(200);
    expect(printedRes.body.job.status).toBe('PRINTED');

    // 10. Verify document was purged from disk
    const targetFilePath = path.join(testUploadDir, storageKey);
    // Give purge async execution a tick
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(fs.existsSync(targetFilePath)).toBe(false);
  });
});
