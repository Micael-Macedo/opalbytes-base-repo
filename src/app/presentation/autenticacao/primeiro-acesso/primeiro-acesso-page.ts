import { Component, DestroyRef, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { switchMap } from "rxjs";

import { AlertService, AuthService } from "@application";
import { ROUTES } from "@domain";
import { NavigationUtil } from "@shared";
import { CaoBaseButtonComponent } from "ngx-opalbytes-components";


type PrimeiroAcessoState = "form" | "sent" | "already-done";

@Component({
  selector: "app-primeiro-acesso-page",
  standalone: true,
  imports: [ReactiveFormsModule, CaoBaseButtonComponent],
  templateUrl: "./primeiro-acesso-page.component.html",
})
export class PrimeiroAcessoPageComponent {
  private readonly nav = inject(NavigationUtil);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly alertService = inject(AlertService);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.fb.nonNullable.group({
    email: ["", [Validators.required, Validators.email]],
  });

  readonly state = signal<PrimeiroAcessoState>("form");
  readonly loading = signal(false);

  voltar(): void {
    this.nav.navigateTo(ROUTES.LOGIN);
  }

  irParaRecuperacaoSenha(): void {
    this.nav.navigateTo(ROUTES.RECUPERACAO_SENHA);
  }

  submit(): void {
    if (this.loading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.verificarEEnviar();
  }

  reenviar(): void {
    if (this.loading()) return;
    this.enviar();
  }

  private verificarEEnviar(): void {
    this.loading.set(true);
    const { email } = this.form.getRawValue();
    this.authService
      .verificarPrimeiroAcesso(email)
      .pipe(
        switchMap((primeiroAcessoPendente) => {
          if (!primeiroAcessoPendente) {
            return [null];
          }
          return this.authService.enviarPrimeiroAcesso(email);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (resultado) => {
          this.loading.set(false);
          if (resultado === null) {
            this.state.set("already-done");
            return;
          }
          this.alertService.success("Instruções enviadas com sucesso");
          this.state.set("sent");
        },
        error: () => {
          this.loading.set(false);
          this.alertService.error("Não foi possível verificar seu acesso. Tente novamente em instantes");
        },
      });
  }

  private enviar(): void {
    this.loading.set(true);
    const { email } = this.form.getRawValue();
    this.authService
      .enviarPrimeiroAcesso(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.alertService.success("Instruções enviadas com sucesso");
        },
        error: () => {
          this.loading.set(false);
          this.alertService.error("Não foi possível enviar as instruções. Tente novamente em instantes");
        },
      });
  }
}
