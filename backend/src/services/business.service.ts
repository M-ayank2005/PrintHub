import { nanoid } from 'nanoid';
import { BusinessModel, IBusiness, IPrinterCap } from '../models/business.model';
import { DailyStatsModel } from '../models/daily-stats.model';
import { JobModel } from '../models/job.model';
import { BusinessPricing, PrinterCapability } from '@printhub/shared';

export class BusinessService {
  async getProfile(businessId: string): Promise<IBusiness> {
    const business = await BusinessModel.findById(businessId).select('-passwordHash');
    if (!business) {
      throw new Error('Business not found.');
    }
    return business;
  }

  async updateProfile(
    businessId: string,
    data: {
      shopName?: string;
      address?: string;
      upiId?: string | null;
      payeeName?: string;
      isOpen?: boolean;
      acceptPaused?: boolean;
      printBeforePayment?: boolean;
    }
  ): Promise<IBusiness> {
    const business = await BusinessModel.findByIdAndUpdate(
      businessId,
      { $set: data },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!business) {
      throw new Error('Business not found.');
    }
    return business;
  }

  async updatePricing(businessId: string, pricingData: BusinessPricing): Promise<IBusiness> {
    const business = await BusinessModel.findByIdAndUpdate(
      businessId,
      {
        $set: {
          pricing: pricingData.pricing,
          ...(pricingData.extras !== undefined && { extras: pricingData.extras }),
        },
      },
      { new: true }
    ).select('-passwordHash');

    if (!business) {
      throw new Error('Business not found.');
    }
    return business;
  }

  async rotateSlug(businessId: string): Promise<{ slug: string }> {
    const newSlug = nanoid(10);
    const business = await BusinessModel.findByIdAndUpdate(
      businessId,
      { $set: { slug: newSlug } },
      { new: true }
    );

    if (!business) {
      throw new Error('Business not found.');
    }
    return { slug: business.slug };
  }

  async registerAgent(
    businessId: string,
    data: {
      deviceId: string;
      deviceName: string;
      forceTakeover?: boolean;
      printerCaps: PrinterCapability[];
    }
  ): Promise<{ status: 'CONNECTED' | 'TAKEOVER_REQUIRED'; agent: any }> {
    const business = await BusinessModel.findById(businessId);
    if (!business) {
      throw new Error('Business not found.');
    }

    const now = new Date();
    const existingAgent = business.agent;
    const isRecentlyActive =
      existingAgent &&
      existingAgent.deviceId !== data.deviceId &&
      now.getTime() - new Date(existingAgent.lastSeenAt).getTime() < 45 * 1000; // active within last 45s

    if (isRecentlyActive && !data.forceTakeover) {
      return {
        status: 'TAKEOVER_REQUIRED',
        agent: {
          currentDeviceName: existingAgent.deviceName,
          lastSeenAt: existingAgent.lastSeenAt,
        },
      };
    }

    business.agent = {
      deviceId: data.deviceId,
      deviceName: data.deviceName,
      lastSeenAt: now,
      printerCaps: data.printerCaps as IPrinterCap[],
    };

    await business.save();
    return { status: 'CONNECTED', agent: business.agent };
  }

  async updateHeartbeat(businessId: string, deviceId: string, printerCaps?: PrinterCapability[]): Promise<void> {
    await BusinessModel.updateOne(
      { _id: businessId, 'agent.deviceId': deviceId },
      {
        $set: {
          'agent.lastSeenAt': new Date(),
          ...(printerCaps && { 'agent.printerCaps': printerCaps }),
        },
      }
    );
  }

  async getDashboardStats(businessId: string, days = 7): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const stats = await DailyStatsModel.find({
      businessId,
      date: { $gte: startDateStr },
    }).sort({ date: 1 });

    const recentJobs = await JobModel.find({ businessId })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('code status customerName totals paymentMode paymentState createdAt');

    return {
      stats,
      recentJobs,
    };
  }
}

export const businessService = new BusinessService();
