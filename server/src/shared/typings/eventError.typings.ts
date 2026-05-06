import { CustomError, ErrorCode, ErrorHttpStatusCode } from "./error.typings";

export class EventProducerError extends CustomError {
   constructor(message: string, errorCode: ErrorCode, statusCode = ErrorHttpStatusCode.INTERNAL_SERVER_ERROR) {
      super(message, statusCode, errorCode);
   }
}

export class ProducerShuttingDownError extends EventProducerError {
   constructor(message = "Producer is shutting down") {
      super(message, ErrorCode.SHUTDOWN_IN_PROGRESS, 503);
   }
}

export class CircuitBreakerOpenError extends EventProducerError {
   constructor(message = "Circuit breaker is open, publishing blocked") {
      super(message, ErrorCode.CIRCUIT_BREAKER_OPEN, ErrorHttpStatusCode.CIRCUIT_BREAKER_OPEN);
   }
}

export class MaxRetriesExceededError extends EventProducerError {
   constructor(message = "Max retry attempts exceeded for message") {
      super(message, ErrorCode.MAX_RETRIES_EXCEEDED, 500);
   }
}

export class MessagePublishError extends EventProducerError {
   constructor(message = "Failed to publish message") {
      super(message, ErrorCode.MESSAGE_PUBLISH_FAILED, 500);
   }
}
