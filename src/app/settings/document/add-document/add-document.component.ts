import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Options } from 'select2';
import { ServiceService } from '../../settings.service';
import { SharedDataService } from '../../shared-data.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-document',
  templateUrl: './add-document.component.html',
  styleUrls: ['./add-document.component.scss'],
})
export class AddDocumentComponent implements OnInit {
  documentForm!: FormGroup;
  saving = false;
  isEditMode = false;

  // SELECT2
  public documentTypeoptions: Options = {};
  public documentTypedata: Array<{ id: string; text: string }> = [];
  documentTypesearchTerm: string = '';

  constructor(
    private fb: FormBuilder,
    private service: ServiceService,
    private cd: ChangeDetectorRef,
    private router: Router,
    private _shareds: SharedDataService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.documentTypeDropdown();
  }

  initForm() {
    this.documentForm = this.fb.group({
      documentId: [0],
      documentTypeId: [null, Validators.required],
      documentName: ['', Validators.required],
      totalPages: [0],
      createdBy: [0],
    });
  }

  get f() {
    return this.documentForm.controls;
  }

  // ── Dropdown + patch after ready ──────────────────────────
  documentTypeDropdown() {
    this.service
      .dropdownAll(this.documentTypesearchTerm, '1', '3', '0')
      .subscribe({
        next: (response) => {
          this.documentTypedata = response.map((item: any) => ({
            id: item.id.toString(),
            text: item.text,
          }));

          this.documentTypeoptions = {
            data: this.documentTypedata,
            width: '100%',
            placeholder: 'Select Document Type',
            allowClear: true,
          };

          // ── patch AFTER dropdown is ready ─────────────────
          this._shareds.document$.subscribe((data) => {
            if (data) {
              this.isEditMode = true;
              this.documentForm.patchValue({
                documentId: data.documentId ?? data.DocumentId ?? 0,
                documentTypeId: (
                  data.documentTypeId ??
                  data.DocumentTypeId ??
                  ''
                ).toString(), // ✅ string
                documentName: data.documentName ?? data.DocumentName ?? '',
                totalPages: data.totalPages ?? data.TotalPages ?? 0,
                createdBy: data.createdBy ?? data.CreatedBy ?? 0,
              });
              this.cd.detectChanges();
            }
          });

          this.cd.detectChanges();
        },
        error: (error) => console.error('Error fetching data', error),
      });
  }

  // ── Save ───────────────────────────────────────────────────
  saveDocument() {
    if (this.documentForm.invalid) {
      this.documentForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    const payload = this.documentForm.value;

    this.service.saveDocument(payload).subscribe({
      next: () => {
        this.saving = false;
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: `Document ${this.isEditMode ? 'updated' : 'saved'} successfully!`,
          confirmButtonText: 'OK',
        }).then(() => {
          this._shareds.clearDocumentData();
          this.router.navigate(['/settings/data-document']);
        });
      },
      error: (err: any) => {
        this.saving = false;

        const errorMessage = err?.error?.message || 'Failed to save Document';

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMessage,
        });
      },
    });
  }

  // ── Reset ──────────────────────────────────────────────────
  resetForm() {
    this.documentForm.reset({
      documentId: 0,
      documentTypeId: null,
      documentName: '',
      totalPages: 0,
      createdBy: 0,
    });
    this.isEditMode = false;
    this._shareds.clearDocumentData();
  }
}
