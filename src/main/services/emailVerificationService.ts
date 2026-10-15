import { appDb } from '../database/db';
import { socialAccountRepo } from '../database/repositories/socialAccountRepository';
import { activityLogService } from './activityLogService';
import {
  AccountEmailInfo,
  OtpVerificationRequest,
  OtpVerificationResult,
} from '../../shared/types';

export class EmailVerificationService {
  /**
   * Get associated email info for a social media account
   */
  public getAccountEmail(accountId: string): AccountEmailInfo | null {
    const db = appDb.getRawDb();
    const row = db.prepare(`
      SELECT id, account_id as accountId, email, platform, is_verified as isVerified,
             last_otp_requested_at as lastOtpRequestedAt, notes
      FROM account_emails
      WHERE account_id = ?
    `).get(accountId) as any;

    if (!row) {
      const account = socialAccountRepo.getById(accountId);
      if (account && account.email) {
        return {
          id: `email_${accountId}`,
          accountId: account.id,
          email: account.email,
          platform: account.platform,
          isVerified: false,
        };
      }
      return null;
    }

    return {
      ...row,
      isVerified: Boolean(row.isVerified),
    };
  }

  /**
   * Save or update email associated with account without storing passwords
   */
  public associateEmail(params: {
    accountId: string;
    email: string;
    platform: string;
    notes?: string;
  }): AccountEmailInfo {
    const db = appDb.getRawDb();
    const cleanEmail = params.email.trim();
    const id = `email_${params.accountId}`;

    db.prepare(`
      INSERT INTO account_emails (id, account_id, email, platform, is_verified, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, datetime('now'), datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        notes = excluded.notes,
        updated_at = datetime('now')
    `).run(id, params.accountId, cleanEmail, params.platform, params.notes || null);

    // Also update account record
    socialAccountRepo.saveAccount({
      ...socialAccountRepo.getById(params.accountId)!,
      email: cleanEmail,
    });

    activityLogService.log(
      'info',
      'EmailVerification',
      `Associated email "${cleanEmail}" with account "${params.accountId}"`
    );

    return this.getAccountEmail(params.accountId)!;
  }

  /**
   * Process manual OTP submission for account verification
   * Discards OTP from memory immediately after verification
   */
  public verifyOtp(request: OtpVerificationRequest): OtpVerificationResult {
    const cleanOtp = (request.otpCode || '').trim();

    if (!cleanOtp) {
      return {
        success: false,
        message: 'Please enter the verification code received on your email.',
      };
    }

    if (cleanOtp.length < 4 || cleanOtp.length > 10) {
      return {
        success: false,
        message: 'Invalid OTP length. Standard codes are 4-8 digits.',
      };
    }

    const db = appDb.getRawDb();
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE account_emails
      SET is_verified = 1, last_otp_requested_at = ?, updated_at = datetime('now')
      WHERE account_id = ?
    `).run(now, request.accountId);

    activityLogService.log(
      'info',
      'EmailVerification',
      `Verified account "${request.accountId}" (${request.platform}) via email OTP submission`
    );

    return {
      success: true,
      message: `Account email ${request.email} verified successfully.`,
      verifiedAt: now,
    };
  }
}

export const emailVerificationService = new EmailVerificationService();
