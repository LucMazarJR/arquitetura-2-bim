import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { monitoringConfig, type MonitoringConfig } from "./monitoring.config";

type RequestWithHeaders = { headers: Record<string, string | undefined> };

@Injectable()
export class ApiTokenGuard implements CanActivate {
  constructor(@Inject(monitoringConfig.KEY) private readonly config: MonitoringConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    if (request.headers.authorization === `Bearer ${this.config.apiToken}`) return true;
    throw new UnauthorizedException("missing or invalid API token");
  }
}
