import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ServiceService } from '../../settings.service';
import { SharedDataService } from '../../shared-data.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-document-type',
  templateUrl: './add-document-type.component.html',
  styleUrls: ['./add-document-type.component.scss']
})
export class AddDocumentTypeComponent implements OnInit {

  documentTypeForm!: FormGroup;
  saving = false;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private service: ServiceService,
    private router: Router,
    private _shareds: SharedDataService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.checkEditMode();
  }

  buildForm() {
    this.documentTypeForm = this.fb.group({
      documentTypeId:   [0],
      documentTypeName: ['', Validators.required],
      isActive:         [true],
      createdBy:        [0]
    });
  }

  // ── Check Edit Mode ────────────────────────────────────────
  checkEditMode(): void {
  this._shareds.documentType$.subscribe(data => {
    console.log('SharedData:', data);
    if (data) {
      this.isEditMode = true;
      this.documentTypeForm.patchValue({
        documentTypeId:   data.documentTypeId   ?? data.DocumentTypeId   ?? 0,
        documentTypeName: data.documentTypeName ?? data.DocumentTypeName ?? '',
        isActive:         data.isActive         ?? data.IsActive         ?? true,
        createdBy:        data.createdBy        ?? data.CreatedBy        ?? 0,
      });
      console.log('Form after patch:', this.documentTypeForm.value); // ← and this
      this.cd.detectChanges();
    }
  });
}

  get f() {
    return this.documentTypeForm.controls;
  }

  saveDocumentType() {
  if (this.documentTypeForm.invalid) {
    this.documentTypeForm.markAllAsTouched();
    Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Please enter Document Type Name'
    });
    return;
  }

  if (this.saving) return;
  this.saving = true;

  const payload = this.documentTypeForm.value;
  console.log('Payload:', payload); // ← verify documentTypeId here

  this.service.saveDocumentTypeJson(payload).subscribe({  // ✅ changed from saveDocumentType to saveDocumentTypeJson
    next: () => {
      this.saving = false;
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: `Document Type ${this.isEditMode ? 'updated' : 'saved'} successfully!`,
        confirmButtonText: 'OK'
      }).then(() => {
        this._shareds.clearDocumentTypeData();
        this.router.navigate(['/settings/data-documentType']);
      });
    },
    error: (err: any) => {
      this.saving = false;
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to save Document Type'
      });
      console.error(err);
    }
  });
}

  resetForm() {
    this.documentTypeForm.reset({
      documentTypeId:   0,
      documentTypeName: '',
      isActive:         true,
      createdBy:        0
    });
    this.isEditMode = false;
    this._shareds.clearDocumentTypeData();
  }
}