/**
 * @module domain/models/auth
 *
 * @description
 * Modelos (classes ou interfaces) que representam entidades de autenticação
 * e autorização no domínio. Exemplos esperados:
 *
 * - `usuario.model.ts` — entidade do usuário autenticado (id, nome, perfil, token)
 * - `credenciais.model.ts` — par login/senha usado no fluxo de login
 * - `token-payload.model.ts` — claims decodificados do JWT
 * - `sessao.model.ts` — estado da sessão ativa
 *
 * @rule Modelos anêmicos — apenas shape e construtores simples.
 *       Regras de validação ficam em `application/validators`.
 * @layer domain — consumido por application/services/auth e infrastructure/auth.
 *
 * @example
 * import { Usuario, TokenPayload } from '@app/domain/models/auth';
 *
 * const usuario: Usuario = { id: '1', nome: 'João', perfil: PerfilUsuario.ADMIN };
 */

export * from "./auth.model";
export * from "./token-payload.model";
