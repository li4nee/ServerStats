import express from "express";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { globalConfig } from "./shared/config/global.config";
import logger from "./shared/config/logger.config";
import { GlobalErrorHandler } from "./shared/middleware/globalErrorHandler.middleware";
import mongoConnection from "./shared/config/mongo.config";
import postgresConnection from "./shared/config/postgres.config";
import amqpConnection from "./shared/config/amqp.config";
import { ResponseFormatter } from "./shared/utils/responseFormatter.utils";
import { ResourceNotFoundError } from "./shared/typings/error.typings";

const app = express();

/**
 * Initialize middlewares
 */
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req: Request, res: Response, next: NextFunction) => {
   logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.headers["User-Agent"],
   });
   next();
});

/**
 * Health check endpoint
 */
app.get("/health", async (req: Request, res: Response) => {
   try {
      const [mongoStatus, postgresStatus, amqpStatus] = await Promise.all([
         mongoConnection.getConnectionStatus() ?? Promise.resolve("UNKNOWN"),
         postgresConnection.checkConnectionStatus() ?? Promise.resolve("UNKNOWN"),
         amqpConnection.getConnectionStatus() ?? Promise.resolve("UNKNOWN"),
      ]);

      return res.status(200).json(
         ResponseFormatter.success("Server is healthy", 200, {
            connectionStatus: {
               mongo: mongoStatus,
               postgres: postgresStatus,
               amqp: amqpStatus,
            },
            status: "HEALTHY",
            uptime: process.uptime(),
         }),
      );
   } catch (err) {
      return res.status(500).json(ResponseFormatter.error("Health check failed", 500, err));
   }
});

/**
 * Root endpoint
 */
app.get("/", (req: Request, res: Response) => {
    res.status(200).json(ResponseFormatter.success("Welcome to the Server Monitoring API", 200,{
        version:globalConfig.version
    }));
});

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
   throw new ResourceNotFoundError(`Cannot find endpoint: ${req.method} ${req.path}`);
})

/**
 * Initialize all the connections 
 */
async function initializeConnections()
{
   try {
      logger.info("Initializing connections to MongoDB, PostgreSQL, and RabbitMQ...");
      await Promise.all([
         mongoConnection.connect(),
         postgresConnection.testConnection(),
         amqpConnection.connect(),
      ]);
      logger.info("All connections initialized successfully");
   } catch (error) {
      logger.error("Error initializing connections", { error });
      throw error
   }
}

/**
 * Start the server after initializing connections
 */

async function startFunction()
{
   try {
      await initializeConnections();
      app.listen(globalConfig.port, () => {
         logger.info(`Server is running on port ${globalConfig.port}`);
         logger.info(`Node environment: ${globalConfig.node_env}`);
      });
   } catch (error) {
      logger.error("Failed to start the server", { error });
      process.exit(1);
   }
}