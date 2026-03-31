import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ServiceService } from '../../settings.service';
import { BehaviorSubject, Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { SharedDataService } from '../../shared-data.service';
import { Router } from '@angular/router';
import { noSpecialCharsValidator } from '../../validators';
import { Options } from 'select2';

@Component({
  selector: 'app-user-add',
  templateUrl: './user-add.component.html',
  styleUrl: './user-add.component.scss'
})
export class UserAddComponent implements OnInit, OnDestroy {
  userForm: FormGroup;
  isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isLoading: boolean = false;
  isSubmitted: boolean = false;
  isEditMode: boolean = false;

  private unsubscribe: Subscription[] = [];
  private subscription: Subscription;

  public roleoptions!: Options;
  public roledata: Array<{ id: string; text: string }> = [];
  public roleValue: string = ''; 

  constructor(
    private _service: ServiceService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private _shareds: SharedDataService,
    private router: Router,
  ) {
    this.userForm = this.fb.group({
      userId:    [0],
      firstName: ['', [Validators.required, noSpecialCharsValidator(50), Validators.maxLength(50)]],
      middleName:['', [noSpecialCharsValidator(50), Validators.maxLength(50)]],
      lastName:  ['', [Validators.required, noSpecialCharsValidator(50), Validators.maxLength(50)]],
      mobile:    ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      email:     ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      userName:  ['', [Validators.required, Validators.maxLength(50)]],
      userPass:  ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]],
      roleId:    ['', [Validators.required]],
      isActive:  [true],
      createdBy: [0],
    });

    const loadingSubscr = this.isLoading$
      .asObservable()
      .subscribe((res) => (this.isLoading = res));
    this.unsubscribe.push(loadingSubscr);
  }

  ngOnInit(): void {
    // Step 1: Read shared data ONCE before anything else
    // Use take(1) so we read exactly the current value without staying subscribed
    this._shareds.user$.pipe(take(1)).subscribe((data) => {
      if (data) {
        // EDIT MODE — has data, load dropdown then patch
        this.loadRoleDropdown(data);
      } else {
        // ADD MODE — no data, just load dropdown with clean form
        this.loadRoleDropdown(null);
      }
    });
  }

  // ─── Load Role Dropdown ───────────────────────────────────────────────────
  loadRoleDropdown(editData: string | null) {
    this._service.dropdownAll('', '1', '5', '0').subscribe(
      (response) => {
        this.roledata = [
          { id: '', text: 'Select Role' },
          ...response.map((item: any) => ({
            id: item.id.toString(),
            text: item.text,
          }))
        ];

        this.roleoptions = {
          data: this.roledata,
          width: '100%',
          placeholder: 'Select Role Name',
          allowClear: true,
        };

        this.cdr.detectChanges();

        // Step 2: After dropdown is ready, patch form if edit mode
        if (editData) {
          this.patchEditForm(editData);
        }
        // ADD mode — form already clean from initialization
      },
      (error) => {
        console.error('Role dropdown error:', error);
        if (editData) {
          this.patchEditForm(editData); // still try to patch even if dropdown fails
        }
      }
    );
  }

  // ─── Patch form for Edit Mode ─────────────────────────────────────────────
  patchEditForm(data: string) {
    let obj: any;
    try {
      obj = JSON.parse(data);
    } catch {
      return;
    }
  
    if (!obj || !obj.userid || obj.userid <= 0) return;
  
    this.isEditMode = true;
  
    this.userForm.get('userPass')?.clearValidators();
    this.userForm.get('userPass')?.setValidators([
      Validators.minLength(6),
      Validators.maxLength(100),
    ]);
    this.userForm.get('userPass')?.updateValueAndValidity();
  
    setTimeout(() => {
      // Patch all fields
      this.userForm.patchValue({
        userId:     obj.userid,
        firstName:  obj.firstname,
        middleName: typeof obj.middlename === 'string' ? obj.middlename.trim() : '',
        lastName:   obj.lastname,
        mobile:     obj.mobile,
        email:      obj.email,
        userName:   obj.username,
        userPass:   '',
        roleId:     obj.roleid?.toString(),
        isActive:   obj.isactive,
        createdBy:  0,
      });
  
      // ← Set roleValue separately to force select2 to visually update
      this.roleValue = obj.roleid?.toString();
  
      this._shareds.clearUserData();
      this.cdr.detectChanges();
    }, 300);
  }

  // ─── Role Dropdown Change ─────────────────────────────────────────────────
  onRoleChange(event: any) {
    this.roleValue = event;
    this.userForm.get('roleId')?.setValue(event);
    this.userForm.get('roleId')?.markAsTouched();
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  onSubmit() {
    this.isSubmitted = true;

    if (this.userForm.invalid) {
      return;
    }

    this.isLoading$.next(true);

    this._service.userAdd(this.userForm.value).subscribe(
      (res: any) => {
        this.isLoading$.next(false);
        this.cdr.detectChanges();
        Swal.fire('Success!', 'User saved successfully!', 'success');
        this.router.navigate(['/settings/user-data']);
      },
      (error: any) => {
        this.isLoading$.next(false);
        this.cdr.detectChanges();
        Swal.fire('Error', error.error.message, 'error');
      }
    );
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}