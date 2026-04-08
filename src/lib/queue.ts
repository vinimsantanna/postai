import { Queue, Worker, type Processor } from 'bullmq';
import IORedis from 'ioredis';

let redisConnection: IORedis | null = null;

export function getRedis(): IORedis {
  if (!redisConnection) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error('REDIS_URL not configured');

    redisConnection = new IORedis(url, {
      maxRetriesPerRequest: null, // required by BullMQ
      enableReadyCheck: false,
    });
  }
  return redisConnection;
}

export const SCHEDULED_POSTS_QUEUE = 'scheduled-posts';

let scheduledQueue: Queue | null = null;

export function getScheduledQueue(): Queue {
  if (!scheduledQueue) {
    scheduledQueue = new Queue(SCHEDULED_POSTS_QUEUE, {
      connection: getRedis(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 500,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1_000 },
      },
    });
  }
  return scheduledQueue;
}

export function createWorker(processor: Processor): Worker {
  return new Worker(SCHEDULED_POSTS_QUEUE, processor, {
    connection: getRedis(),
    concurrency: 10,
  });
}

export async function closeQueue(): Promise<void> {
  await scheduledQueue?.close();
  await redisConnection?.quit();
  scheduledQueue = null;
  redisConnection = null;
}
