import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ServiceService } from '../../settings.service';

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
    private service: ServiceService
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

    if (this.documentTypeForm.invalid || this.saving) return;

    this.saving = true;

    const payload = this.documentTypeForm.value;

    this.service.saveDocumentType(payload).subscribe({
      next: (res: any) => {
        console.log('Saved successfully', res);
        this.saving = false;
        this.resetForm();
      },
      error: (err: any) => {
        console.error(err);
        this.saving = false;
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