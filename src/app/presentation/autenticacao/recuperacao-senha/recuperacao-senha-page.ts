import { Component, DestroyRef, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";

import { AlertService, AuthService } from "@application";
import { ROUTES } from "@domain";
import { NavigationUtil } from "@shared";

import { CaoBaseButtonComponent } from "ngx-opalbytes-components";


type RecuperacaoState = "form" | "sent";

@Component({
  selector: "app-recuperacao-senha-page",
  standalone: true,
  imports: [ReactiveFormsModule, CaoBaseButtonComponent],
  templateUrl: "./recuperacao-senha-page.component.html",
})
export class RecuperacaoSenhaPageComponent {
  private readonly nav = inject(NavigationUtil);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly alertService = inject(AlertService);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.fb.nonNullable.group({
    email: ["", [Validators.required, Validators.email]],
  });

  readonly state = signal<RecuperacaoState>("form");
  readonly loading = signal(false);

  voltar(): void {
    this.nav.navigateTo(ROUTES.LOGIN);
  }

  submit(): void {
    if (this.loading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviar();
  }

  reenviar(): void {
    if (this.loading()) return;
    this.enviar();
  }

  private enviar(): void {
    this.loading.set(true);
    const { email } = this.form.getRawValue();
    this.authService
      .recuperarSenha(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.alertService.success("Instruções enviadas com sucesso");
          this.state.set("sent");
        },
        error: () => {
          this.loading.set(false);
          this.alertService.error("Não foi possível enviar as instruções. Tente novamente em instantes");
        },
      });
  }
}
