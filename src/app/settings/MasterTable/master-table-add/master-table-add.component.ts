// master-table-add.component.ts
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ServiceService } from '../../settings.service';
import { BehaviorSubject, Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { SharedDataService } from '../../shared-data.service';
import { noSpecialCharsValidator } from '../../validators';

@Component({
  selector: 'app-master-table-add',
  templateUrl: './master-table-add.component.html',
  styleUrl: './master-table-add.component.scss'
})
export class MasterTableAddComponent implements OnInit {
  mastertableForm: FormGroup;
  isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isLoading: boolean;
  isSubmitted: boolean = false;  // Flag to track if the form was submitted
  private unsubscribe: Subscription[] = [];
  private subscription: Subscription;

  constructor(
    private _service: ServiceService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef ,
    private router: Router,
    private _shareds: SharedDataService,
  ) {
    this.mastertableForm = this.fb.group({
      MasterId: [0, Validators.required],
      MasterName: ['', [Validators.required, noSpecialCharsValidator(50)]],
             IsActive: [true, Validators.required]
    });

    const loadingSubscr = this.isLoading$.asObservable().subscribe((res) => (this.isLoading = res));
    this.unsubscribe.push(loadingSubscr);
  }

  ngOnInit(): void {
    this.Edit();
  }
  // with confirmation dialog box
  onSubmit() {
    this.isSubmitted = true; // Mark the form as submitted
  
    if (this.mastertableForm.invalid) {
      return; // Don't submit if the form is invalid
    }
  
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to save? Remember, once you save, it cannot be edited.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, save it!',
      cancelButtonText: 'No, cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading$.next(true);
  
        // Call the service method and subscribe to the response
        this._service.masterTableAdd(this.mastertableForm.value).subscribe(
          (res: any) => {
            this.isLoading$.next(false);
            this.cdr.detectChanges();
            Swal.fire('Success', 'Master Name added successfully!', 'success');
            this.router.navigate(['/settings/mastertable-data']);
          },
          (error: any) => {
            this.isLoading$.next(false);
            this.cdr.detectChanges();
            Swal.fire('Error', error.error.message || 'Something went wrong!', 'error');
          }
        );
      }
    });
  }


  Edit() {
    this.subscription = this._shareds.mastertable$.subscribe(async (data) => {
      var obj = JSON.parse(data);
      console.log(obj);

      // this.rolesForm.controls.ManagerID.setValue(obj.ManagerId.toString());
      //  // Create the selection object in the format ng-select2 expects
      //   const selectedManagerdrp = {
      //     id: obj.ManagerId.toString(),
      //     text:  obj.Texts.toString(),
      //   };

      // Update form after a short delay to ensure Select2 is initialized
      setTimeout(() => {
        this.mastertableForm.patchValue({
          MasterId: obj.MasterId.toString(),
          MasterName: obj.MasterName.toString(),
          
        });
      //  this.data = [selectedManagerdrp];
        //   this.departmentForm.controls.ManagerID.setValue(obj.ManagerId.toString());
        this._shareds.clearmastertableData();
        // Trigger change detection
        this.cdr.detectChanges();
      }, 100);
    });
  }
  
  onSubmit1() {
    this.isSubmitted = true;  // Mark the form as submitted

    if (this.mastertableForm.invalid) {
      return;  // Don't submit if the form is invalid
    }

    this.isLoading$.next(true);

    // Call the service method and subscribe to the response
    this._service.masterTableAdd(this.mastertableForm.value).subscribe(
      (res: any) => {
        this.isLoading$.next(false);
        this.cdr.detectChanges();
        Swal.fire('Master Name Added successfully!', 'Master Name Added successfully!', 'success');
        this.router.navigate(['/settings/mastertable-data']);
      },
      (error: any) => {
        this.isLoading$.next(false);
        this.cdr.detectChanges();
        Swal.fire('Error', error.error.message, 'error');
      }
    );
  }
}
