import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import * as Sentry from "@sentry/node";
import type { FastifyReply } from "fastify";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    if (status >= 500) {
      Sentry.captureException(exception);
    }
    const message =
      exception instanceof Error ? exception.message : "Unexpected server error";
    void response.status(status).send({
      statusCode: status,
      message,
    });
  }
}
