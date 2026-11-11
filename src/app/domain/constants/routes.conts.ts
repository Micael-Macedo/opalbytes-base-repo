export type Permission =
  | "cadastro_rtmp"
  | "cadastro_posto"
  | "cadastro_organizacao"
  | "download_gravacao"
  | "monitoramento_pratico"
  | "cadastro_usuario"
  | "suporte"
  | "sala_online"
  | "gerenciamento_permissao"
  | "gravacoes"
  | "configuracoes"
  | "cadastro"
  | "agendamento"
  | "monitoramento"
  | "status";

export interface ISidebarItem {
  route: string;
  label: string;
  icon: string;
  permissions: Permission[];
  children?: ISidebarItem[];
}

export const PermissionsRoles = {
  CadastroRtmp: "cadastro_rtmp",
  CadastroPosto: "cadastro_posto",
  CadastroOrganizacao: "cadastro_organizacao",
  DownloadGravacao: "download_gravacao",
  MonitoramentoPratico: "monitoramento_pratico",
  CadastroUsuario: "cadastro_usuario",
  Suporte: "suporte",
  SalaOnline: "sala_online",
  GerenciamentoPermissao: "gerenciamento_permissao",
  Gravacoes: "gravacoes",
  Configuracoes: "configuracoes",
  Cadastro: "cadastro",
  Agendamento: "agendamento",
  Monitoramento: "monitoramento",
  Status: "status",
} as const satisfies Record<string, Permission>;

export const APP_BASE_SEGMENT = "app";

export const ROUTES = {
  LOGIN: {
    route: "/login",
    segment: "login",
    label: "Login",
    icon: "/assets/images/svg/sign-in-icon.svg",
    permissions: [] as Permission[],
  },
  NOT_FOUND: {
    route: "/not-found",
    segment: "not-found",
    label: "Página não encontrada",
    icon: "/assets/images/svg/error-circle-icon.svg",
    permissions: [] as Permission[],
  },
  UNAUTHORIZED: {
    route: "unauthorized",
    segment: "unauthorized",
    label: "Acesso negado",
    icon: "/assets/images/svg/lock-access-icon.svg",
    permissions: [] as Permission[],
  },
  HOME: {
    route: "home",
    segment: "home",
    label: "Início",
    icon: "/assets/images/svg/building-home-icon.svg",
    permissions: [] as Permission[],
  },
  PRIMEIRO_ACESSO: {
    route: "/primeiro-acesso",
    segment: "primeiro-acesso",
    label: "Primeiro Acesso",
    icon: "/assets/images/svg/sign-in-icon.svg",
    permissions: [] as Permission[],
  },
  RECUPERACAO_SENHA: {
    route: "/recuperacao-senha",
    segment: "recuperacao-senha",
    label: "Recuperação de Senha",
    icon: "/assets/images/svg/key-icon.svg",
    permissions: [] as Permission[],
  },
} as const;

export type RouteKey = keyof typeof ROUTES;

// export const SIDEBAR_ITEMS: ISidebarItem[] = [
//   ROUTES.HOME,
//   {
//     ...ROUTES.CADASTRO,
//     children: [
//       ROUTES.CADASTRO_USUARIO,
//       ROUTES.CADASTRO_POSTO,
//     ],
//   },
//   ROUTES.GERENCIAMENTO_ACESSO,
//   ROUTES.SALA_ONLINE,
//   ROUTES.MONITORAMENTO,
//   ROUTES.GRAVACOES,
//   ROUTES.PRATICO,
//   ROUTES.STATUS,
//   ROUTES.SUPORTE,
//   ROUTES.CONFIGURACOES,
// ];

export const UNLOGGED_ROUTES = [
  ROUTES.LOGIN,
  //   ROUTES.RECUPERACAO_SENHA,
  //   ROUTES.PRIMEIRO_ACESSO,
  ROUTES.NOT_FOUND
]

// export const ROUTES_WITH_SUBTITLE = [
//    ROUTES.GERENCIAMENTO_ACESSO,
//    ROUTES.CADASTRO_USUARIO,
//    ROUTES.CADASTRO_ORGANIZACAO,
//    ROUTES.CADASTRO_POSTO,
//    ROUTES.CADASTRO_CAMERA,
//    ROUTES.STATUS
// ]