#!/usr/bin/env node
// contrato.mjs: compara o que o front envia/espera com o swagger.json da API (sem ler código do back).
// Só GET do swagger (documentação). Windows, Linux e Mac (Node 18+).
// Uso: node <skill>/scripts/contrato.mjs --url=https://app-apicftv-detranba-dev.azurewebsites.net [--base=<sha>] [--todos]
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";

const args = process.argv.slice(2);
const opt = (n) => (args.find((a) => a.startsWith(`--${n}=`)) || "").split("=").slice(1).join("=");
const flag = (n) => args.includes(`--${n}`);
const git = (a, ok = false) => {
  try { return execFileSync("git", a, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { if (ok) return ""; throw e; }
};
process.chdir(git(["rev-parse", "--show-toplevel"]).trim());

// ---------- trava de ambiente ----------
let url = opt("url").replace(/\/+$/, "");
if (!url) {
  const cfg = existsSync("src/app/infrastructure/config/config.dev.ts") ? readFileSync("src/app/infrastructure/config/config.dev.ts", "utf8") : "";
  const m = cfg.match(/\[ApiUrl\.MONITORA\]:\s*"([^"]+)"/);
  console.log(`Informe a URL base com --url=<...>. Sugestão (config.dev.ts): ${m ? m[1] : "(não achei)"}`);
  process.exit(2);
}
const host = new URL(url).hostname;
if (!(/(-|\.)(dev|hmg|hml|homolog)([-.]|$)/i.test(host) || host === "localhost" || host === "127.0.0.1")) {
  console.log(`RECUSADO: "${host}" não parece dev/hmg/localhost. Esta skill só consulta ambientes de dev ou homologação.`);
  process.exit(3);
}

// ---------- swagger (cache de 15 min) ----------
const cache = join(tmpdir(), `cricri-swagger-${host}.json`);
let sw;
try {
  if (existsSync(cache) && Date.now() - statSync(cache).mtimeMs < 15 * 60 * 1000) sw = JSON.parse(readFileSync(cache, "utf8"));
  else {
    const r = await fetch(`${url}/swagger/v1/swagger.json`, { signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const txt = await r.text();
    writeFileSync(cache, txt);
    sw = JSON.parse(txt);
  }
} catch (e) {
  console.log(`Não consegui ler o swagger de ${url}: ${e.message}. Confira a URL/VPN; o contrato fica como "conferir manualmente".`);
  process.exit(4);
}
const schemas = sw.components?.schemas || {};
const refName = (r) => (r && r.$ref ? r.$ref.split("/").pop() : null);
const resolve = (s) => (s && s.$ref ? schemas[refName(s)] : s);

// ---------- lado front ----------
let base = opt("base");
if (!base) for (const ref of ["origin/develop", "develop"]) { base = git(["merge-base", ref, "HEAD"], true).trim(); if (base) break; }
const names = new Map();
for (const l of git(["diff", "--name-status", "--no-renames", base]).trim().split("\n").filter(Boolean)) { const [s, ...f] = l.split("\t"); names.set(f.join("\t"), s[0]); }
for (const f of git(["ls-files", "--others", "--exclude-standard"]).trim().split("\n").filter(Boolean)) names.set(f, "A");
const changed = new Set([...names].filter(([, s]) => s !== "D").map(([f]) => f));
const text = (f) => { try { return readFileSync(f, "utf8"); } catch { return ""; } };
const added = new Map();
{
  let cur = null, ln = 0;
  for (const l of git(["diff", "-U0", "--no-color", "--ignore-cr-at-eol", "--no-renames", base]).split("\n")) {
    if (l.startsWith("+++ ")) cur = l.startsWith("+++ b/") ? l.slice(6) : null;
    else if (l.startsWith("@@")) ln = Number((l.match(/\+(\d+)/) || [, 0])[1]);
    else if (cur && l.startsWith("+") && !l.startsWith("+++")) { if (!added.has(cur)) added.set(cur, new Set()); added.get(cur).add(ln++); }
  }
}
const novaLinha = (f, n) => flag("todos") || names.get(f) === "A" || (added.get(f) ? added.get(f).has(n) : false);
let antigas = 0;

const walk = (d, out = []) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) { if (e !== "node_modules") walk(p, out); } else if (/\.ts$/.test(e) && !/\.spec\.ts$/.test(e)) out.push(p.replace(/\\/g, "/")); } return out; };
const tsFiles = walk("src");

