import { getScheduledQueue } from '@/lib/queue';
import { delayUntil, formatDate } from '@/services/whatsapp/date-parser';
import { campaignRepository } from '@/repositories/campaign.repository';
import type { Platform } from '@prisma/client';

export interface ScheduleJobInput {
  campaignId: string;
  userId: string;
  phoneNumber: string;
  scheduledAt: Date;
  clientId?: string;
}

export interface ScheduledJobData {
  campaignId: string;
  userId: string;
  phoneNumber: string;
  clientId?: string;
}

/**
 * Creates a delayed BullMQ job for a scheduled campaign.
 * Job ID = campaignId, enabling cancellation by ID.
 */
export async function schedulePost(input: ScheduleJobInput): Promise<void> {
  const queue = getScheduledQueue();
  const delay = delayUntil(input.scheduledAt);

  const jobData: ScheduledJobData = {
    campaignId: input.campaignId,
    userId: input.userId,
    phoneNumber: input.phoneNumber,
    clientId: input.clientId,
  };

  await queue.add('publish', jobData, {
    jobId: input.campaignId, // allows cancellation by campaign ID
    delay,
  });
}

/**
 * Cancels a scheduled job by campaign ID.
 * Returns true if the job was found and removed.
 */
export async function cancelScheduledPost(campaignId: string): Promise<boolean> {
  const queue = getScheduledQueue();
  const job = await queue.getJob(campaignId);
  if (!job) return false;

  await job.remove();
  return true;
}

/**
 * Lists upcoming scheduled campaigns for a user.
 */
export async function listScheduledCampaigns(userId: string) {
  const campaigns = await campaignRepository.findByUser(userId, 50);
  return campaigns
    .filter((c) => c.status === 'SCHEDULED' && c.scheduledAt && c.scheduledAt > new Date())
    .sort((a, b) => a.scheduledAt!.getTime() - b.scheduledAt!.getTime())
    .slice(0, 10)
    .map((c, i) => ({
      index: i + 1,
      campaignId: c.id,
      scheduledAt: c.scheduledAt!,
      formattedDate: formatDate(c.scheduledAt!),
      platforms: c.platforms as Platform[],
    }));
}
