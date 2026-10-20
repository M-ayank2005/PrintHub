import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { PDFDocument } from 'pdf-lib';
import { BusinessModel } from '../models/business.model';
import { JobModel, IJob } from '../models/job.model';
import { UploadConfirmationModel } from '../models/upload-confirmation.model';
import { config } from '../config';
import { getStorageProvider } from '../storage';
import { emitJobNew, emitJobUpdated } from '../realtime/gateway';
import { purgeService } from './purge.service';
import {
  calculateDocPrice,
  calculateJobTotals,
  DocumentKind,
  DocumentOptions,
  LIMITS,
  BusinessPricing,
} from '@printhub/shared';
import { CustomerSessionPayload } from '../middleware/session';

export class PublicService {
  async getShopBySlug(slug: string): Promise<any> {
    const business = await BusinessModel.findOne({ slug });
    if (!business) {
      throw new Error('Shop not found.');
    }

    const now = Date.now();
    const agent = business.agent;
    const isAgentOnline =
      !!agent &&
      now - new Date(agent.lastSeenAt).getTime() < 45000 &&
      agent.printerCaps.some((p) => p.isOnline);

    const isAvailable = business.isOpen && !business.acceptPaused && isAgentOnline;

    return {
      shopName: business.shopName,
      slug: business.slug,
      upiId: business.upiId,
      payeeName: business.payeeName,
      isAvailable,
      isOpen: business.isOpen,
      acceptPaused: business.acceptPaused,
      isAgentOnline,
      pricing: business.pricing,
      extras: business.extras,
      printBeforePayment: business.printBeforePayment,
    };
  }

  async createSession(slug: string): Promise<{ token: string; sessionId: string; shopName: string }> {
    const business = await BusinessModel.findOne({ slug });
    if (!business) {
      throw new Error('Shop not found.');
    }

    const sessionId = nanoid(12);
    const token = jwt.sign(
      {
        sessionId,
        businessId: business._id.toString(),
        slug: business.slug,
      } as CustomerSessionPayload,
      config.jwt.sessionSecret,
      { expiresIn: config.jwt.sessionTtlSec }
    );

    return {
      token,
      sessionId,
      shopName: business.shopName,
    };
  }

  async presignUpload(
    session: CustomerSessionPayload,
    data: { kind: DocumentKind; contentType: string; sizeBytes: number }
  ): Promise<{ docId: string; uploadUrl: string; headers?: Record<string, string>; storageKey: string }> {
    if (data.sizeBytes > LIMITS.MAX_FILE_SIZE_BYTES) {
      throw new Error(`File exceeds maximum allowed size of 25 MB.`);
    }

    const docId = nanoid(10);
    const extension = data.kind === 'PDF' ? 'pdf' : 'bin';
    const storageKey = `jobs/${session.sessionId}/${docId}.${extension}`;

    const storage = getStorageProvider();
    const presign = await storage.presignUpload(
      storageKey,
      data.contentType,
      data.sizeBytes,
      LIMITS.UPLOAD_PRESIGN_TTL_SEC
    );

    return {
      docId,
      uploadUrl: presign.url,
      headers: presign.headers,
      storageKey,
    };
  }

  async confirmUpload(
    session: CustomerSessionPayload,
    storageKey: string,
    kind: DocumentKind
  ): Promise<{ sizeBytes: number; pages: number }> {
    if (!storageKey.startsWith(`jobs/${session.sessionId}/`)) {
      throw new Error('Invalid storage key: does not belong to this session.');
    }

    const storage = getStorageProvider();
    const head = await storage.headObject(storageKey);
    let pageCount = 1;

    if (kind === 'PDF') {
      // 1. Magic byte check (%PDF-)
      const magicBytes = await storage.getObjectBytes(storageKey, 8);
      if (!magicBytes.toString('utf8', 0, 5).startsWith('%PDF-')) {
        throw new Error('Invalid file format: file does not match PDF magic header.');
      }

      // 2. Load PDF to count pages and verify encryption
      const pdfBytes = await storage.getObjectBytes(storageKey);
      let pdfDoc: PDFDocument;
      try {
        pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: false });
      } catch (err: any) {
        if (err.message?.includes('encrypted') || err.message?.includes('Password')) {
          throw new Error('Encrypted or password-protected PDFs are not supported.');
        }
        throw new Error('Malformed or corrupted PDF file.');
      }

