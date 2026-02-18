import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { MatDateFormats, MAT_DATE_FORMATS } from '@angular/material/core';
import { Router } from '@angular/router';
import { SharedDataService } from 'src/app/settings/shared-data.service';
import { TransactionsService } from '../../transactions.service';
import { Options } from 'select2';

@Component({
  selector: 'app-linksetting-add',
  templateUrl: './linksetting-add.component.html',
  styleUrl: './linksetting-add.component.scss'
})
export class LinksettingAddComponent implements OnInit {
  linkSettingForm: FormGroup;
  isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isLoading: boolean;
  isSubmitted: boolean = false;  // Flag to track if the form was submitted
  private unsubscribe: Subscription[] = [];
  dateInput: any;
  picker5: any;
  private subscription: Subscription;
    //Pagination
    totalPages: number = 50;
    currentPage: number = 1;
    totalRecords: number = 0;
    itemsPerPage = 10;
    totalItems = 0;
    searchQuery: string;   
    minDate: Date;
    maxDate: Date;

  //SELECT2 linkType
  public linkTypeoptions: Options;
  public linkTypedata: Array<{ id: string; text: string }> = [];
  linkTypesearchTerm: string = '0';

  constructor(
    private _service: TransactionsService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private _shareds: SharedDataService
  ) {
    // ✅ Using only your original FormGroup structure
    this.linkSettingForm = this.fb.group({
      linkId: [0 ],
      financialYearId: [0 ],
      MenuId: [0 ],
      LinkType: [''  ],
      LinkTypeId: [0, Validators.required],
      OpenLinkDate: ['', Validators.required],
      CloseLinkDate: ['', Validators.required],
      IsActive: [true]
    });

    const loadingSubscr = this.isLoading$
      .asObservable()
      .subscribe((res) => (this.isLoading = res));
    this.unsubscribe.push(loadingSubscr);
  }

  ngOnInit(): void {
    this.Edit();
    this.linkTypedropdown();
    this.FinancialYearDate();
  }
  onLinkTypeChange(event: any) {
    const selectedId = event.value;
    const selectedItem = this.linkTypedata.find(item => item.id === selectedId);
    
    if (selectedItem) {
      this.linkSettingForm.patchValue({
        LinkTypeId: parseInt(selectedId, 10),
        LinkType: selectedItem.text
      });
    }
  }
  
  FinancialYearDate() {
    const startIndex = this.currentPage;
    const pageSize = this.itemsPerPage;
    const searchBy = this.searchQuery ? '1' : '0';
    const searchCriteria = this.searchQuery;

    this._service
      .GetFinancialYearDate(
        startIndex,
        pageSize,
        searchBy,
        searchCriteria
      )
      .subscribe((response: any[]) => {
        if (response && response.length > 0) {
          // Assuming the first item in response contains the date range
          const financialYear = {
            FromDate: new Date(response[0].FromDate), 
            EndDate: new Date(response[0].EndDate)
          };
          // Set minDate and maxDate
          this.minDate = financialYear.FromDate;
          this.maxDate = financialYear.EndDate;

          console.log("Financial Year Dates:", financialYear,response);
          console.log("Financial Year Dates:", response);
        }       
      });
    }
  linkTypedropdown() {
      this._service.dropdownAll(this.linkTypesearchTerm, '1', '47', '0').subscribe(
        (response) => {
          this.linkTypedata = response.map((item: any) => ({
            id: item.id.toString(),
            text: item.text,
          }));
  
          this.linkTypeoptions = {
            data: this.linkTypedata,
            width: '100%',
            placeholder: 'Select Link Type',
            allowClear: true,
          };
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
        (error) => {
          console.error('Error fetching data', error);
        }
      );
    }
    onSubmit() {
      this.isSubmitted = true;
    
      if (this.linkSettingForm.invalid) {
        Swal.fire('Error', 'Please fill all the required fields.', 'error');
        return;
      }
    
      const formValue = this.linkSettingForm.value; 
    
      console.log('Submitting Data:', formValue);
    
      this.isLoading$.next(true);
      this._service.linkSettingAdd(formValue).subscribe(
        (res: any) => {
          this.isLoading$.next(false);
          this.cdr.detectChanges();
          console.log('API Response:', res);
          Swal.fire('Success', 'Link Setting added successfully!', 'success');
          this.linkSettingForm.reset();
          this.router.navigate(['/transactions/linksetting-data']);
        },
        (error: any) => {
          this.isLoading$.next(false);
          this.cdr.detectChanges();
          console.error('API Error:', error);
          console.error('Validation Errors:', error.error?.errors);
    
          // ✅ Extract validation errors
          let errorMessage = 'An error occurred while saving the data.';
          if (error.error?.errors) {
            const validationErrors = Object.keys(error.error.errors)
              .map(key => `${key}: ${error.error.errors[key].join(', ')}`)
              .join('\n');
            errorMessage = validationErrors;
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }
    
          // ✅ Show Error Message
          Swal.fire({
            icon: 'error',
            title: 'Validation Error',
            text: errorMessage,
          }).then(() => {
            // ✅ Optionally refresh the page after clicking OK
            // window.location.reload();
          });
        }
      );
    }

  Edit() {
    this.subscription = this._shareds.LinkSetting$.subscribe(async (data) => {
      if (!data) return;

      const obj = JSON.parse(data);
      console.log(obj);

      // ✅ Fixed: Improved date formatting with error handling
      const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        try {
          const [day, month, year] = dateStr.split("-");
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`; // Convert to YYYY-MM-DD
        } catch (error) {
          console.error('Date formatting error:', error);
          return '';
        }
      };

      setTimeout(() => {
        this.linkSettingForm.patchValue({
          linkId: obj.LinkId || 0,
          financialYearId: obj.FinancialYearId || 0,
          MenuId: obj.MenuId || 0,
          LinkTypeId: obj.LinkTypeId || 0,
          LinkType: obj.LinkType || '',
          OpenLinkDate: obj.OpenLinkDate ? formatDate(obj.OpenLinkDate) : '',
          CloseLinkDate: obj.CloseLinkDate ? formatDate(obj.CloseLinkDate) : '',
          IsActive: obj.IsActive !== undefined ? obj.IsActive : true
        });
        this._shareds.clearLinkSettingData();
        this.cdr.detectChanges(); // Ensure UI updates
      }, 100);
    });
  }

  // ✅ Added cleanup method
  ngOnDestroy(): void {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}