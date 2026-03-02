import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Options } from 'select2';
import { ServiceService } from '../../settings.service'; // ✅ adjust path

@Component({
  selector: 'app-add-document',
  templateUrl: './add-document.component.html',
  styleUrls: ['./add-document.component.scss']
})
export class AddDocumentComponent implements OnInit {

  documentForm!: FormGroup;
  saving = false;

  // ✅ SELECT2
  public documentTypeoptions: Options = {};
  public documentTypedata: Array<{ id: string; text: string }> = [];
  documentTypesearchTerm: string = '';

  constructor(
    private fb: FormBuilder,
    private service: ServiceService,        // ✅ FIXED
    private cd: ChangeDetectorRef           // ✅ FIXED
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.documentTypeDropdown();
  }

  // ✅ form init separated (clean code)
  initForm() {
    this.documentForm = this.fb.group({
      documentId: [0],
      documentTypeId: [null, Validators.required],
      documentName: ['', Validators.required],
      totalPages: [0],
      createdBy: [0]
    });
  }

  get f() {
    return this.documentForm.controls;
  }

  // ✅ FIXED spelling + safe handling
  documentTypeDropdown() {
    this.service.dropdownAll(this.documentTypesearchTerm, '1', '3', '0')
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

          this.cd.detectChanges();
        },
        error: (error) => console.error('Error fetching data', error)
      });
  }

  // ✅ PRODUCTION SAVE
  saveDocument() {
    if (this.documentForm.invalid) {
      this.documentForm.markAllAsTouched();
      return;
    }

    this.saving = true;

    const payload = this.documentForm.value;

    this.service.saveDocument(payload).subscribe({
      next: (res) => {
        console.log('Saved successfully', res);
        this.saving = false;
        this.resetForm();
      },
      error: (err) => {
        console.error('Save failed', err);
        this.saving = false;
      }
    });
  }

  // ✅ proper reset
  resetForm() {
    this.documentForm.reset({
      documentId: 0,
      documentTypeId: null,
      documentName: '',
      totalPages: 0,
      createdBy: 0
    });
  }
}