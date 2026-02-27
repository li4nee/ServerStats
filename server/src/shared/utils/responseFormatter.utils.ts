import { CustomError, ErrorCode } from "../typings/error.typings";

/**
 * ResponseFormatter is a utility class for standardizing API responses.
 */
export class ResponseFormatter {
   private static formatResponse(
      success: boolean = true,
      statusCode: number = 200,
      message: string = "Success",
      data?: any,
      error?: any,
      errorCode?: ErrorCode,
   ) {
      return {
         success,
         statusCode,
         message,
         data: data || null,
         error: error || null,
         errorCode: errorCode || null,
         timestamp: new Date().toISOString(),
      };
   }

   /**
    *
    * @param message
    * @param statusCode
    * @param data
    * @returns Success Response in standard form.
    */
   static success(message: string, statusCode: number = 200, data?: any) {
      return this.formatResponse(true, statusCode, message, data);
   }

   /**
    *
    * @param message
    * @param statusCode
    * @param error
    * @returns Error Response in standard form.
    */
   static error(message: string, statusCode: number = 500, error?: CustomError | any, errorCode?: ErrorCode) {
      return this.formatResponse(false, statusCode, message, null, error, errorCode);
   }

   /**
    *
    * @param total
    * @param page
    * @param limit
    * @param message
    * @param data
    * @returns Pagibated Response in standard form with pagination details.
    */
   static paginated(total: number, page: number, limit: number, message: string = "Success", data: any[]) {
      return {
         success: true,
         statusCode: 200,
         message,
         data,
         pagination: { total, page, limit, pages: Math.ceil(total / limit) },
         timestamp: new Date().toISOString(),
      };
   }
}
