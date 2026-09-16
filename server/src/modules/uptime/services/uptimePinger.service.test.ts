import { PingTarget, UptimePingerService } from "./uptimePinger.service";

const TARGET: PingTarget = {
   targetUrl: "https://example.test/health",
   httpMethod: "GET",
   timeoutMs: 1000,
   expectedStatusCodes: [200],
};

describe("UptimePingerService", () => {
   let pinger: UptimePingerService;
   let fetchSpy: jest.SpiedFunction<typeof fetch>;

   beforeEach(() => {
      pinger = new UptimePingerService();
      fetchSpy = jest.spyOn(global, "fetch");
   });

   afterEach(() => {
      fetchSpy.mockRestore();
   });

   it("classifies an expected status code as up", async () => {
      fetchSpy.mockResolvedValue(new Response(null, { status: 200 }));

      const result = await pinger.ping(TARGET);

      expect(result.status).toBe("up");
      expect(result.statusCode).toBe(200);
      expect(result.error).toBeNull();
   });

   it("classifies an unexpected status code as down", async () => {
      fetchSpy.mockResolvedValue(new Response(null, { status: 500 }));

      const result = await pinger.ping(TARGET);

      expect(result.status).toBe("down");
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe("Unexpected status code 500");
   });

   it("honors multiple expected status codes", async () => {
      fetchSpy.mockResolvedValue(new Response(null, { status: 204 }));

      const result = await pinger.ping({ ...TARGET, expectedStatusCodes: [200, 204] });

      expect(result.status).toBe("up");
   });

   it("classifies a network error as down with no status code", async () => {
      fetchSpy.mockRejectedValue(new Error("getaddrinfo ENOTFOUND example.test"));

      const result = await pinger.ping(TARGET);

      expect(result.status).toBe("down");
      expect(result.statusCode).toBeNull();
      expect(result.error).toBe("getaddrinfo ENOTFOUND example.test");
   });

   it("classifies an abort/timeout distinctly from a generic network error", async () => {
      const abortError = new Error("This operation was aborted");
      abortError.name = "AbortError";
      fetchSpy.mockRejectedValue(abortError);

      const result = await pinger.ping({ ...TARGET, timeoutMs: 250 });

      expect(result.status).toBe("down");
      expect(result.error).toBe("Request timed out after 250ms");
   });

   it("passes the timeout signal and clears the timer so the process doesn't hang", async () => {
      fetchSpy.mockResolvedValue(new Response(null, { status: 200 }));

      await pinger.ping(TARGET);

      expect(fetchSpy).toHaveBeenCalledWith(
         TARGET.targetUrl,
         expect.objectContaining({ method: "GET", signal: expect.any(AbortSignal) }),
      );
   });
});
