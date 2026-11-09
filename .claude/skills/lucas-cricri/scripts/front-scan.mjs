#!/usr/bin/env node
// front-scan.mjs: varredura rápida da mudança do monitora-client (Windows, Linux e Mac).
// Só lê (git, arquivos) e roda verificações que não corrigem nada (eslint, stylelint, ng build).
// Uso: node <skill>/scripts/front-scan.mjs [--base=<sha>] [--sem-build] [--sem-lint] [--json]
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename, relative } from "node:path";

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => (args.find((a) => a.startsWith(`--${n}=`)) || "").split("=").slice(1).join("=");
const t0 = Date.now();
const secs = (t) => `${((Date.now() - t) / 1000).toFixed(1)}s`;

const git = (a, okFail = false) => {
  try {
    return execFileSync("git", a, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    if (okFail) return "";
    throw e;
  }
};
const root = git(["rev-parse", "--show-toplevel"]).trim();
process.chdir(root);
if (!existsSync("angular.json")) {
  console.log("Este script é do monitora-client (não achei angular.json na raiz).");
  process.exit(2);
}

// ---------- base e escopo ----------
let base = opt("base");
if (!base) {
  for (const ref of ["origin/develop", "develop"]) {
    base = git(["merge-base", ref, "HEAD"], true).trim();
    if (base) break;
  }
}
if (!base) {
  console.log("Não consegui calcular a base (git merge-base origin/develop HEAD). Rode `git fetch origin develop`.");
  process.exit(2);
}
const branch = git(["branch", "--show-current"]).trim();
const commits = git(["log", "--format=%h%x09%s", `${base}..HEAD`]).trim().split("\n").filter(Boolean);
const status = new Map(); // arquivo -> A|M|D|R
for (const l of git(["diff", "--name-status", "--no-renames", base]).trim().split("\n").filter(Boolean)) {
  const [s, ...f] = l.split("\t");
  status.set(f.join("\t"), s[0]);
}
const untracked = git(["ls-files", "--others", "--exclude-standard"]).trim().split("\n").filter(Boolean);
for (const f of untracked) status.set(f, "A");
const files = [...status.keys()].filter((f) => status.get(f) !== "D");

// ---------- linhas adicionadas (arquivo -> Map(linha -> texto)) ----------
const added = new Map();
const put = (f, n, t) => {
  if (!added.has(f)) added.set(f, new Map());
  added.get(f).set(n, t);
};
let cur = null;
let ln = 0;
for (const l of git(["diff", "-U0", "--no-color", "--ignore-cr-at-eol", "--no-renames", base]).split("\n")) {
  if (l.startsWith("+++ ")) {
    cur = l.startsWith("+++ b/") ? l.slice(6) : null;
  } else if (l.startsWith("@@")) {
    const m = l.match(/\+(\d+)/);
    ln = m ? Number(m[1]) : 0;
  } else if (cur && l.startsWith("+") && !l.startsWith("+++")) {
    put(cur, ln++, l.slice(1).replace(/\r$/, ""));
  }
}
for (const f of untracked) {
  if (/\.(ts|html|scss|css|json|md|svg)$/.test(f) && !f.startsWith("node_modules/")) {
    try {
      readFileSync(f, "utf8").split("\n").forEach((t, i) => put(f, i + 1, t.replace(/\r$/, "")));
    } catch {}
  }
}
const eolOnly = git(["diff", "--name-only", "--no-renames", base]).trim().split("\n").filter(Boolean)
  .filter((f) => !added.has(f) && status.get(f) === "M");

const isSpec = (f) => /\.spec\.ts$/.test(f);
const inSrc = (f) => f.startsWith("src/");
const baseText = (f) => git(["show", `${base}:${f}`], true);
const text = (f) => { try { return readFileSync(f, "utf8"); } catch { return ""; } };

// ---------- regras (só linhas adicionadas) ----------
// novoNoArquivo: só vale se o arquivo ainda não tinha o padrão na base (repo está misto; não se pede migração).
const R = [
  { id: "camada/presentation-infra", sev: "importante", scope: /^src\/app\/presentation\/.*\.ts$/, re: /@infrastructure/, msg: "página importa infrastructure (o padrão é passar pelo service de application)" },
  { id: "camada/httpclient-fora-da-infra", sev: "importante", scope: /^src\/app\/(presentation|shared)\/.*\.ts$/, re: /\bHttpClient\b/, msg: "HttpClient fora da infrastructure" },
  { id: "camada/domain-importa-camada", sev: "importante", scope: /^src\/app\/domain\/.*\.ts$/, re: /from\s+["']@(shared|application|infrastructure|presentation)/, msg: "domain importando camada externa" },
  { id: "camada/shared-importa-application", sev: "menor", scope: /^src\/app\/shared\/.*\.ts$/, re: /["']@application["']/, novoNoArquivo: true, msg: "shared passou a importar application (9 arquivos antigos já fazem isso)" },
  { id: "camada/application-importa-presentation", sev: "importante", scope: /^src\/app\/application\/.*\.ts$/, re: /@presentation/, novoNoArquivo: true, msg: "application importando presentation" },
  { id: "angular/effect-propaga-estado", sev: "verificar", scope: /\.ts$/, re: /(^|[^A-Za-z])effect\(/, ex: (f) => isSpec(f), msg: "effect: confira o corpo; se faz .set()/.update() em outro signal, trocar por computed()/linkedSignal()" },
  { id: "angular/input-output-decorator", sev: "menor", scope: /\.ts$/, re: /@(Input|Output)\(/, novoNoArquivo: true, ex: isSpec, msg: "código novo: preferir input()/output()/model()" },
  { id: "angular/constructor-injection", sev: "menor", scope: /\.ts$/, re: /constructor\(.*(private|public|protected|readonly) /, novoNoArquivo: true, ex: isSpec, msg: "código novo: preferir inject()" },
  { id: "angular/ng-deep", sev: "menor", scope: /\.(ts|scss|css)$/, re: /::ng-deep|ViewEncapsulation\.None/, msg: "::ng-deep/ViewEncapsulation.None novo: só com motivo" },
  { id: "angular/guard-em-classe", sev: "menor", scope: /\.ts$/, re: /implements\s+(CanActivate|CanMatch|Resolve)\b/, msg: "guard/resolver em classe (o padrão é funcional)" },
  { id: "angular/ngIf-ngFor", sev: "menor", scope: /\.(html|ts)$/, re: /\*ngIf|\*ngFor|\*ngSwitch/, msg: "usar @if/@for/@switch" },
  { id: "angular/metodo-no-template", sev: "menor", scope: /\.html$/, re: /\{\{\s*[A-Za-z_.]+\([^)]*\)\s*\}\}/, msg: "chamada de método no template roda a cada change detection; pré-calcular com computed()" },
  { id: "padroes/console-debugger", sev: "menor", scope: /\.ts$/, re: /\bconsole\.(log|error|warn)\b|\bdebugger\b/, ex: isSpec, msg: "console.log/debugger (PADROES.md)" },
  { id: "tipos/any", sev: "menor", scope: /\.ts$/, re: /:\s*any\b|<any>|\bas any\b/, ex: isSpec, msg: "any (já existe tipo?)" },
];

const hits = [];
for (const [f, lines] of added) {
  if (!inSrc(f) && f !== "package.json") continue;
  for (const r of R) {
    if (!r.scope.test(f) || (r.ex && r.ex(f))) continue;
    if (r.novoNoArquivo && status.get(f) !== "A" && r.re.test(baseText(f))) continue;
    for (const [n, t] of lines) if (r.re.test(t)) hits.push({ sev: r.sev, id: r.id, f, n, t: t.trim(), msg: r.msg });
  }
}

// subscribe sem limpeza no arquivo (HTTP que completa = menor; stream = importante)
for (const [f, lines] of added) {
  if (!/\.ts$/.test(f) || isSpec(f) || !inSrc(f)) continue;
  const subs = [...lines].filter(([, t]) => /\.subscribe\(/.test(t));
  if (!subs.length) continue;
  if (!/takeUntilDestroyed|ngOnDestroy|\basync\b|toSignal|DestroyRef/.test(text(f))) {
    hits.push({ sev: "verificar", id: "rxjs/subscribe-sem-limpeza", f, n: subs[0][0], t: `${subs.length} subscribe(s) novo(s) e o arquivo não tem takeUntilDestroyed/async/toSignal`, msg: "HTTP que completa = menor; stream (valueChanges, Subject, interval) = importante" });
  }
}

// componente novo sem OnPush
for (const f of files) {
  if (status.get(f) === "A" && /\.ts$/.test(f) && inSrc(f) && !isSpec(f) && /@Component\(/.test(text(f)) && !/ChangeDetectionStrategy\.OnPush/.test(text(f))) {
    hits.push({ sev: "menor", id: "angular/componente-sem-onpush", f, n: 1, t: "componente novo sem OnPush", msg: "39 componentes usam OnPush" });
  }
}

// barrel: arquivo novo fora do index.ts da pasta
const findIndex = (f) => {
  let d = dirname(f);
  while (d.startsWith("src/app/") && d.split("/").length >= 4) {
    if (existsSync(join(d, "index.ts"))) return join(d, "index.ts").replace(/\\/g, "/");
    d = dirname(d);
  }
  return null;
};
for (const f of files) {
  if (status.get(f) !== "A" || !/\.ts$/.test(f) || isSpec(f) || basename(f) === "index.ts") continue;
  if (!/^src\/app\/(application\/services|domain\/models|infrastructure\/http|shared\/(utils|components|constants|interfaces))\//.test(f)) continue;
  const idx = findIndex(f);
  if (!idx) continue;
  const name = basename(f).replace(/\.ts$/, "");
  if (!text(idx).includes(name)) {
    hits.push({ sev: "menor", id: "padroes/barrel-index", f, n: 1, t: `${basename(f)} não aparece em ${idx}`, msg: "barrel index.ts deve exportar o arquivo novo (PADROES.md)" });
  }
}

// YAGNI: símbolos novos sem nenhum uso no resto do código
const srcFiles = [];
const walk = (d) => {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    const s = statSync(p);
    if (s.isDirectory()) { if (e !== "node_modules") walk(p); }
    else if (/\.(ts|html)$/.test(e)) srcFiles.push(p.replace(/\\/g, "/"));
  }
};
walk("src");
const blobs = new Map(srcFiles.map((f) => [f, text(f)]));
const cfgFiles = new Set(["src/app/infrastructure/config/app-endpoints.ts", "src/app/infrastructure/config/app-config.base.ts"]);
const skipNames = new Set(["constructor", "ngOnInit", "ngOnDestroy", "ngOnChanges", "ngAfterViewInit", "ngAfterViewChecked", "if", "for", "while", "switch", "catch", "function", "return", "get", "set"]);
const cand = new Map();
for (const [f, lines] of added) {
  if (!inSrc(f) || !/\.ts$/.test(f) || isSpec(f)) continue;
  for (const [n, t] of lines) {
    let m;
    if ((m = t.match(/^\s*(?:public\s+|private\s+|protected\s+|readonly\s+|static\s+|async\s+|override\s+)*([A-Za-z_]\w*)\s*(?:<[^>]*>)?\(.*\)\s*(?::\s*[^={]+)?\{\s*$/)) && !skipNames.has(m[1]) && !/^(private)\b/.test(t.trim())) cand.set(`${f}:${m[1]}`, { f, n, name: m[1], kind: "método" });
    else if ((m = t.match(/^\s*([A-Z][A-Z0-9_]{3,})\s*=\s*["']/))) cand.set(`${f}:${m[1]}`, { f, n, name: m[1], kind: "enum" });
    else if ((m = t.match(/^export\s+(?:abstract\s+)?(?:const|function|class|enum|type)\s+(\w+)/))) cand.set(`${f}:${m[1]}`, { f, n, name: m[1], kind: "export" });
  }
}
const defRe = (name) => new RegExp(`^\\s*(?:public\\s+|private\\s+|protected\\s+|readonly\\s+|static\\s+|async\\s+|override\\s+)*${name}\\s*(?:<[^>]*>)?\\(.*\\)\\s*(?::\\s*[^={]+)?\\{?\\s*$`);
const count = (re, pred = () => true) => {
  let n = 0;
  for (const [pf, body] of blobs) if (!isSpec(pf) && pred(pf)) n += (body.match(re) || []).length;
  return n;
};
const baseCache = new Map();
const existiaNaBase = (c) => {
  if (status.get(c.f) === "A") return false;
  if (!baseCache.has(c.f)) baseCache.set(c.f, baseText(c.f));
  const b = baseCache.get(c.f);
  return new RegExp(`(^|[^A-Za-z0-9_$])${c.name}([^A-Za-z0-9_$]|$)`).test(b);
};
for (const c of cand.values()) {
  if (existiaNaBase(c)) continue; // símbolo antigo só reformatado/movido: não é novo
  let uses;
  if (c.kind === "método") {
    const defs = srcFiles.filter((pf) => !isSpec(pf)).reduce((acc, pf) => acc + blobs.get(pf).split("\n").filter((l) => defRe(c.name).test(l)).length, 0);
    const calls = count(new RegExp(`\\.${c.name}\\b|(^|[^A-Za-z0-9_$.])${c.name}\\(`, "g"), () => true) - defs;
    uses = calls >= defs ? 1 : 0; // menos chamadas do que definições = alguma definição ficou sem uso
    if (uses === 0) hits.push({ sev: "menor", id: "yagni/sem-uso", f: c.f, n: c.n, t: `método \`${c.name}\`: ${defs} definição(ões) e ${Math.max(calls, 0)} chamada(s) no código`, msg: "novo e sem chamador (confirme: pode ser usado só em spec ou por reflexão)" });
    continue;
  }
  const re = new RegExp(`(^|[^A-Za-z0-9_$])${c.name}([^A-Za-z0-9_$]|$)`, "g");
  uses = count(re, (pf) => !(c.kind === "enum" && cfgFiles.has(pf))) - (c.kind === "enum" ? 0 : 1);
  if (uses <= 0) hits.push({ sev: "menor", id: "yagni/sem-uso", f: c.f, n: c.n, t: `${c.kind} \`${c.name}\` sem nenhum uso no código`, msg: "novo e ninguém usa (confirme: pode ser usado só em spec)" });
}
// órfãos: membro de ApiPath que a mudança deixou sem nenhum uso (existia e era usado na base)
{
  const epFile = "src/app/infrastructure/config/app-endpoints.ts";
  const cur = text(epFile);
  const usadosBase = new Set();
  for (const l of git(["grep", "-o", "-E", "ApiPath\\.[A-Z0-9_]+", base, "--", "src"], true).split("\n")) {
    const m = l.match(/^[^:]+:(.+?):(ApiPath\.[A-Z0-9_]+)$/); // sha:arquivo:ApiPath.X
    if (m && !cfgFiles.has(m[1]) && !/\.spec\.ts$/.test(m[1])) usadosBase.add(m[2].slice(8));
  }
  const addedNames = new Set([...cand.values()].filter((c) => c.kind === "enum").map((c) => c.name));
  for (const m of cur.matchAll(/^\s*([A-Z][A-Z0-9_]{3,})\s*=\s*["']/gm)) {
    const name = m[1];
    if (addedNames.has(name) || !usadosBase.has(name)) continue;
    if (count(new RegExp(`ApiPath\\.${name}\\b`, "g"), (pf) => !cfgFiles.has(pf) || pf === "src/app/infrastructure/config/app-config.base.ts" ? !cfgFiles.has(pf) : false) === 0) {
      hits.push({ sev: "menor", id: "yagni/orfao", f: epFile, n: 1, t: `ApiPath.${name} era usado na base e a mudança deixou sem uso`, msg: "remover o enum e o path em BASE_PATHS se não há mais chamador" });
    }
  }
}

// padrões do time: branch, commits, Co-Authored-By, package.json
const meta = [];
const branchOk = /^(feature|fix|hotfix|style|refactor|test|chore|docs)\/\d+-[a-z0-9-]+$/.test(branch) || ["main", "develop", "hmg"].includes(branch);
if (!branchOk) meta.push(`branch "${branch}" fora do padrão PREFIXO/TASK-NOME (prefixos: feature, fix, hotfix, style, refactor, test, chore, docs)`);
const okCommit = /^(chore|feat|fix|refactor|docs|perf|style|test|build|ci|env): [^A-Z].*[^.]$/;
for (const c of commits) {
  const [h, s] = c.split("\t");
  if (/^Merge /.test(s) || /^chore: Merge/.test(s)) continue;
  if (!okCommit.test(s) || s.length > 72) meta.push(`commit ${h} fora do padrão: "${s}"`);
}
const coauth = git(["log", "-i", "--grep=co-authored-by", "--format=%h %s", `${base}..HEAD`]).trim();
if (coauth) meta.push(`trailer Co-Authored-By proibido no monitora-client:\n      ${coauth.split("\n").join("\n      ")}`);
if (added.has("package.json")) meta.push("package.json alterado: dependência nova precisa de justificativa no PR");
if (eolOnly.length) meta.push(`${eolOnly.length} arquivo(s) alterado(s) só por fim de linha (CRLF x LF): ${eolOnly.slice(0, 3).join(", ")}${eolOnly.length > 3 ? "..." : ""}`);

// ---------- verificações (não corrigem nada) ----------
const WIN = process.platform === "win32";
const run = (cmd, a) =>
  WIN
    ? spawnSync([cmd, ...a.map((x) => (/[\s"]/.test(x) ? `"${x}"` : x))].join(" "), { encoding: "utf8", shell: true, maxBuffer: 256 * 1024 * 1024 })
    : spawnSync(cmd, a, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");
const inChange = (f, n) => (added.get(f) ? added.get(f).has(n) : status.get(f) === "A");
const ver = [];
const changedTsHtml = files.filter((f) => inSrc(f) && /\.(ts|html)$/.test(f) && !isSpec(f));
const changedScss = files.filter((f) => inSrc(f) && /\.scss$/.test(f));
if (!existsSync("node_modules")) {
  ver.push("node_modules ausente: rode `npm install` para eslint/stylelint/ng build");
} else {
  if (!flag("sem-lint") && changedTsHtml.length) {
    const t = Date.now();
    let r = { stdout: "", stderr: "" };
    const out = [];
    for (const grupo of chunks(changedTsHtml, 20)) {
      r = run("npx", ["--no-install", "eslint", "--format", "json", ...grupo]);
      try { out.push(...JSON.parse(r.stdout || "[]")); } catch { out.length = 0; break; }
    }
    try {
      if (!out.length && changedTsHtml.length && !/^\s*\[/.test(r.stdout || "")) throw new Error("sem json");
      let novo = 0, antigo = 0;
      for (const fr of out) {
        const f = relative(root, fr.filePath).replace(/\\/g, "/");
        for (const m of fr.messages) {
          if (inChange(f, m.line)) { novo++; hits.push({ sev: m.severity === 2 ? "importante" : "menor", id: `eslint/${m.ruleId || "erro"}`, f, n: m.line, t: m.message, msg: "eslint (linha da mudança)" }); }
          else antigo++;
        }
      }
      ver.push(`eslint (${changedTsHtml.length} arquivos, ${secs(t)}): ${novo} em linha da mudança, ${antigo} antigos (dívida, ignorados)`);
    } catch { ver.push(`eslint falhou (${secs(t)}): ${strip(r.stderr || "").split("\n").slice(0, 3).join(" | ")}`); }
  }
  if (!flag("sem-lint") && changedScss.length) {
    const t = Date.now();
    const r = run("npx", ["--no-install", "stylelint", "--formatter", "json", ...changedScss]);
    try {
      const out = JSON.parse((r.stdout && r.stdout.trim()) || r.stderr || "[]");
      let novo = 0, antigo = 0;
      for (const fr of out) {
        const f = relative(root, fr.source).replace(/\\/g, "/");
        for (const w of fr.warnings) {
          if (inChange(f, w.line)) { novo++; hits.push({ sev: "menor", id: `stylelint/${w.rule}`, f, n: w.line, t: w.text, msg: "stylelint (linha da mudança)" }); }
          else antigo++;
        }
      }
      ver.push(`stylelint (${changedScss.length} arquivos, ${secs(t)}): ${novo} na mudança, ${antigo} antigos`);
    } catch { ver.push(`stylelint falhou (${secs(t)})`); }
  }
  if (!flag("sem-build")) {
    const t = Date.now();
    const r = run("npx", ["--no-install", "ng", "build", "--configuration", "development", "--output-path", join("node_modules", ".cache", "cricri-dist")]);
    const out = strip((r.stdout || "") + (r.stderr || ""));
    const blocks = out.split(/\n(?=[^\S\n]*[✘▲X]\s*\[?(?:ERROR|WARNING)\]?|\[(?:ERROR|WARNING)\])/);
    let erros = 0, avisos = 0, errosMud = 0, avisosMud = 0;
    for (const b of blocks) {
      const isErr = /\[ERROR\]/.test(b.split("\n")[0]), isWarn = /\[WARNING\]/.test(b.split("\n")[0]);
      if (!isErr && !isWarn) continue;
      isErr ? erros++ : avisos++;
      const loc = b.match(/(src\/[^\s:]+\.(?:ts|html|scss|css)):(\d+):(\d+)/);
      const f = loc ? loc[1] : null;
      const nl = loc ? Number(loc[2]) : 0;
      const msg = b.split("\n")[0].replace(/^.*\[(?:ERROR|WARNING)\]\s*/, "").slice(0, 150);
      const noMeu = f && (inChange(f, nl) || status.has(f));
      if (noMeu) { isErr ? errosMud++ : avisosMud++; hits.push({ sev: isErr ? "bloqueante" : "menor", id: isErr ? "build/erro" : "build/warning", f, n: nl, t: msg, msg: "ng build" }); }
      else if (isErr) hits.push({ sev: "importante", id: "build/erro-fora-da-mudanca", f: f || "(sem arquivo)", n: nl, t: msg, msg: "erro de build fora dos arquivos alterados: confira se a mudança causou" });
    }
    ver.push(`ng build (${secs(t)}): saída ${r.status}, ${erros} erro(s) e ${avisos} warning(s) no total; ${errosMud} erro(s) e ${avisosMud} warning(s) em arquivo da mudança`);
  }
}

// ---------- saída ----------
if (flag("json")) {
  console.log(JSON.stringify({ base, branch, commits: commits.length, files: files.length, meta, ver, hits }, null, 1));
  process.exit(0);
}
const layer = (f) => (f.match(/^src\/app\/([^/]+)/) || [, "outros"])[1];
const byLayer = {};
for (const f of files) byLayer[layer(f)] = (byLayer[layer(f)] || 0) + 1;
console.log(`# front-scan  base ${base.slice(0, 7)}  branch ${branch}  ${commits.length} commit(s)  ${files.length} arquivo(s): ${Object.entries(byLayer).map(([k, v]) => `${k} ${v}`).join(", ")}`);
if (files.length > 25) console.log(`# mudança grande (${files.length} arquivos): avaliar dividir o PR`);
const order = ["bloqueante", "importante", "verificar", "menor"];
const seen = new Set();
for (const sev of order) {
  const list = hits.filter((h) => h.sev === sev);
  if (!list.length) continue;
  console.log(`\n## ${sev} (${list.length})`);
  const per = {};
  for (const h of list) {
    per[h.id] = (per[h.id] || 0) + 1;
    if (per[h.id] > 6) continue;
    const key = `${h.id}|${h.f}|${h.n}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`- ${h.id}  ${h.f}:${h.n}  ${h.t.slice(0, 150)}`);
  }
  for (const [id, c] of Object.entries(per)) if (c > 6) console.log(`  (+${c - 6} de ${id})`);
  const msgs = [...new Set(list.map((h) => `${h.id}: ${h.msg}`))];
  console.log(`  dica: ${msgs.slice(0, 6).join(" | ")}`);
}
if (meta.length) { console.log("\n## padroes do time"); for (const m of meta) console.log(`- ${m}`); }
if (ver.length) { console.log("\n## verificacoes"); for (const v of ver) console.log(`- ${v}`); }
const mexeuContrato = files.filter((f) => /^src\/app\/(infrastructure\/(http|config)|domain\/models)\//.test(f) && !isSpec(f));
console.log(`\n# contrato: ${mexeuContrato.length ? `sim (${mexeuContrato.length} arquivo(s) de http/config/models alterado(s)): rode scripts/contrato.mjs com a URL de dev/hmg` : "não (nenhum arquivo de http, config ou models alterado)"}`);
console.log(`# ${secs(t0)} no total`);
