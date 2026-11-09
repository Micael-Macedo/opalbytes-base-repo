#!/usr/bin/env node
// probe.mjs: faz UMA requisição HTTP a um ambiente de dev/hmg para tirar dúvida de DTO ou de formato de erro.
// Windows, Linux e Mac (Node 18+). Equivale a um curl, com travas que o texto da skill não garante sozinho.
//   node probe.mjs --salvar-token            (o dev cola o token num prompt oculto; não passa pelo chat)
//   node probe.mjs --apagar-token
//   node probe.mjs --url=<base> --path=/api/Escala/GetEscalasDoDia [--method=GET] [--body='{"a":1}'] [--confirmo]
// Travas: só dev/hmg/localhost; método diferente de GET exige --confirmo (só depois do "sim" do dev); o token nunca é impresso.
import { readFileSync, writeFileSync, existsSync, unlinkSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createInterface } from "node:readline";

const args = process.argv.slice(2);
const opt = (n) => (args.find((a) => a.startsWith(`--${n}=`)) || "").split("=").slice(1).join("=");
const flag = (n) => args.includes(`--${n}`);
const tokenFile = opt("token-file") || join(tmpdir(), "cricri-token.txt");

if (flag("apagar-token")) {
  if (existsSync(tokenFile)) { unlinkSync(tokenFile); console.log("token apagado."); } else console.log("não havia token salvo.");
  process.exit(0);
}
if (flag("salvar-token")) {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const mute = rl._writeToOutput;
  process.stdout.write("Cole o token (Bearer, sem a palavra Bearer) e tecle Enter. A digitação fica oculta: ");
  rl._writeToOutput = (str) => { if (str.includes("\n") || str.includes("\r")) process.stdout.write("\n"); };
  rl.question("", (t) => {
    rl._writeToOutput = mute;
    rl.close();
    t = t.trim().replace(/^Bearer\s+/i, "");
    if (!t) { console.log("vazio; nada salvo."); process.exit(1); }
    writeFileSync(tokenFile, t, { mode: 0o600 });
    try { chmodSync(tokenFile, 0o600); } catch {}
    console.log(`token salvo em ${tokenFile}. Apague no fim com: node probe.mjs --apagar-token`);
  });
  await new Promise(() => {});
}

const url = opt("url").replace(/\/+$/, "");
const path = opt("path");
const method = (opt("method") || "GET").toUpperCase();
if (!url || !path) { console.log("Uso: node probe.mjs --url=<base dev/hmg> --path=/api/... [--method=GET] [--body='{...}'] [--confirmo]"); process.exit(2); }
const host = new URL(url).hostname;
if (!(/(-|\.)(dev|hmg|hml|homolog)([-.]|$)/i.test(host) || host === "localhost" || host === "127.0.0.1")) {
  console.log(`RECUSADO: "${host}" não parece dev/hmg/localhost. Nunca fazer requisição em produção.`);
  process.exit(3);
}
if (!/^\//.test(path)) { console.log("RECUSADO: --path deve começar com /"); process.exit(3); }
if (method !== "GET" && !flag("confirmo")) {
  console.log(`CONFIRMAÇÃO NECESSÁRIA: ${method} ${url}${path}${opt("body") ? `\ncorpo: ${opt("body")}` : ""}\nMostre isto ao dev, explique o efeito (pode gravar no banco do ambiente) e só rode de novo com --confirmo se ele disser "sim".`);
  process.exit(4);
}

const headers = { accept: "application/json" };
let tokenInfo = "sem token";
if (existsSync(tokenFile)) {
  const tk = readFileSync(tokenFile, "utf8").trim();
  headers.authorization = `Bearer ${tk}`;
  try {
    const exp = JSON.parse(Buffer.from(tk.split(".")[1], "base64url").toString()).exp;
    tokenInfo = exp && exp * 1000 < Date.now() ? "token EXPIRADO (peça outro)" : "token ok";
  } catch { tokenInfo = "token (não consegui ler a validade)"; }
}
let body;
if (opt("body")) { body = opt("body"); headers["content-type"] = "application/json"; try { JSON.parse(body); } catch { console.log("RECUSADO: --body não é JSON válido."); process.exit(3); } }

const redact = (s) => s.replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "***jwt***").replace(/("?(?:password|senha|secret|token|access_token|refresh_token)"?\s*:\s*")[^"]+/gi, "$1***");
const t0 = Date.now();
try {
  const r = await fetch(url + path, { method, headers, body, signal: AbortSignal.timeout(30000) });
  const txt = await r.text();
  const ct = r.headers.get("content-type") || "";
  console.log(`# ${method} ${url}${path}  (${tokenInfo})`);
  console.log(`# curl equivalente: curl -s -X ${method} "${url}${path}"${headers.authorization ? ' -H "Authorization: Bearer ***"' : ""}${body ? ` -H "Content-Type: application/json" -d '${body}'` : ""}`);
  console.log(`HTTP ${r.status} ${r.statusText}  | ${ct}  | ${Date.now() - t0} ms  | ${txt.length} bytes`);
  let out = txt;
  try { out = JSON.stringify(JSON.parse(txt), null, 1); } catch {}
  out = redact(out);
  console.log(out.length > 2500 ? `${out.slice(0, 2500)}\n... (truncado, ${out.length} caracteres)` : out);
  if (r.status === 401 || r.status === 403) console.log("# dica: 401/403 = token ausente, expirado ou sem a role da policy (anote a role necessária).");
} catch (e) {
  console.log(`FALHOU: ${e.message} (VPN/URL/timeout?)`);
  process.exit(5);
}
