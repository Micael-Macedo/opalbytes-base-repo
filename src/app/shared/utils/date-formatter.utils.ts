export function brDateToISO(dateStr: string): string {
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const [day, month, year] = parts.map(Number);
    if (
      !isNaN(day) &&
      !isNaN(month) &&
      !isNaN(year) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      const date = new Date(year, month - 1, day);
      if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
        return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }
    return dateStr;
  }
  return dateStr;
}

export enum DateTypeEnum {
  DEFAULT = 0,
  DAYMONTH = 1, 
  HOURMINUTES = 2,
  DATETIMEWITHOUTYEAR = 3,
  DATEONLY = 4,
  DATE_DEFAULT = 5
}

export function formatarDataCurta(data?: string | null, type: DateTypeEnum = DateTypeEnum.DEFAULT): string {
  if (!data) return "";
  const date = new Date(data);
  if (Number.isNaN(date.getTime())) return "";
  const dia = String(date.getDate()).padStart(2, "0");
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const horas = String(date.getHours()).padStart(2, "0");
  const minutos = String(date.getMinutes()).padStart(2, "0");

  switch (type) {
    case DateTypeEnum.DATE_DEFAULT:
      return `${dia}/${mes}/${date.getFullYear()} às ${horas}h:${minutos}`;
    case DateTypeEnum.DEFAULT:
      return `${dia}/${mes} às ${horas}h:${minutos}`;
    case DateTypeEnum.DAYMONTH:
      return `${dia}/${mes}`;
    case DateTypeEnum.HOURMINUTES:
      return `${horas}h:${minutos}`;
    case DateTypeEnum.DATETIMEWITHOUTYEAR:
      return `${dia}/${mes}, ${horas}:${minutos}`;
    case DateTypeEnum.DATEONLY:
      return `${dia}/${mes}/${date.getFullYear()}`;
  }
}

/** Hora local no formato HH:mm. */
export function formatarHora(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Data por extenso em pt-BR com mês capitalizado (ex.: sexta-feira, 21 de Agosto de 2026). */
export function formatarDataExtenso(data?: string | null): string {
  if (!data) return "";

  const dateOnly = data.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(data);

  if (Number.isNaN(date.getTime())) return "";

  const extenso = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return extenso.replace(/ de (\S+) de (\d{4})/, (_match, mes: string, ano: string) => {
    const mesCapitalizado = mes.charAt(0).toUpperCase() + mes.slice(1);
    return ` de ${mesCapitalizado} de ${ano}`;
  });
}

export function isoDateToBR(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts.map(Number);
    if (
      !isNaN(year) &&
      !isNaN(month) &&
      !isNaN(day) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      const date = new Date(year, month - 1, day);
      if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
        return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${String(year).padStart(4, "0")}`;
      }
    }
    return dateStr;
  }
  return dateStr;
}
