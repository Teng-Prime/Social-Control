import { socialAccountRepo } from '../database/repositories/socialAccountRepository';
import { activityLogService } from './activityLogService';
import { SocialAccount, SocialPlatform } from '../../shared/types';

export class AccountService {
  public getAllAccounts(): SocialAccount[] {
    return socialAccountRepo.getAll();
  }

  public getAccountById(id: string): SocialAccount | null {
    return socialAccountRepo.getById(id);
  }

  public getAccountsByPlatform(platform: SocialPlatform): SocialAccount[] {
    return socialAccountRepo.getByPlatform(platform);
  }

  public createOrUpdateAccount(accountData: {
    id?: string;
    platform: SocialPlatform;
    accountName: string;
    email?: string;
    avatarUrl?: string;
    channelId?: string;
    selectedPageId?: string;
    selectedPageName?: string;
    isConnected?: boolean;
    permissions?: string[];
  }): SocialAccount {
    const id = accountData.id || `${accountData.platform}_${Date.now()}`;
    const account: Omit<SocialAccount, 'createdAt' | 'updatedAt'> = {
      id,
      platform: accountData.platform,
      accountName: accountData.accountName.trim(),
      email: accountData.email?.trim(),
      avatarUrl: accountData.avatarUrl,
      channelId: accountData.channelId,
      selectedPageId: accountData.selectedPageId,
      selectedPageName: accountData.selectedPageName,
      isConnected: accountData.isConnected !== undefined ? accountData.isConnected : true,
      permissions: accountData.permissions || ['read', 'publish'],
      status: accountData.isConnected ? 'connected' : 'disconnected',
    };

    const saved = socialAccountRepo.saveAccount(account);
    activityLogService.log(
      'info',
      'AccountService',
      `Saved ${account.platform} account "${account.accountName}"`
    );
    return saved;
  }

  public updateSelectedPage(
    accountId: string,
    pageId: string,
    pageName: string
  ): boolean {
    const account = socialAccountRepo.getById(accountId);
    if (!account) return false;

    socialAccountRepo.saveAccount({
      ...account,
      selectedPageId: pageId,
      selectedPageName: pageName,
    });

    activityLogService.log(
      'info',
      'AccountService',
      `Updated Facebook Page for "${account.accountName}" to "${pageName}" (${pageId})`
    );
    return true;
  }

  public updateAccountEmail(accountId: string, email: string): boolean {
    const account = socialAccountRepo.getById(accountId);
    if (!account) return false;

    socialAccountRepo.saveAccount({
      ...account,
      email: email.trim(),
    });

    activityLogService.log(
      'info',
      'AccountService',
      `Associated email "${email}" with account "${account.accountName}"`
    );
    return true;
  }

  public disconnectAccount(id: string): boolean {
    const account = socialAccountRepo.getById(id);
    if (!account) return false;

    socialAccountRepo.saveAccount({
      ...account,
      isConnected: false,
      status: 'disconnected',
    });

    activityLogService.log('info', 'AccountService', `Disconnected account "${account.accountName}"`);
    return true;
  }
}

export const accountService = new AccountService();
