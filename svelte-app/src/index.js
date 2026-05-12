// src/worker.js
import { Server } from "./../.svelte-kit/output/server/index.js";
import { manifest, prerendered, base_path } from "./../.svelte-kit/cloudflare-tmp/manifest.js";

/**
 * @typedef {Object} ExecutionContext
 * @property {(fn: () => Promise<void>) => void} waitUntil
 * @property {() => void} passThroughOnException
 */

/** @typedef {{ ASSETS: { fetch: typeof fetch } }} Env */

// ../../node_modules/.pnpm/worktop@0.8.0-next.18/node_modules/worktop/cache/index.mjs
/** @param {Cache} e3 @param {Request|string} t2 */
async function e(e3, t2) {
  let n2 = "string" != typeof t2 && "HEAD" === t2.method;
  n2 && (t2 = new Request(/** @type {Request} */ (t2), { method: "GET" }));
  let r3 = await e3.match(/** @type {Request} */ (t2));
  return n2 && r3 && (r3 = new Response(null, r3)), r3;
}
/** @param {Cache} e3 @param {Request|string} t2 @param {Response} n2 @param {{ waitUntil: Function }} o2 */
function t(e3, t2, n2, o2) {
  return ("string" == typeof t2 || "GET" === /** @type {Request} */ (t2).method) && r(n2) && (n2.headers.has("Set-Cookie") && (n2 = new Response(n2.body, n2)).headers.append("Cache-Control", "private=Set-Cookie"), o2.waitUntil(e3.put(/** @type {Request} */ (t2), n2.clone()))), n2;
}
var n = /* @__PURE__ */ new Set([200, 203, 204, 300, 301, 404, 405, 410, 414, 501]);
/** @param {Response} e3 */
function r(e3) {
  if (!n.has(e3.status)) return false;
  if (~(e3.headers.get("Vary") || "").indexOf("*")) return false;
  let t2 = e3.headers.get("Cache-Control") || "";
  return !/(private|no-cache|no-store)/i.test(t2);
}
/** @param {Cache} n2 */
function o(n2) {
  /** @param {Request} r3 @param {{ defer: Function, waitUntil: Function }} o2 */
  return async function(r3, o2) {
    let a = await e(n2, r3);
    if (a) return a;
    /** @param {Response} e3 */
    o2.defer(((e3) => {
      t(n2, r3, e3, o2);
    }));
  };
}

// ../../node_modules/.pnpm/worktop@0.8.0-next.18/node_modules/worktop/cfw.cache/index.mjs
/** @type {Cache} */
const s = /** @type {any} */ (caches).default;
var c = t.bind(0, s);
var r2 = e.bind(0, s);
var e2 = o.bind(0, s);

// src/worker.js
var server = new Server(manifest);
var app_path = `/${manifest.appPath}`;
var immutable = `${app_path}/immutable/`;
var version_file = `${app_path}/version.json`;
/** @type {string | undefined} */
let origin;
var initialized = server.init({
  env: /** @type {any} */ ({}),
  read: async function(file) {
    const url = `${origin}/${file}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `read(...) failed: could not fetch ${url} (${response.status} ${response.statusText})`
      );
    }
    return response.body;
  }
});
var worker_default = {
  /**
   * @param {Request} req
   * @param {Env} env2
   * @param {ExecutionContext} ctx
   * @returns {Promise<Response>}
   */
  async fetch(req, env2, ctx) {
    if (!origin) {
      origin = new URL(req.url).origin;
    }
    await initialized;
    let pragma = req.headers.get("cache-control") || "";
    let res = !pragma.includes("no-cache") && await r2(req);
    if (res) return res;
    let { pathname, search } = new URL(req.url);
    try {
      pathname = decodeURIComponent(pathname);
    } catch {
    }
    const stripped_pathname = pathname.replace(/\/$/, "");
    let is_static_asset = false;
    const filename = stripped_pathname.slice(base_path.length + 1);
    if (filename) {
      is_static_asset = manifest.assets.has(filename) || manifest.assets.has(filename + "/index.html") || filename in manifest._.server_assets || filename + "/index.html" in manifest._.server_assets;
    }
    let location = pathname.at(-1) === "/" ? stripped_pathname : pathname + "/";
    /** @type {Set<string>} */
    const prerenderedSet = /** @type {Set<string>} */ (prerendered);
    if (is_static_asset || prerenderedSet.has(pathname) || pathname === version_file || pathname.startsWith(immutable)) {
      res = await env2.ASSETS.fetch(req);
    } else if (location && prerenderedSet.has(location)) {
      if (search) location += search;
      res = new Response("", {
        status: 308,
        headers: {
          location
        }
      });
    } else {
      res = await server.respond(req, {
        platform: {
          env: env2,
          ctx,
          context: ctx,
          // deprecated in favor of ctx
          caches: /** @type {any} */ (caches),
          // @ts-expect-error the type is correct but ts is confused because platform.cf uses the type from index.ts while req.cf uses the type from index.d.ts
          cf: req.cf
        },
        getClientAddress() {
          return (
            /** @type {string} */
            req.headers.get("cf-connecting-ip")
          );
        }
      });
    }
    pragma = res.headers.get("cache-control") || "";
    return pragma && res.status < 400 ? c(req, res, ctx) : res;
  }
};
export {
  worker_default as default
};
