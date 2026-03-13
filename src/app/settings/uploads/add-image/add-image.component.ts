import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl } from '@angular/forms';
import { ServiceService } from '../../settings.service';
import { Options } from 'select2';

@Component({
  selector: 'app-add-image',
  templateUrl: './add-image.component.html',
  styleUrls: ['./add-image.component.scss']
})
export class AddImageComponent {

  selectedFiles: File[] = [];
  uploading = false;

  ocrResults: any[] = [];
  editForm!: FormGroup;
  showEditForm = false;

  documentId: number = 0;
  documentTypeId: number ;

  // ✅ Track which save buttons should be disabled
  isDocumentTypeSaved = false;
  isDocumentSaved = false;
  savedPages: Set<number> = new Set();

  //SELECT2 document
  public documentoptions: Options;
  public documentdata: Array<{ id: string; text: string }> = [];
  documentsearchTerm: string = '';

  //SELECT2 documentType
  public documentTypeoptions: Options;
  public documentTypedata: Array<{ id: string; text: string }> = [];
  documentTypesearchTerm: string = '';

  constructor(
    private fb: FormBuilder,
    private service: ServiceService,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.documentropdown();
    this.documentTyperopdown();
  }

  onFileSelect(event: any) {
    const files: FileList = event.target.files;
    for (let i = 0; i < files.length; i++) {
      this.selectedFiles.push(files[i]);
    }
    event.target.value = null;
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
  }

  documentTyperopdown() {
      this.service.dropdownAll(this.documentTypesearchTerm, '1', '3', '0').subscribe(
        (response) => {
          this.documentTypedata = [
            { id: '', text: '' },  // ✅ Blank option forces placeholder
            ...response.map((item: any) => ({
              id: item.id.toString(),
              text: item.text,
            }))
          ];
          this.documentTypeoptions = {
            data: this.documentTypedata,
            width: '100%',
            placeholder: 'Select Document Type',
            allowClear: true,
          };
          this.cd.markForCheck();
          this.cd.detectChanges();
        },
        (error) => console.error('Error fetching data', error)
      );
  }
    
  documentropdown() {
      this.service.dropdownAll(this.documentsearchTerm, '1', '1', '0').subscribe(
        (response) => {
          this.documentdata = [
            { id: '', text: '' },  // ✅ Blank option forces placeholder
            ...response.map((item: any) => ({
              id: item.id.toString(),
              text: item.text,
            }))
          ];
          this.documentoptions = {
            data: this.documentdata,
            width: '100%',
            placeholder: 'Select Document Name',
            allowClear: true,
          };
          this.cd.markForCheck();
          this.cd.detectChanges();
        },
        (error) => console.error('Error fetching data', error)
      );
  }

  uploadFiles() {
    if (this.selectedFiles.length === 0 || this.uploading) return;

    const formData = new FormData();
    this.selectedFiles.forEach(file => formData.append('files', file));
    this.uploading = true;

    this.service.uploadOcrFiles(formData).subscribe({
      next: (res: any[]) => {
        const parsed: any[] = [];
        res.forEach((fileResult, index) => {
          try {
            const geminiObj = JSON.parse(fileResult.ocrResult);
            const extractedText = geminiObj?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            parsed.push({ fileName: fileResult.fileName, extractedText, pageNumber: index + 1 });
          } catch (error) {
            parsed.push({ fileName: fileResult.fileName, extractedText: 'Parse error', pageNumber: index + 1 });
          }
        });

        this.ocrResults = parsed;
        this.buildEditableForm(parsed);
        this.uploading = false;
        this.cd.detectChanges();
      },
      error: err => {
        console.error(err);
        this.uploading = false;
      }
    });
  }

  buildEditableForm(results: any[]) {
    const pagesArray = this.fb.array<FormGroup>([]);
    results.forEach((r, i) => {
      const group = this.fb.group({
        fileName: new FormControl(r.fileName),
        pageNumber: new FormControl(i + 1),
        extractedText: new FormControl(r.extractedText)
      });
      pagesArray.push(group);
    });

    this.editForm = this.fb.group({
      documentTypeId: new FormControl(null),
      documentId: new FormControl(null),
      documentType: new FormControl(''),
      documentName: new FormControl(''),
      pages: pagesArray
    });

    // ✅ Document Type — radio toggle
    this.editForm.get('documentTypeId')?.valueChanges.subscribe(value => {
      if (value) {
        this.editForm.get('documentType')?.setValue('', { emitEvent: false }); // ✅ Clear textbox
        this.isDocumentTypeSaved = true;
        this.documentTypeId = +value;
      } else {
        this.isDocumentTypeSaved = false;
        this.documentTypeId = 0;
      }
      this.cd.detectChanges();
    });

    this.editForm.get('documentType')?.valueChanges.subscribe(value => {
      if (value && value.trim() !== '') {
        this.editForm.get('documentTypeId')?.setValue(null, { emitEvent: false }); // ✅ Clear dropdown
        this.isDocumentTypeSaved = false;
        this.documentTypeId = 0;
      }
      this.cd.detectChanges();
    });

    // ✅ Document Name — radio toggle
    this.editForm.get('documentId')?.valueChanges.subscribe(value => {
      if (value) {
        this.editForm.get('documentName')?.setValue('', { emitEvent: false }); // ✅ Clear textbox
        this.isDocumentSaved = true;
        this.documentId = +value;
      } else {
        this.isDocumentSaved = false;
        this.documentId = 0;
      }
      this.cd.detectChanges();
    });

    this.editForm.get('documentName')?.valueChanges.subscribe(value => {
      if (value && value.trim() !== '') {
        this.editForm.get('documentId')?.setValue(null, { emitEvent: false }); // ✅ Clear dropdown
        this.isDocumentSaved = false;
        this.documentId = 0;
      }
      this.cd.detectChanges();
    });

    this.showEditForm = true;
  }

