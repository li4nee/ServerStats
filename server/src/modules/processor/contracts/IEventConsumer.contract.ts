export interface IEventConsumer {
   /**
    * Starts the event consumer to consume messages from the queue and process them.
    */
   start(): Promise<void>;
   /**
    * Stops the event consumer gracefully, ensuring that any in-flight message processing is completed before shutdown.
    */
   stop(): Promise<void>;
   getStats(): Promise<{
      processed: number;
      failed: number;
      retried: number;
      dlqRouted: number;
      lastProcessedEvent: string | null;
      circuitBreakerState: string;
      circuitBreakerStats: Record<string, unknown>;
      failedEventTypesAndCount: Array<{
         eventType: string;
         count: number;
      }>;
   }>;
}
