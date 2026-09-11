import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { generatePages, publicDir } from "../src/generate.ts";
import { COOKIE_NAME } from "../src/locales.ts";
import { handleRequest, type Env } from "../src/worker.ts";

function assetsEnv(): Env {
  generatePages();
  const root = publicDir();
  return {
    ASSETS: {
      async fetch(input) {
        const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
        let path = url.pathname;
        if (path.endsWith("/")) path += "index.html";
        if (path === "/") path = "/index.html";
        try {
          const file = join(root, path.replace(/^\//, ""));
          const body = readFileSync(file);
          const type = path.endsWith(".wasm")
            ? "application/wasm"
            : path.endsWith(".html")
              ? "text/html; charset=utf-8"
              : "application/octet-stream";
          return new Response(body, { headers: { "content-type": type } });
        } catch {
          return new Response("not found", { status: 404 });
        }
      },
    },
  };
}

function request(
  path: string,
  init: { accept?: string; cookie?: string; country?: string } = {},
): Request & { cf?: { country?: string } } {
  const headers = new Headers();
  if (init.accept) headers.set("Accept-Language", init.accept);
  if (init.cookie) headers.set("Cookie", init.cookie);
  const req = new Request(`https://kotoba-lang.org${path}`, { headers }) as Request & { cf?: { country?: string } };
  if (init.country) req.cf = { country: init.country };
  return req;
}

describe("Worker negotiate before static cache pin", () => {
  const env = assetsEnv();

  it("serves Indonesian for Accept-Language on / and does not pin English", async () => {
    const res = await handleRequest(request("/", { accept: "id,en;q=0.8" }), env);
    const body = await res.text();
    assert.equal(res.status, 200);
    assert.ok(body.includes('<html lang="id"'));
    assert.ok(body.includes("Bahasa Indonesia"));
    assert.ok(body.indexOf('id="install"') < body.indexOf("<h1>"));
    assert.ok(body.indexOf('id="play"') < body.indexOf("<h1>"));
    assert.ok(body.includes("brew install kotoba"));
    assert.equal(res.headers.get("Content-Language"), "id");
    assert.equal(res.headers.get("CDN-Cache-Control"), "no-store");
    assert.equal(res.headers.get("Cloudflare-CDN-Cache-Control"), "no-store");
    assert.ok(res.headers.get("Vary")?.includes("Accept-Language"));
    assert.ok(res.headers.get("Vary")?.includes("Cookie"));
    assert.ok(res.headers.get("Vary")?.includes("CF-IPCountry"));
    assert.ok(res.headers.get("Set-Cookie")?.includes(`${COOKIE_NAME}=id`));
  });

  it("uses CF country when language is absent", async () => {
    const il = await handleRequest(request("/", { country: "IL" }), env);
    assert.ok((await il.text()).includes('<html lang="he"'));
    const ma = await handleRequest(request("/", { country: "MA" }), env);
    assert.ok((await ma.text()).includes('<html lang="ar-MA"'));
    const id = await handleRequest(request("/", { country: "ID" }), env);
    const idBody = await id.text();
    assert.ok(idBody.includes('<html lang="id">'));
    assert.equal(idBody.includes('<html lang="jv"'), false);
  });

  it("serves new locale paths and existing emit tags", async () => {
    for (const tag of ["jv", "su", "he", "it", "ar-MA", "id", "es", "de", "ko", "arz"]) {
      const res = await handleRequest(request(`/${tag}/`), env);
      const body = await res.text();
      assert.equal(res.status, 200, tag);
      assert.ok(body.includes(`lang="${tag}"`), tag);
      assert.ok(body.includes('hreflang="id"'), tag);
      assert.ok(body.includes('hreflang="jv"'), tag);
      assert.equal(res.headers.get("CDN-Cache-Control"), null, tag);
      assert.ok(res.headers.get("Cache-Control")?.includes("public"), tag);
    }
  });

  it("308-canonicalizes /jv to /jv/", async () => {
    const res = await handleRequest(request("/jv"), env);
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("Location"), "/jv/");
  });

  it("passes through the existing Play wasm", async () => {
    const res = await handleRequest(request("/play/double-21.wasm"), env);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "application/wasm");
    assert.equal((await res.arrayBuffer()).byteLength, 344);
  });

  it("serves /play/ and 308-canonicalizes /play so the path is not 404", async () => {
    const slash = await handleRequest(request("/play/"), env);
    const body = await slash.text();
    assert.equal(slash.status, 200);
    assert.ok(body.includes('id="play"'));
    assert.ok(body.includes('id="install"'));
    assert.ok(body.includes("/play/double-21.wasm"));
    const bare = await handleRequest(request("/play"), env);
    assert.equal(bare.status, 308);
    assert.equal(bare.headers.get("Location"), "/play/");
  });

  it("lets cookie win over country on /", async () => {
    const res = await handleRequest(request("/", { cookie: `${COOKIE_NAME}=it`, country: "DE" }), env);
    assert.ok((await res.text()).includes('<html lang="it"'));
  });
});