  get pages(): FormArray<FormGroup> {
    return this.editForm.get('pages') as FormArray<FormGroup>;
  }

  // ✅ SEPARATE: Save Document Type only
  saveDocumentType() {
    const formValue = this.editForm.getRawValue(); // getRawValue includes disabled controls

    if (!formValue.documentType || formValue.documentType.trim() === '') {
      alert('Please enter a new Document Type name.');
      return;
    }

    const typeModel = {
      documentTypeId: 0,
      documentTypeName: formValue.documentType.trim(),
      isActive: true,
      createdBy: 1
    };

    this.service.saveDocumentTypeJson(typeModel).subscribe({
      next: (res: any) => {
        const newTypeId = res.documentTypeId || res.DocumentTypeId;
        if (!newTypeId) {
          alert('Document Type save failed.');
          return;
        }
        this.documentTypeId = newTypeId;
        this.isDocumentTypeSaved = true;  
        alert('Document Type saved successfully. ID = ' + newTypeId);
        this.cd.detectChanges();
      },
      error: err => console.error(err)
    });
  }

  // ✅ SEPARATE: Save Document only (requires documentTypeId to be set)
  saveDocument() {
    if (!this.documentTypeId || this.documentTypeId === 0) {
      alert('Please save or select a Document Type first.');
      return;
    }

    const formValue = this.editForm.getRawValue(); // getRawValue includes disabled controls

    if (!formValue.documentName || formValue.documentName.trim() === '') {
      alert('Please enter a Document Name.');
      return;
    }

    const model = {
      DocumentId: 0,
      DocumentTypeId: this.documentTypeId,
      DocumentName: formValue.documentName.trim(),
      TotalPages: this.pages.length,
      CreatedBy: 1
    };

    this.service.saveDocument(model).subscribe({
      next: (res: any) => {
        this.documentId = res.documentId || res.DocumentId;
        this.isDocumentSaved = true; // ✅ Disable save button after success
        alert('Document saved successfully. ID = ' + this.documentId);
        this.cd.detectChanges();
      },
      error: err => console.error(err)
    });
  }

  // ✅ Save Single Page
  savePage(index: number) {
    if (!this.documentId || this.documentId === 0) {
      alert('⚠️ Please save the Document first before saving pages.');
      return;
    }

    const page = this.pages.at(index).value;
    const model = {
      DocumentPageId: 0,
      DocumentId: this.documentId,
      PageNumber: page.pageNumber,
      ExtractedText: page.extractedText,
      StatusId: 2,
      CreatedBy: 1
    };

    this.service.saveDocumentPage(model).subscribe({
      next: () => {
        this.savedPages.add(index); // ✅ Mark this page as saved
        this.cd.detectChanges();
        alert('✅ Page ' + page.pageNumber + ' saved successfully');
      },
      error: err => console.error(err)
    });
  }
  // saveAllRemainingPages() {
  //   const unsavedIndexes = this.pages.controls
  //     .map((_, i) => i)
  //     .filter(i => !this.savedPages.has(i));
  
  //   if (unsavedIndexes.length === 0) {
  //     alert('✅ All pages are already saved!');
  //     return;
  //   }
  
  //   if (!this.documentId || this.documentId === 0) {
  //     alert('⚠️ Please save the Document first before saving pages.');
  //     return;
  //   }
  
  //   unsavedIndexes.forEach(i => this.savePage(i));
  // }
  async saveAllRemainingPages() {
    if (!this.documentId || this.documentId === 0) {
      alert('⚠️ Please save the Document first before saving pages.');
      return;
    }
  
    const unsavedIndexes = this.pages.controls
      .map((_, i) => i)
      .filter(i => !this.savedPages.has(i))
      .sort((a, b) => a - b); // ✅ Ensure page order
  
    if (unsavedIndexes.length === 0) {
      alert('✅ All pages are already saved!');
      return;
    }
  
    for (const i of unsavedIndexes) {  // ✅ Sequential, not parallel
      await this.savePageAsync(i);
    }
  
    alert('✅ All remaining pages saved successfully!');
    this.cd.detectChanges();
  }
  
  // ✅ Add this helper method — wraps savePage as a Promise
  private savePageAsync(index: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const page = this.pages.at(index).value;
      const model = {
        DocumentPageId: 0,
        DocumentId: this.documentId,
        PageNumber: page.pageNumber,
        ExtractedText: page.extractedText,
        StatusId: 2,
        CreatedBy: 1
      };
  
      this.service.saveDocumentPage(model).subscribe({
        next: () => {
          this.savedPages.add(index); // ✅ Mark saved
          this.cd.detectChanges();
          resolve();
        },
        error: (err) => {
          console.error(`Page ${page.pageNumber} failed`, err);
          reject(err);
        }
      });
    });
  }
}