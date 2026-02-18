import { Component } from '@angular/core';
import { ChangeDetectorRef, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ServiceService } from '../../settings.service';
import { BehaviorSubject, Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { SharedDataService } from '../../shared-data.service';
import { Router } from '@angular/router';
import { AbstractControl, ValidatorFn } from '@angular/forms';
import {
  customEmailValidator,
  customPanValidator,
  noSpecialCharsValidator,
  passportValidator,
  capitalLetterValidator,
} from 'src/app/settings/validators';
import { ValidationError } from 'webpack';
import { Options } from 'select2';

@Component({
  selector: 'app-work-location-add',
  templateUrl: './work-location-add.component.html',
  styleUrl: './work-location-add.component.scss',
})
export class WorkLocationAddComponent {
  workLocationForm: FormGroup;
  isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isLoading: boolean;
  isSubmitted: boolean = false; // Flag to track if the form was submitted
  private unsubscribe: Subscription[] = [];
  private subscription: Subscription;

  isEditMode: boolean = false;

  // Define properties for city and state separately
  public cityOptions: Options;
  public stateOptions: Options;
  public cityData: Array<{ id: string; text: string }> = [];
  public stateData: Array<{ id: string; text: string }> = [];
  searchTerm: string = '0';

  dataForCity: { id: any; text: any }[];
  dataForState: { id: any; text: any }[];

  constructor(
    private _service: ServiceService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private _shareds: SharedDataService,
    private router: Router
  ) {
    const loadingSubscr = this.isLoading$
      .asObservable()
      .subscribe((res) => (this.isLoading = res));
    this.unsubscribe.push(loadingSubscr);
  }

  ngOnInit(): void {
    this.workLocationForm = this.fb.group({
      LocationId: [0, Validators.required],
      // Change this line - validators should be in an array
      LocationName: [
        '',
        [
          Validators.required,
          Validators.maxLength(50),
          noSpecialCharsValidator(50),
        ],
      ],
      CompanyId: [1, Validators.required],
      // Fix this line too
      LocationAddress: ['', [Validators.required, Validators.maxLength(255)]],
      CityId: ['', Validators.required],
      StateId: ['', Validators.required],
      PostalCode: [
        '',
        [
          Validators.required,
          Validators.pattern('^[0-9]*$'), // Only allow numbers
        ],
      ],
      PhoneNumber: [
        '',
        [
          Validators.required,
          Validators.pattern('^[0-9]*$'), // Only allow numbers
        ],
      ],
      EmailId: [
        '',
        [Validators.required, Validators.email, customEmailValidator()],
      ],
      UserId: [1, Validators.required],
      PrefixCode: ['', [Validators.required, capitalLetterValidator()]],
      IsActive: [true, Validators.required],
    });

    this.workLocationForm.get('StateId')?.valueChanges.subscribe((value) => {
      if (value) {
        this.dropdownForCity(value);
      }
    });
    this.dropdownForState();
    this.Edit();
  }

  onSubmit() {
    this.isSubmitted = true;

    if (this.workLocationForm.invalid) {
      // Highlight all invalid fields
      Object.keys(this.workLocationForm.controls).forEach((key) => {
        const control = this.workLocationForm.get(key);
        if (control) {
          control.markAsTouched();
        }
      });
      return;
    }

    this.isLoading$.next(true);

    // Prepare the form data - enable disabled controls temporarily for submission
    if (this.isEditMode) {
      this.workLocationForm.get('PrefixCode')?.enable();
      this.workLocationForm.get('StateId')?.enable();
      this.workLocationForm.get('CityId')?.enable();
      this.workLocationForm.get('PostalCode')?.enable();
    }

    const formData = {
      ...this.workLocationForm.value,
    };

    // Disable controls again if in edit mode
    if (this.isEditMode) {
      this.workLocationForm.get('PrefixCode')?.disable();
      this.workLocationForm.get('StateId')?.disable();
      this.workLocationForm.get('CityId')?.disable();
      this.workLocationForm.get('PostalCode')?.disable();
    }

    // Submit the form
    this._service.workLocationAdd(formData).subscribe(
      (res: any) => {
        this.isLoading$.next(false);
        this.cdr.detectChanges();
        Swal.fire(
          'Work location Added successfully!',
          'Work Location Added successfully!',
          'success'
        );
        this.router.navigate(['/settings/worklocation-data']);
      },
      (error: any) => {
        this.isLoading$.next(false);
        this.cdr.detectChanges();
        Swal.fire(
          'Error',
          error.error?.message || 'Something went wrong',
          'error'
        );
      }
    );
  }

  dropdownForState() {
    this._service.dropdownAll(this.searchTerm, '1', '2', '0').subscribe(
      (response) => {
        // Map the response to stateData
        this.stateData = response.map((item: any) => ({
          id: item.id.toString(),
          text: item.text,
        }));

        // Set options for State dropdown
        this.stateOptions = {
          data: this.stateData,
          width: '100%',
          placeholder: 'Select a State',
          allowClear: true,
        };

        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error fetching state data', error);
      }
    );
  }

  dropdownForCity(stateId: string) {
    this._service.dropdownAll(this.searchTerm, '1', '5', stateId).subscribe(
      (response) => {
        // Debugging: Log response to ensure it's fetching data
        console.log('City Response:', response);

        this.cityData = response.map((item: any) => ({
          id: item.id.toString(),
          text: item.text,
        }));

        this.cityOptions = {
          data: this.cityData,
          width: '100%',
          placeholder: 'Select a City',
          allowClear: true,
        };

        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error fetching city data', error);
      }
    );
  }

  Edit() {
    this.subscription = this._shareds.workLocation$.subscribe(async (data) => {
      try {
        // Check if data is valid JSON and not empty
        if (data && data !== '{}') {
          var obj = JSON.parse(data);

          // Check if obj has the required properties
          if (obj) {
            // Set edit mode to true
            this.isEditMode = true;

            // Ensure correct ID values for dropdowns
            const selectedStateDrp = {
              id: obj.StateId?.toString() || '',
              text: obj.StateName?.toString() || '',
            };

            const selectedCityDrp = {
              id: obj.CityId?.toString() || '',
              text: obj.CityName?.toString() || '',
            };

            // Update form after a short delay to ensure Select2 is initialized
            setTimeout(() => {
              this.workLocationForm.patchValue({
                LocationId: obj.LocationId.toString(),
                LocationName: obj.LocationName.toString(),
                LocationAddress: obj.LocationAddress,
                PostalCode: obj.PostalCode,
                PhoneNumber: obj.PhoneNumber,
                EmailId: obj.EmailId,
                PrefixCode: obj.Prefix,
              });

              // Disable fields not in the UPDATE query
              if (this.isEditMode) {
                this.workLocationForm.get('PrefixCode')?.disable();
                this.workLocationForm.get('StateId')?.disable();
                this.workLocationForm.get('CityId')?.disable();
                this.workLocationForm.get('PostalCode')?.disable();
              }

              // Bind dropdown selected values
              this.dataForState = [selectedStateDrp];
              this.dataForCity = [selectedCityDrp];

              // Set values for StateId and CityId
              this.workLocationForm.controls.StateId.setValue(
                obj.StateId?.toString() || ''
              );
              this.workLocationForm.controls.CityId.setValue(
                obj.CityId?.toString() || ''
              );

              // Trigger change detection
              this._shareds.clearworkLocationData();
              this.cdr.detectChanges();
            }, 100);
          }
        }
      } catch (error) {
        console.error('Error parsing department data:', error);
        // Handle the error gracefully, perhaps by initializing with default values
        this.workLocationForm.patchValue({
          DepartmentID: '0',
          DepartmentName: '',
          DepartmentCode: '',
          DepartmentDescription: '',
          ManagerID: '',
        });
        // Ensure we're not in edit mode
        this.isEditMode = false;
      }
    });
  }

  enforceMaxLength(event: Event) {
    const input = event.target as HTMLInputElement;
    // Allow only numbers
    input.value = input.value.replace(/[^0-9]/g, '');
    if (input.value.length > 13) {
      input.value = input.value.slice(0, 13);
    }
  }

  pinCodeMaxLength(event: Event) {
    const input = event.target as HTMLInputElement;
    // Allow only numbers
    input.value = input.value.replace(/[^0-9]/g, '');
    if (input.value.length > 6) {
      input.value = input.value.slice(0, 6); // Trim input to max 6 digits
    }
  }

  // Helper method to check if we're in edit mode for template
  isFieldDisabled(fieldName: string): boolean {
    return (
      this.isEditMode &&
      (fieldName === 'PrefixCode' ||
        fieldName === 'StateId' ||
        fieldName === 'CityId' ||
        fieldName === 'PostalCode')
    );
  }

  // Handle key press for PostalCode to allow only numbers
  // but still permit navigation keys like backspace, delete, arrows
  handlePostalCodeKeypress(event: KeyboardEvent): boolean {
    // Allow navigation keys, backspace, delete, tab, etc.
    if (
      event.key === 'Backspace' ||
      event.key === 'Delete' ||
      event.key === 'Tab' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === 'Home' ||
      event.key === 'End'
    ) {
      return true;
    }

    // Allow only numbers
    return /^[0-9]$/.test(event.key);
  }

  handlePhoneNumberKeypress(event: KeyboardEvent): boolean {
    // Allow navigation keys, backspace, delete, tab, etc.
    if (
      event.key === 'Backspace' ||
      event.key === 'Delete' ||
      event.key === 'Tab' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === 'Home' ||
      event.key === 'End'
    ) {
      return true;
    }

    // Allow only numbers
    return /^[0-9]$/.test(event.key);
  }
}
