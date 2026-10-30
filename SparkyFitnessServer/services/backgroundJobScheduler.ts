import cron from 'node-cron';
import { scheduleBackupsOnStartup } from './backupScheduler.js';
import { scheduleOpenFoodFactsAutoSyncOnStartup } from './openFoodFactsAutoSyncScheduler.js';
import { startProviderSyncSchedulers } from './providerSyncScheduler.js';
import { cleanupSessions } from '../auth.js';
import { deleteExpiredTickets } from './passkeyTicketService.js';
import { scheduleDemoMidnightReset } from './demoSeedService.js';
import { log } from '../config/logging.js';
import { scheduledJobsDisabled } from '../utils/scheduledJobs.js';
import { purgeOldChatPhotos } from './dgfit/photoRetentionService.js';
import { runReminders } from './dgfit/pushService.js';

// Backup scheduling is handled by services/backupScheduler.ts
// Session cleanup scheduling
const scheduleSessionCleanup = async () => {
  // Run every day at 3 AM
  cron.schedule('0 3 * * *', async () => {
    try {
      await cleanupSessions();
    } catch (error) {
      log('error', '[CRON] Session cleanup failed:', error);
    }
    try {
      const removed = await deleteExpiredTickets();
      if (removed > 0) {
        log(
          'info',
          `[CRON] Removed ${removed} used/expired passkey ticket(s).`
        );
      }
    } catch (error) {
      log('error', '[CRON] Passkey ticket cleanup failed:', error);
    }
  });
};

// DG FIT: photos sent to PT AI are kept for 14 days.
const scheduleChatPhotoRetention = () => {
  cron.schedule('30 3 * * *', async () => {
    try {
      await purgeOldChatPhotos();
    } catch (error) {
      log('error', '[CRON] Chat photo retention failed:', error);
    }
  });
};

// DG FIT: workout/food/water reminders, checked every 5 minutes.
const scheduleReminders = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      await runReminders();
    } catch (error) {
      log('error', '[CRON] Reminder run failed:', error);
    }
  });
};

/** Registers every scheduled background job after the database is initialized. */
export async function scheduleBackgroundJobs(): Promise<void> {
  if (scheduledJobsDisabled()) {
    log(
      'info',
      '[CRON] Scheduled jobs disabled on this instance (SPARKY_FITNESS_DISABLE_SCHEDULED_JOBS=true).'
    );
    return;
  }
  scheduleBackupsOnStartup();
  await scheduleOpenFoodFactsAutoSyncOnStartup();
  scheduleSessionCleanup();
  startProviderSyncSchedulers();
  scheduleDemoMidnightReset();
  scheduleChatPhotoRetention();
  scheduleReminders();
}
