import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ServiceService } from '../../settings.service';
import { BehaviorSubject, Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { SharedDataService } from '../../shared-data.service';
import { Router } from '@angular/router';
import { noSpecialCharsValidator } from '../../validators';
@Component({
  selector: 'app-roles-add',
  templateUrl: './roles-add.component.html',
  styleUrl: './roles-add.component.scss'
})
export class RolesAddComponent implements OnDestroy{
  rolesForm: FormGroup;
  isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isLoading: boolean;
  isSubmitted: boolean = false;  // Flag to track if the form was submitted
  private unsubscribe: Subscription[] = [];
  private subscription: Subscription;
  constructor(
    private _service: ServiceService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private _shareds: SharedDataService,
    private router: Router,
  ) {
    this.rolesForm = this.fb.group({
      RoleId: [ 0, Validators.required],
      RoleCode: ['', [ Validators.required, noSpecialCharsValidator(10),  Validators.maxLength(10), ]],
      RoleName: ['', [Validators.required, noSpecialCharsValidator(50)]],
      RoleDescription: ['', noSpecialCharsValidator(255)],
      UserId:[0],
      IsActive:[true],
    });

    const loadingSubscr = this.isLoading$.asObservable().subscribe((res) => (this.isLoading = res));
    this.unsubscribe.push(loadingSubscr);
  }

  ngOnInit(): void {
    this.Edit();
  }

  onSubmit() {
    this.isSubmitted = true;  // Mark the form as submitted

    if (this.rolesForm.invalid) {
      return;  // Don't submit if the form is invalid
    }

    this.isLoading$.next(true);

    // Simulate an async service call with a delay
    this._service.rolesAdd(this.rolesForm.value).subscribe(
      (res: any) => {
        this.isLoading$.next(false);
        this.cdr.detectChanges();
        Swal.fire('Role Added successfully!', 'Role Added successfully!', 'success');
        this.router.navigate(['/settings/roles-data']);
      },
      (error: any) => {
        this.isLoading$.next(false);
        this.cdr.detectChanges();
        Swal.fire('Error', error.error.message, 'error');
      }
    );
  }
  Edit() {
    this.subscription = this._shareds.role$.subscribe(async (data) => {
      var obj = JSON.parse(data);

      // this.rolesForm.controls.ManagerID.setValue(obj.ManagerId.toString());
      //  // Create the selection object in the format ng-select2 expects
      //   const selectedManagerdrp = {
      //     id: obj.ManagerId.toString(),
      //     text:  obj.Texts.toString(),
      //   };

    

      // Update form after a short delay to ensure Select2 is initialized
      setTimeout(() => {
        this.rolesForm.patchValue({
          RoleId: obj.RoleId.toString(),
          RoleName: obj.RoleName.toString(),
          RoleCode: obj.RoleCode,
          RoleDescription: obj.RoleDescription,
          //ManagerID: obj.ManagerId,
        });
      //  this.data = [selectedManagerdrp];
        //   this.departmentForm.controls.ManagerID.setValue(obj.ManagerId.toString());
        // Trigger change detection
        this._shareds.clearRoleData(); 
         
        this.cdr.detectChanges();
      }, 100);
    });
  }
  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}
