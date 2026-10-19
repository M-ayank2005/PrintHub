import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { BusinessModel, IBusiness } from '../models/business.model';
import { RefreshTokenModel } from '../models/refresh-token.model';
import { config } from '../config';
import { AuthTokens, DEFAULT_PRICING } from '@printhub/shared';

export class AuthService {
  private generateTokens(businessId: string, deviceId?: string): AuthTokens {
    const accessToken = jwt.sign(
      { businessId, deviceId },
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessTtlSec }
    );

    const refreshToken = crypto.randomBytes(40).toString('hex');

    return {
      accessToken,
      refreshToken,
      expiresInSec: config.jwt.accessTtlSec,
    };
  }

  async signup(data: { email: string; password: string; shopName: string }): Promise<{ business: IBusiness; tokens: AuthTokens }> {
    const existing = await BusinessModel.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    const passwordHash = await argon2.hash(data.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const slug = nanoid(10);

    const business = await BusinessModel.create({
      email: data.email.toLowerCase(),
      passwordHash,
      shopName: data.shopName,
      slug,
      pricing: DEFAULT_PRICING,
      isOpen: true,
      acceptPaused: false,
      printBeforePayment: true,
    });

    const tokens = this.generateTokens(business._id.toString());

    await RefreshTokenModel.create({
      token: tokens.refreshToken,
      businessId: business._id,
      expiresAt: new Date(Date.now() + config.jwt.refreshTtlSec * 1000),
    });

    return { business, tokens };
  }

  async login(data: { email: string; password: string; deviceId?: string }): Promise<{ business: IBusiness; tokens: AuthTokens }> {
    const business = await BusinessModel.findOne({ email: data.email.toLowerCase() });
    if (!business) {
      throw new Error('Invalid email or password.');
    }

    const valid = await argon2.verify(business.passwordHash, data.password);
    if (!valid) {
      throw new Error('Invalid email or password.');
    }

    const tokens = this.generateTokens(business._id.toString(), data.deviceId);

    await RefreshTokenModel.create({
      token: tokens.refreshToken,
      businessId: business._id,
      expiresAt: new Date(Date.now() + config.jwt.refreshTtlSec * 1000),
    });

    return { business, tokens };
  }

  async refresh(refreshToken: string, deviceId?: string): Promise<AuthTokens> {
    const tokenDoc = await RefreshTokenModel.findOne({ token: refreshToken });
    if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
      throw new Error('Invalid or expired refresh token.');
    }

    // Rotate refresh token
    await RefreshTokenModel.deleteOne({ _id: tokenDoc._id });

    const tokens = this.generateTokens(tokenDoc.businessId.toString(), deviceId);

    await RefreshTokenModel.create({
      token: tokens.refreshToken,
      businessId: tokenDoc.businessId,
      expiresAt: new Date(Date.now() + config.jwt.refreshTtlSec * 1000),
    });

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    await RefreshTokenModel.deleteOne({ token: refreshToken });
  }
}

export const authService = new AuthService();
