import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { ApiTokenGuard } from "../src/modules/monitoring/api-token.guard";

function contextWith(authorization?: string): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers: { authorization } }) }),
  } as unknown as ExecutionContext;
}

describe("ApiTokenGuard", () => {
  const guard = new ApiTokenGuard({ apiToken: "secret" });

  it("lets requests with the right token through", () => {
    expect(guard.canActivate(contextWith("Bearer secret"))).toBe(true);
  });

  it("rejects requests without a token or with a wrong one", () => {
    expect(() => guard.canActivate(contextWith())).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(contextWith("Bearer wrong"))).toThrow(UnauthorizedException);
  });
});
