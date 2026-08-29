import { describe, expect, it } from "vitest";
import { JsonRpcPeer, makeRequest, parseMessage, makeSuccess } from "./rpc.js";
import { METHODS, JSONRPC_VERSION } from "./constants.js";

describe("JSON-RPC framing", () => {
  it("parses requests and responses", () => {
    const req = makeRequest(1, METHODS.hello, { protocolVersion: "1.0.0" });
    expect(req).toEqual({
      jsonrpc: JSONRPC_VERSION,
      id: 1,
      method: METHODS.hello,
      params: { protocolVersion: "1.0.0" },
    });
    const roundTrip = parseMessage(JSON.stringify(req));
    expect(roundTrip).toEqual(req);
  });

  it("rejects non-2.0 payloads", () => {
    expect(() => parseMessage(JSON.stringify({ jsonrpc: "1.0", method: "x" }))).toThrow(/jsonrpc/);
  });

  it("round-trips a request through JsonRpcPeer", async () => {
    const aInbox: string[] = [];
    const bInbox: string[] = [];
    const a = new JsonRpcPeer((p) => {
      aInbox.push(p);
      void b.receive(p);
    });
    const b = new JsonRpcPeer((p) => {
      bInbox.push(p);
      void a.receive(p);
    });
    b.setRequestHandler(async (method, params) => {
      expect(method).toBe(METHODS.requestFill);
      return { status: "queued", echo: params };
    });
    const result = await a.request(METHODS.requestFill, { requestId: "abc" });
    expect(result).toEqual({ status: "queued", echo: { requestId: "abc" } });
    expect(parseMessage(bInbox[0]!)).toMatchObject(makeSuccess(1, result));
  });
});
