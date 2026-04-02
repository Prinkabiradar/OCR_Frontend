import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { firstValueFrom } from 'rxjs';

const API = `${environment.BaseUrl}api/Auth`;

enum Step { Identify = 1, VerifyOtp, NewPassword, Done }

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  Step = Step;
  currentStep = Step.Identify;

  identifyForm: FormGroup;
  otpForm: FormGroup;
  resetForm: FormGroup;

  isLoading = false;
  errorMsg = '';

  emailOrMobile = '';
  userId = 0;

  timerSeconds = 0;
  canResend = false;
  private timerRef: any;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private zone: NgZone,
    private cdr: ChangeDetectorRef   // ← add this
  ) {}

  ngOnInit() {
    this.identifyForm = this.fb.group({
      emailOrMobile: ['', [Validators.required, Validators.minLength(3)]],
    });

    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    });

    this.resetForm = this.fb.group(
      {
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  ngOnDestroy() { this.clearTimer(); }

  async sendOtp() {
    if (this.identifyForm.invalid) return;
    this.emailOrMobile = this.identifyForm.value.emailOrMobile;
    this.isLoading = true;
    this.errorMsg = '';
    this.cdr.detectChanges();   // force UI update immediately

    try {
      await firstValueFrom(
        this.http.post(`${API}/send-otp`, { EmailOrMobile: this.emailOrMobile })
      );
      this.isLoading = false;
      this.currentStep = Step.VerifyOtp;
      this.startTimer();
      this.cdr.detectChanges();  // force step change to render
    } catch (err: any) {
      this.isLoading = false;
      this.errorMsg = err?.error?.message || 'No account found with this email or mobile.';
      this.cdr.detectChanges();
    }
  }

  async verifyOtp() {
    if (this.otpForm.invalid) return;
    this.isLoading = true;
    this.errorMsg = '';
    this.cdr.detectChanges();

    try {
      const res = await firstValueFrom(
        this.http.post<{ success: boolean; userId: number }>(`${API}/verify-otp`, {
          EmailOrMobile: this.emailOrMobile,
          Otp: this.otpForm.value.otp,
        })
      );
      this.isLoading = false;
      this.userId = res.userId;
      this.clearTimer();
      this.currentStep = Step.NewPassword;
      this.cdr.detectChanges();
    } catch (err: any) {
      this.isLoading = false;
      this.errorMsg = err?.error?.message || 'Invalid or expired OTP.';
      this.cdr.detectChanges();
    }
  }

  async resendOtp() {
    this.otpForm.reset();
    this.errorMsg = '';
    try {
      await firstValueFrom(
        this.http.post(`${API}/send-otp`, { EmailOrMobile: this.emailOrMobile })
      );
      this.startTimer();
      this.cdr.detectChanges();
    } catch {
      this.errorMsg = 'Failed to resend OTP.';
      this.cdr.detectChanges();
    }
  }

  async resetPassword() {
    if (this.resetForm.invalid) return;
    this.isLoading = true;
    this.errorMsg = '';
    this.cdr.detectChanges();

    try {
      await firstValueFrom(
        this.http.post(`${API}/reset-password`, {
          UserId: this.userId,
          NewPassword: this.resetForm.value.newPassword,
          ConfirmPassword: this.resetForm.value.confirmPassword,
        })
      );
      this.isLoading = false;
      this.currentStep = Step.Done;
      this.cdr.detectChanges();
    } catch (err: any) {
      this.isLoading = false;
      this.errorMsg = err?.error?.message || 'Failed to reset password.';
      this.cdr.detectChanges();
    }
  }

  goToLogin() { this.router.navigate(['/auth/login']); }

  private startTimer() {
    this.timerSeconds =300; //60;
    this.canResend = false;
    this.clearTimer();
    // ← run timer INSIDE Angular zone so template updates every tick
    this.zone.run(() => {
      this.timerRef = setInterval(() => {
        this.timerSeconds--;
        if (this.timerSeconds <= 0) {
          this.clearTimer();
          this.canResend = true;
        }
        this.cdr.detectChanges();
      }, 1000);
    });
  }

  get timerDisplay(): string {
    const m = Math.floor(this.timerSeconds / 60);
    const s = this.timerSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  
  private clearTimer() {
    if (this.timerRef) { clearInterval(this.timerRef); this.timerRef = null; }
  }

  private passwordMatchValidator(g: FormGroup) {
    const p = g.get('newPassword')?.value;
    const c = g.get('confirmPassword')?.value;
    return p === c ? null : { mismatch: true };
  }
}