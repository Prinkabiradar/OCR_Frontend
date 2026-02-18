import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ServiceService } from '../../settings.service';
import { BehaviorSubject, debounceTime, distinctUntilChanged, Observable, startWith, Subscription, switchMap } from 'rxjs';
import Swal from 'sweetalert2';
import { Options } from 'select2';
import { Router } from '@angular/router';
import { SharedDataService } from '../../shared-data.service';
import { Select2OptionData } from 'ng-select2';
import { environment } from 'src/environments/environment';
import { noSpecialCharsValidator } from '../../validators';


@Component({
  selector: 'app-submastertable-add',
  templateUrl: './submastertable-add.component.html',
  styleUrl: './submastertable-add.component.scss'
})
export class SubmastertableAddComponent implements OnInit {
  submastertableForm: FormGroup;
  isLoading$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isLoading: boolean;
  isSubmitted: boolean = false;  // Flag to track if the form was submitted
  private unsubscribe: Subscription[] = [];
  private subscription: Subscription;
  private authLocalStorageToken = `${environment.appVersion}-${environment.USERDATA_KEY}`;

    //SELECT2 Master

    public optionsMaster: Options;
    public dataMaster: Array<{ id: string; text: string }> = [];
    searchTermMaster: string = '0';
    
    selectedMastertabledrp: any;
    searchMastertable: string;
    Mastertabledata$: Observable<Select2OptionData[]>;
    
  constructor(
    private _service: ServiceService,
    private fb: FormBuilder,   
    private cdr: ChangeDetectorRef,
    private router: Router,
    private _shareds: SharedDataService,
  ) {
    this.submastertableForm = this.fb.group({
      SubMasterId: [0, Validators.required],
      MasterId: ['', Validators.required],
      SubMasterName: ['', [Validators.required, noSpecialCharsValidator(100)]],
           IsActive: [true, Validators.required]
    });

    const loadingSubscr = this.isLoading$.asObservable().subscribe((res) => (this.isLoading = res));
    this.unsubscribe.push(loadingSubscr);
  }

  ngOnInit(): void {
    // this.dropdownMaster();
    this.Edit();

    this.search();
  }

  dropdownMaster() {
    this._service.dropdownAll(this.searchTermMaster, '1', '15', '0').subscribe(
      (response) => {
 
        this.dataMaster = response.map((item: any) => ({
          id: item.id.toString(),        
          text: item.text   
        }));

 
        this.optionsMaster = {
          data: this.dataMaster,
          width: '100%',
          placeholder: 'Select Master Name',
          allowClear: true
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
    this.isSubmitted = true;  // Mark the form as submitted

    if (this.submastertableForm.invalid) {
      return;  // Don't submit if the form is invalid
    }

    this.isLoading$.next(true);

  // Simulate an async service call with a delay
this._service.submasterTableAdd(this.submastertableForm.value).subscribe({
  next: (res: any) => {
    this.isLoading$.next(false);
    this.cdr.detectChanges();
    Swal.fire('SubMaster Name Added successfully!', 'SubMaster Name Added successfully!', 'success');
    this.router.navigate(['/settings/submastertable-data']);
  }, 
  error: (error: any) => {
    this.isLoading$.next(false);
    this.cdr.detectChanges();
    Swal.fire('Error', error.error.message, 'error');
    }
  });
  }

 search() {
    this.Mastertabledata$ = new Observable<string>((observer) => {
      observer.next(this.searchMastertable);
    }).pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((query: string) => {
        console.log('Search Query:', query);
        query = query || '';

        return this._service.dropdownAll(query, '1', '15', '0');
      })
    );
  }

    getManagersConfig(): any {
      const lsValue = localStorage.getItem(this.authLocalStorageToken);
  
      if (!lsValue) {
        new Observable<any[]>((observer) => {
          observer.next([]);
          observer.complete();
        });
  
        return {
          ajax: {
            url: environment.BaseUrl + 'api/Utility/allDropdown',
            dataType: 'json',
            delay: 250,
            headers: {
              Authorization: 'Bearer ' + JSON.parse(lsValue || '{}').authToken,
            },
            data: (params: any) => {
              return {
                searchTerm: params.term,
                page: params.page,
                type: 15,
                parentId: '0',
              };
            },
            processResults: (data: any) => {
              const results = data.map((item: any) => {
                return {
                  id: item.id,
                  text: item.text,
                };
              });
  
              return {
                results: results,
              };
            },
            cache: true,
          },
          placeholder: 'Select Master Name',
          minimumInputLength: 0,
          
          initSelection: (element: any, callback: (data: any) => void) => {
            if (this.selectedMastertabledrp) {
              callback(this.selectedMastertabledrp);
            }
          }
        };
      }
    }
  
  Edit() {
    this.subscription = this._shareds.submastertable$.subscribe(async (data) => {
      var obj = JSON.parse(data);
console.log('Obj',obj);
      this.submastertableForm.controls.MasterId.setValue(obj.MasterId.toString());
       // Create the selection object in the format ng-select2 expects
        const selectedMastertabledrp = {
          id: obj.MasterId.toString(),
          text:  obj.MasterName .toString(),
        };

      // Update form after a short delay to ensure Select2 is initialized
      setTimeout(() => {
        this.submastertableForm.patchValue({
          SubMasterId: obj.SubMasterId.toString(),
          MasterId: obj.MasterId,
          SubMasterName: obj.SubMasterName.toString(),
          
         
        });
       this.dataMaster = [selectedMastertabledrp];
          //this.submastertableForm.controls.MasterId.setValue(obj.MasterId.toString());
        // Trigger change detection
        this._shareds.clearsubmastertableData();
        this.cdr.detectChanges();
      }, 100);
    });
  }
}