      pageCount = pdfDoc.getPageCount();
      if (pageCount <= 0) {
        throw new Error('PDF document contains zero pages.');
      }
    }

    // Persist verified upload confirmation
    await UploadConfirmationModel.findOneAndUpdate(
      { storageKey },
      {
        storageKey,
        sessionId: session.sessionId,
        kind,
        sizeBytes: head.size,
        pages: pageCount,
        createdAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return {
      sizeBytes: head.size,
      pages: pageCount,
    };
  }

  async getQuote(
    businessId: string,
    docs: Array<{ docId: string; kind: DocumentKind; totalPages: number; options: DocumentOptions }>
  ): Promise<any> {
    const business = await BusinessModel.findById(businessId);
    if (!business) {
      throw new Error('Business not found.');
    }

    const businessObj = business.toObject ? business.toObject() : business;
    const pricing = (businessObj.pricing instanceof Map
      ? Object.fromEntries(businessObj.pricing)
      : businessObj.pricing) as any;
    const extras = businessObj.extras;

    const breakdowns = docs.map((doc) =>
      calculateDocPrice(
        {
          docId: doc.docId,
          kind: doc.kind,
          totalPages: doc.totalPages,
          options: doc.options,
        },
        pricing,
        extras
      )
    );

    const copiesList = docs.map((d) => d.options.copies);
    const colorModes = docs.map((d) => d.options.colorMode);
    const totals = calculateJobTotals(breakdowns, copiesList, colorModes, extras);

    return {
      docs: breakdowns,
      totals,
    };
  }

  async submitJob(
    session: CustomerSessionPayload,
    payload: {
      customerName: string;
      customerPhone?: string;
      paymentMode: 'UPI' | 'COUNTER';
      expectedTotalPaise: number;
      docs: Array<{
        docId: string;
        kind: DocumentKind;
        storageKey: string;
        sizeBytes: number;
        pages: number;
        options: DocumentOptions;
      }>;
    }
  ): Promise<IJob> {
    const business = await BusinessModel.findById(session.businessId);
    if (!business) {
      throw new Error('Business not found.');
    }

    if (!business.isOpen || business.acceptPaused) {
      throw new Error('This shop is currently not accepting new print requests.');
    }

    // Verify storage key session prefixes and enforce server-verified page counts
    const sessionPrefix = `jobs/${session.sessionId}/`;
    for (const doc of payload.docs) {
      if (!doc.storageKey.startsWith(sessionPrefix)) {
        throw new Error(`Unauthorized storage key prefix for document: ${doc.docId}`);
      }
    }

    const storageKeys = payload.docs.map((d) => d.storageKey);
    const confirmations = await UploadConfirmationModel.find({
      storageKey: { $in: storageKeys },
      sessionId: session.sessionId,
    });
    const confirmationMap = new Map(confirmations.map((c) => [c.storageKey, c]));

    for (const doc of payload.docs) {
      const conf = confirmationMap.get(doc.storageKey);
      if (!conf) {
        throw new Error(`Upload not confirmed for document key: ${doc.storageKey}`);
      }
      // Enforce server-verified page count and file size
      doc.pages = conf.pages;
      doc.sizeBytes = conf.sizeBytes;
    }

    // Authoritative server-side price recalculation
    const businessObj = business.toObject ? business.toObject() : business;
    const pricing = (businessObj.pricing instanceof Map
      ? Object.fromEntries(businessObj.pricing)
      : businessObj.pricing) as any;
    const extras = businessObj.extras;

    const breakdowns = payload.docs.map((doc) =>
      calculateDocPrice(
        {
          docId: doc.docId,
          kind: doc.kind,
          totalPages: doc.pages,
          options: doc.options,
        },
        pricing,
        extras
      )
    );

    const copiesList = payload.docs.map((d) => d.options.copies);
    const colorModes = payload.docs.map((d) => d.options.colorMode);
    const authoritativeTotals = calculateJobTotals(breakdowns, copiesList, colorModes, extras);

    if (authoritativeTotals.pricePaise !== payload.expectedTotalPaise) {
      throw new Error(
        `Pricing mismatch detected: expected ₹${(payload.expectedTotalPaise / 100).toFixed(
          2
        )}, but calculated ₹${(authoritativeTotals.pricePaise / 100).toFixed(2)}.`
      );
    }

    // Generate short memorable code: e.g. K7-42
    const prefixLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const prefixDigit = Math.floor(Math.random() * 9) + 1;
    const suffixNum = Math.floor(Math.random() * 90) + 10;
    const code = `${prefixLetter}${prefixDigit}-${suffixNum}`;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + LIMITS.MAX_JOB_TTL_MINUTES * 60 * 1000);
    const purgeAfter = new Date(now.getTime() + LIMITS.MAX_JOB_TTL_MINUTES * 60 * 1000);

    const jobDocs = payload.docs.map((doc, idx) => ({
      docId: doc.docId,
      kind: doc.kind,
      storageKey: doc.storageKey,
      sizeBytes: doc.sizeBytes,
      pages: doc.pages,
      options: doc.options,
      priceSubtotalPaise: breakdowns[idx].subtotalPaise,
    }));

    const job = await JobModel.create({
      code,
      businessId: business._id,
      sessionId: session.sessionId,
      status: 'SUBMITTED',
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      paymentMode: payload.paymentMode,
      paymentState: payload.paymentMode === 'COUNTER' ? 'PAY_AT_COUNTER' : 'UNPAID',
      snapshot: {
        pricing,
        extras,
        calculatedAt: now.toISOString(),
      },
      docs: jobDocs,
      totals: authoritativeTotals,
      expiresAt,
      purgeAfter,
    });

    // Notify business desktop agent in real time
    emitJobNew(business._id.toString(), {
      job: {
        id: job._id.toString(),
        code: job.code,
        customerName: job.customerName,
        paymentMode: job.paymentMode,
        paymentState: job.paymentState,
        totals: job.totals,
        docsCount: job.docs.length,
        createdAt: job.createdAt.toISOString(),
        expiresAt: job.expiresAt.toISOString(),
      },
    });

    return job;
  }

  async getJobStatus(jobId: string, sessionId: string): Promise<any> {
    const job = await JobModel.findOne({ _id: jobId, sessionId });
    if (!job) {
      throw new Error('Job not found.');
    }

    return {
      id: job._id.toString(),
      code: job.code,
      status: job.status,
      customerName: job.customerName,
      paymentMode: job.paymentMode,
      paymentState: job.paymentState,
      totals: job.totals,
      createdAt: job.createdAt,
      expiresAt: job.expiresAt,
    };
  }

  async cancelJob(jobId: string, sessionId: string): Promise<void> {
    const job = await JobModel.findOne({ _id: jobId, sessionId });
    if (!job) {
      throw new Error('Job not found.');
    }

    if (job.status !== 'SUBMITTED') {
      throw new Error('Cannot cancel a job that has already been processed by the shop.');
    }

    job.status = 'CANCELLED';
    await job.save();

    emitJobUpdated(job.businessId.toString(), {
      jobId: job._id.toString(),
      status: 'CANCELLED',
      paymentState: job.paymentState,
      timestamp: new Date().toISOString(),
    });

    // Purge documents immediately
    await purgeService.purgeJob(job._id.toString());
  }

  async claimPayment(jobId: string, sessionId: string): Promise<void> {
    const job = await JobModel.findOne({ _id: jobId, sessionId });
    if (!job) {
      throw new Error('Job not found.');
    }

    if (job.paymentState === 'PAID_CONFIRMED') {
      return;
    }

    job.paymentState = 'CUSTOMER_CLAIMED_PAID';
    await job.save();

    emitJobUpdated(job.businessId.toString(), {
      jobId: job._id.toString(),
      status: job.status,
      paymentState: job.paymentState,
      timestamp: new Date().toISOString(),
    });
  }
}

export const publicService = new PublicService();
