export interface eventConsumerStats {
   processed: number;
   failed: number;
   retried: number;
   dlqRouted: number;
   lastProcessedEvent: string | null;
}