// interfaces do front (props), com extends/Omit
const ifaces = new Map();
for (const f of tsFiles) {
  const t = text(f);
  for (const m of t.matchAll(/export\s+interface\s+(I\w+)(?:<[^>]*>)?(?:\s+extends\s+([^{]+))?\s*\{/g)) {
    let i = m.index + m[0].length, depth = 1;
    while (i < t.length && depth) { if (t[i] === "{") depth++; else if (t[i] === "}") depth--; i++; }
    const body = t.slice(m.index + m[0].length, i - 1);
    const props = new Map();
    for (const p of body.matchAll(/^\s*(?:readonly\s+)?(\w+)(\??)\s*:\s*([^;\n]+)/gm)) props.set(p[1], { opt: !!p[2], type: p[3].trim(), line: t.slice(0, m.index + m[0].length + p.index).split("\n").length, file: f });
    ifaces.set(m[1], { file: f, props, ext: (m[2] || "").trim() });
  }
}
const flatIface = (name, seen = new Set()) => {
  const it = ifaces.get(name);
  if (!it || seen.has(name)) return null;
  seen.add(name);
  const out = new Map(it.props);
  if (it.ext) {
    for (const part of it.ext.split(/,(?![^<]*>)/)) {
      const om = part.trim().match(/^Omit<\s*(I\w+)\s*,\s*([^>]+)>$/);
      const pm = part.trim().match(/^(I\w+)/);
      const parentName = om ? om[1] : pm ? pm[1] : null;
      const parent = parentName && flatIface(parentName, seen);
      if (parent) {
        const drop = om ? [...om[2].matchAll(/["'](\w+)["']/g)].map((x) => x[1]) : [];
        for (const [k, v] of parent) if (!drop.includes(k) && !out.has(k)) out.set(k, v);
      }
    }
  }
  return out;
};

// config: ApiPath -> caminho
const cfgText = text("src/app/infrastructure/config/app-config.base.ts");
const pathOf = new Map([...cfgText.matchAll(/\[ApiPath\.(\w+)\]:\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]));
const norm = (p) => p.toLowerCase().replace(/\{[^}]+\}/g, "{}").replace(/\/+$/, "");
const swPaths = new Map(Object.keys(sw.paths || {}).map((p) => [norm(p), p]));

// chamadas http nos arquivos de api (alterados, ou todos com --todos)
const apiFiles = tsFiles.filter((f) => /^src\/app\/infrastructure\/http\//.test(f) && (flag("todos") || changed.has(f)));
const calls = [];
for (const f of apiFiles) {
  const t = text(f);
  for (const m of t.matchAll(/this\.http\.(get|post|put|patch|delete)\s*(?:<([^(]*?)>)?\s*\(\s*this\.buildUrl\(\s*(?:ApiPath\.(\w+)|this\.paths\.(\w+)!?)/g)) {
    const before = t.slice(0, m.index);
    const sig = [...before.matchAll(/^\s*(?:override\s+|async\s+|public\s+)*(\w+)\s*\(([^)]*)\)\s*:\s*Observable<([^\n{]+?)>\s*\{\s*$/gm)].pop();
    calls.push({ f, method: m[1].toUpperCase(), generic: (m[2] || "").trim(), apiPath: m[3] || null, viaPaths: m[4] || null, fn: sig ? sig[1] : "?", params: sig ? sig[2] : "", ret: sig ? sig[3] : "" });
  }
}

// ---------- comparação ----------
const flatSchema = (s) => {
  let sc = resolve(s);
  if (!sc) return null;
  if (sc.type === "array" && sc.items) sc = resolve(sc.items);
  if (sc && sc.properties && sc.properties.data && sc.properties.data.type === "array") return { paged: true, schema: resolve(sc.properties.data.items), name: refName(sc.properties.data.items) };
  return { paged: false, schema: sc, name: refName(s?.items) || refName(s) };
};
const tsCat = (t) => (/^(string|Date)\b/.test(t) ? "string" : /^number\b/.test(t) ? "number" : /^boolean\b/.test(t) ? "boolean" : /\[\]$|^Array</.test(t) ? "array" : null);
const swCat = (p) => { const r = resolve(p); const ty = r?.type; return ty === "integer" || ty === "number" ? "number" : ty === "string" ? (r.enum ? null : "string") : ty === "boolean" ? "boolean" : ty === "array" ? "array" : null; };
const compare = (iname, schema, role) => {
  const fp = flatIface(iname);
  if (!fp || !schema?.properties) return [];
  const sp = new Map(Object.entries(schema.properties).map(([k, v]) => [k.toLowerCase(), { k, v }]));
  const req = new Set((schema.required || []).map((x) => x.toLowerCase()));
  const out = [];
  for (const [k, v] of fp) {
    if (!novaLinha(v.file || "", v.line || 0)) { const s0 = sp.get(k.toLowerCase()); if (!s0 || (tsCat(v.type) && swCat(s0.v) && tsCat(v.type) !== swCat(s0.v))) antigas++; continue; }
    const s = sp.get(k.toLowerCase());
    if (!s) { out.push(`  ✘ ${k}: o front ${role === "resp" ? "espera na resposta" : "envia"} mas o schema não tem esse campo${role === "req" ? " (a API ignora em silêncio)" : ""}`); continue; }
    const a = tsCat(v.type), b = swCat(s.v);
    if (a && b && a !== b) out.push(`  ✘ ${k}: front ${v.type} x API ${b}`);
  }
  if (role === "req") for (const [k, s] of sp) if (req.has(k) && ![...fp.keys()].some((x) => x.toLowerCase() === k)) out.push(`  ✘ ${s.k}: obrigatório na API e ausente no front`);
  return out;
};

console.log(`# contrato  swagger ${host} (${Object.keys(sw.paths).length} rotas, ${Object.keys(schemas).length} schemas)  base ${base.slice(0, 7)}  ${calls.length} chamada(s) http no front`);
let problemas = 0;
const done = new Set();
const vistos = new Set();
for (const c of calls) {
  const key = `${c.f}|${c.fn}|${c.method}|${c.apiPath || c.viaPaths}`;
  if (done.has(key)) continue;
  done.add(key);
  const raw = c.apiPath ? pathOf.get(c.apiPath) : null;
  const label = `${c.method} ${raw || `(${c.viaPaths ? "this.paths." + c.viaPaths : "?"})`}  [${c.f.split("/").pop()}#${c.fn}]`;
  if (!raw) { console.log(`- ? ${label}: caminho vem do BaseResourceService; confira à mão`); continue; }
  const sp = swPaths.get(norm(raw));
  if (!sp) { problemas++; console.log(`- ✘ ${label}: ROTA NÃO EXISTE no swagger (a API dev pode estar desatualizada ou o caminho está errado)`); continue; }
  const op = sw.paths[sp];
  const metodos = Object.keys(op).map((m) => m.toUpperCase());
  if (!metodos.includes(c.method)) { problemas++; console.log(`- ✘ ${label}: a API expõe ${metodos.join("/")} nessa rota, o front usa ${c.method}`); continue; }
  const o = op[c.method.toLowerCase()];
  const out = [];
  // resposta: tipo genérico do front x schema 200
  const okResp = o.responses?.["200"]?.content?.["application/json"]?.schema || o.responses?.["200"]?.content?.["text/json"]?.schema || o.responses?.["201"]?.content?.["application/json"]?.schema;
  const respTypes = [...(c.generic + " " + c.ret).matchAll(/\b(I[A-Z]\w+)/g)].map((m) => m[1]).filter((n) => !/^IPaginatedResponse$|^IBase/.test(n));
  const fr = flatSchema(okResp);
  if (fr?.schema) for (const t of [...new Set(respTypes)]) { if (ifaces.has(t)) out.push(...compare(t, fr.schema, "resp").map((x) => `${x}  [resposta ${fr.name || ""} <- ${t}]`)); }
  // corpo: tipos dos parâmetros x schema do requestBody
  const rb = o.requestBody?.content?.["application/json"]?.schema || o.requestBody?.content?.["text/json"]?.schema;
  const reqSchema = flatSchema(rb)?.schema;
  if (reqSchema) for (const m of [...new Set(c.params.match(/\bI[A-Z]\w+/g) || [])]) { if (ifaces.has(m)) out.push(...compare(m, reqSchema, "req").map((x) => `${x}  [corpo ${refName(rb) || ""} <- ${m}]`)); }
  const novos = out.filter((x) => { if (vistos.has(x)) return false; vistos.add(x); return true; });
  if (novos.length) { problemas++; console.log(`- ✘ ${label}`); novos.forEach((x) => console.log(x)); }
  else if (out.length) console.log(`- ✘ ${label}  (mesmas divergências já listadas acima)`);
  else console.log(`- ✔ ${label}  (rota, método e campos conferem; req ${refName(rb) || "-"} / resp ${fr?.name || "-"})`);
}

// interfaces de domínio alteradas que não foram cobertas por nenhuma chamada acima
const cobertos = new Set();
for (const c of calls) for (const m of (c.generic + " " + c.params + " " + c.ret).matchAll(/\b(I[A-Z]\w+)/g)) cobertos.add(m[1]);
const extras = [];
for (const [n, it] of ifaces) {
  if (!changed.has(it.file) || !/^src\/app\/domain\//.test(it.file) || cobertos.has(n)) continue;
  const cand = [`${n.slice(1)}DTO`, n.slice(1)].map((x) => x.toLowerCase());
  const hit = Object.keys(schemas).find((s) => cand.includes(s.toLowerCase()));
  if (!hit) { extras.push(`  ? ${n}: sem schema equivalente por nome (confira à mão se trafega na API)`); continue; }
  const r = compare(n, schemas[hit], /Create|Filtro|Params/.test(n) ? "req" : "resp");
  if (r.length) { problemas++; console.log(`- ✘ interface ${n} x schema ${hit}`); r.forEach((x) => console.log(x)); }
}
if (extras.length) { console.log("\n## interfaces alteradas sem chamada ligada"); extras.slice(0, 12).forEach((x) => console.log(x)); if (extras.length > 12) console.log(`  (+${extras.length - 12})`); }
console.log(`\n# ${problemas} item(ns) com divergência na mudança; ${antigas} divergência(s) antiga(s) de campo ignorada(s) (use --todos para ver). Este swagger é do ambiente ${host}: se o back da mudança ainda não foi implantado lá, divergências de campo novo são esperadas (avise o dev).`);
