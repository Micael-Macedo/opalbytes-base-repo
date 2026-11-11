import { Component, inject } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";

import { ROUTES } from "@domain";
import { NavigationUtil } from "@shared";
import { AlertService } from "@application";

import { CaoBaseButtonComponent } from "ngx-opalbytes-components";


@Component({
  selector: "app-login-page",
  standalone: true,
  imports: [ReactiveFormsModule, CaoBaseButtonComponent],
  templateUrl: "./login-page.component.html",
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly nav = inject(NavigationUtil);
  private readonly alertService = inject(AlertService)

  form = this.fb.nonNullable.group({
    username: ["", Validators.required],
    password: ["", Validators.required],
  });

  loading = false;
  showPassword = false;

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.alertService.warning("Campos obrigatórios não preenchidos");
      return;
    }
    if (this.loading) return;
    this.loading = true;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  goToRecuperacaoSenha(): void {
    this.nav.navigateTo(ROUTES.RECUPERACAO_SENHA);
  }

  goToPrimeiroAcesso(): void {
    this.nav.navigateTo(ROUTES.PRIMEIRO_ACESSO);
  }
}
