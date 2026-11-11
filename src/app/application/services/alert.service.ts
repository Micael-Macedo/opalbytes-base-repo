import { BaseAlertService } from "ngx-opalbytes-components";

export class AlertService extends BaseAlertService {
    success(message: string): void {
        this.show({ type: "success", message, title: "Sucesso"});
    }

    error(message: string): void {
        this.show({ type: "error", message, title: "Erro"});
    }

    warning(message: string): void {
        this.show({ type: "warning", message, title: "Aviso"});
    }
}