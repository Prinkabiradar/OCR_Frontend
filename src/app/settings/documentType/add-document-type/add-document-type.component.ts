import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ServiceService } from '../../settings.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-document-type',
  templateUrl: './add-document-type.component.html',
  styleUrls: ['./add-document-type.component.scss']
})
export class AddDocumentTypeComponent {

  documentTypeForm!: FormGroup;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private service: ServiceService,
    private router: Router
  ) {
    this.buildForm();
  }

  // ✅ build form
  buildForm() {
    this.documentTypeForm = this.fb.group({
      documentTypeId: [0],
      documentTypeName: ['', Validators.required],
      isActive: [true],
      createdBy: [0]
    });
  }

  // ✅ save document type
  saveDocumentType() {

  if (this.documentTypeForm.invalid) {
    this.documentTypeForm.markAllAsTouched();

    // ⚠️ Validation Swal
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

  this.service.saveDocumentType(payload).subscribe({
    next: (res: any) => {
      this.saving = false;

      // ✅ Success Swal
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Document Type saved successfully!',
        confirmButtonText: 'OK'
      }).then(() => {
        this.resetForm();

        // ✅ Redirect
        this.router.navigate(['/settings/data-documentType']);
      });
    },

    error: (err: any) => {
      this.saving = false;

      // ❌ Error Swal
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to save Document Type'
      });

      console.error(err);
    }
  });
}

  // ✅ reset form
  resetForm() {
    this.documentTypeForm.reset({
      documentTypeId: 0,
      documentTypeName: '',
      isActive: true,
      createdBy: 0
    });
  }

  // ✅ getter
  get f() {
    return this.documentTypeForm.controls;
  }
}