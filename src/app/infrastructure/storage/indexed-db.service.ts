import { isPlatformBrowser } from "@angular/common";
import { Injectable, PLATFORM_ID, inject } from "@angular/core";

/** Opções para armazenamento de um item no IndexedDB. */
export interface IIndexedDbOptions {
  /** Tempo de vida em milissegundos. Após expirar, o item é removido automaticamente no próximo acesso. */
  expiresIn?: number;
}

/** Registro interno gravado no object store. Não exportado intencionalmente. */
interface IDbRecord {
  /** Chave ofuscada (keyPath). */
  k: string;
  /** Valor serializado e ofuscado. */
  v: string;
  /** Timestamp de expiração em ms epoch. Ausente = sem expiração. */
  exp?: number;
}

const DB_NAME = "monitora_db";
const DB_VERSION = 1;
const STORE_NAME = "app_store";
/** Prefixo de isolamento para as chaves. */
const PREFIX = "_m_";

/**
 * Serviço de manipulação do `IndexedDB` do browser.
 *
 * - API completamente assíncrona (`Promise`-based).
 * - Todas as **chaves** são ofuscadas com base64 antes de serem gravadas.
 * - Todos os **valores** são serializados em JSON e ofuscados com base64.
 * - Suporte a TTL (time-to-live) com lazy expiration no momento do acesso.
 * - Abertura do banco de dados é lazy e cacheada na instância.
 * - Guard de plataforma: operações retornam valores nulos/vazios fora do browser (SSR safe).
 * - Sem dependências externas — usa apenas a API nativa `indexedDB`.
 *
 * @example
 * ```ts
 * await indexedDbService.set('largeData', payload, { expiresIn: 86_400_000 });
 * const data = await indexedDbService.get<MyType>('largeData');
 * ```
 */
@Injectable({ providedIn: "root" })
export class IndexedDbService {
  private readonly platformId = inject(PLATFORM_ID);

  /** Instância cacheada do banco. Aberto sob demanda na primeira operação. */
  private _db: IDBDatabase | null = null;

  // ─── Escrita ────────────────────────────────────────────────────────────────

  /**
   * Armazena um valor associado à chave informada.
   * Sobrescreve qualquer valor existente para a mesma chave.
   *
   * @param key   Identificador legível da entrada (será ofuscado internamente).
   * @param value Valor a armazenar. Qualquer tipo serializável em JSON.
   * @param options Opções de armazenamento, como TTL.
   */
  async set<T>(key: string, value: T, options: IIndexedDbOptions = {}): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const db = await this.openDb();
    const record: IDbRecord = {
      k: this.encodeKey(key),
      v: this.serializeValue({ v: value }),
      ...(options.expiresIn !== undefined && { exp: Date.now() + options.expiresIn }),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const req = tx.objectStore(STORE_NAME).put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // ─── Leitura ─────────────────────────────────────────────────────────────────

  /**
   * Recupera o valor associado à chave.
   * Retorna `null` se a chave não existir ou se o item estiver expirado.
   * Itens expirados são removidos automaticamente neste momento (lazy expiration).
   *
   * @param key Identificador legível da entrada.
   * @returns Promise com o valor armazenado ou `null`.
   */
  async get<T>(key: string): Promise<T | null> {
    if (!isPlatformBrowser(this.platformId)) return null;

    const db = await this.openDb();
    const encodedKey = this.encodeKey(key);

    const record = await new Promise<IDbRecord | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(encodedKey);
      req.onsuccess = () => resolve(req.result as IDbRecord | undefined);
      req.onerror = () => reject(req.error);
    });

    if (!record) return null;

    if (record.exp !== undefined && Date.now() > record.exp) {
      await this.remove(key);
      return null;
    }

    const parsed = this.deserializeValue<{ v: T }>(record.v);
    return parsed ? parsed.v : null;
  }

  // ─── Remoção ─────────────────────────────────────────────────────────────────

  /**
   * Remove a entrada associada à chave.
   * Não lança erro se a chave não existir.
   *
   * @param key Identificador legível da entrada.
   */
  async remove(key: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const req = tx.objectStore(STORE_NAME).delete(this.encodeKey(key));
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Remove **todas** as entradas gravadas por este serviço (prefixo `_m_`).
   * Registros de outros object stores não são afetados.
   */
  async clear(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const allKeys = await this.rawKeys();
    const db = await this.openDb();

    await Promise.all(
      allKeys.map(
        (k) =>
          new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const req = tx.objectStore(STORE_NAME).delete(k);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          })
      )
    );
  }

  // ─── Consulta ────────────────────────────────────────────────────────────────

  /**
   * Verifica se existe uma entrada válida (não expirada) para a chave.
   *
   * @param key Identificador legível da entrada.
   */
  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  /**
   * Retorna a lista de chaves legíveis armazenadas por este serviço.
   * Chaves expiradas são incluídas — use `get()` para verificar validade.
   */
  async keys(): Promise<string[]> {
    if (!isPlatformBrowser(this.platformId)) return [];

    const encoded = await this.rawKeys();
    return encoded.map((k) => this.decodeKey(k)).filter((k): k is string => k !== null);
  }

  /**
   * Retorna a quantidade de entradas armazenadas por este serviço.
   */
  async size(): Promise<number> {
    return (await this.rawKeys()).length;
  }

  // ─── Privados ────────────────────────────────────────────────────────────────

  /**
   * Abre (ou reutiliza) a conexão com o banco IndexedDB.
   * Cria o object store `app_store` na primeira execução (onupgradeneeded).
   */
  private openDb(): Promise<IDBDatabase> {
    if (this._db) return Promise.resolve(this._db);

    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "k" });
        }
      };

      req.onsuccess = (event) => {
        this._db = (event.target as IDBOpenDBRequest).result;
        resolve(this._db);
      };

      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Retorna todas as chaves **ofuscadas** do object store pertencentes a este serviço.
   */
  private async rawKeys(): Promise<string[]> {
    const db = await this.openDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAllKeys();
      req.onsuccess = () => {
        const all = req.result as string[];
        resolve(all.filter((k) => k.startsWith(PREFIX)));
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Ofusca a chave com prefixo + base64.
   * Formato: `_m_<base64(encodeURIComponent(key))>`
   */
  private encodeKey(key: string): string {
    return PREFIX + btoa(encodeURIComponent(key));
  }

  /**
   * Reverte a ofuscação da chave armazenada.
   * Retorna `null` se a chave estiver corrompida.
   */
  private decodeKey(encodedKey: string): string | null {
    try {
      return decodeURIComponent(atob(encodedKey.slice(PREFIX.length)));
    } catch {
      return null;
    }
  }

  /** Serializa e ofusca o envelope de valor. */
  private serializeValue<T>(data: T): string {
    return btoa(encodeURIComponent(JSON.stringify(data)));
  }

  /** Reverte serialização do valor. Retorna `null` se corrompido. */
  private deserializeValue<T>(raw: string): T | null {
    try {
      return JSON.parse(decodeURIComponent(atob(raw))) as T;
    } catch {
      return null;
    }
  }
}
