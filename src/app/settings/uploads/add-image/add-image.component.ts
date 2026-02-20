import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ServiceService } from '../../settings.service';

@Component({
  selector: 'app-add-image',
  templateUrl: './add-image.component.html',
  styleUrls: ['./add-image.component.scss']
})
export class AddImageComponent {

  selectedFiles: File[] = [];
  uploading = false;

  ocrResults: { fileName: string; extractedText: string }[] = [];
  editForm!: FormGroup;
  showEditForm = false;

  constructor(
    private fb: FormBuilder,
    private service: ServiceService,
    private cd: ChangeDetectorRef
  ) {}

  // ✅ select multiple files
  onFileSelect(event: any) {
    const files: FileList = event.target.files;

    for (let i = 0; i < files.length; i++) {
      this.selectedFiles.push(files[i]);
    }

    event.target.value = null;
  }

  // ✅ remove file
  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
  }

  // ✅ upload files
  uploadFiles() {

    if (this.selectedFiles.length === 0 || this.uploading) return;

    const formData = new FormData();

    this.selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    // reset previous results (important)
    this.ocrResults = [];
    this.showEditForm = false;

    this.uploading = true;

    this.service.uploadOcrFiles(formData).subscribe({
      next: (res: any[]) => {

        const parsed: { fileName: string; extractedText: string }[] = [];

        for (const fileResult of res) {
          try {
            const geminiObj = JSON.parse(fileResult.ocrResult);

            const text =
              geminiObj?.candidates?.[0]?.content?.parts?.[0]?.text || '';

            parsed.push({
              fileName: fileResult.fileName,
              extractedText: text
            });

          } catch (e) {
            parsed.push({
              fileName: fileResult.fileName,
              extractedText: 'Parse error'
            });
          }
        }

        // assign NEW reference → triggers Angular UI update
        this.ocrResults = [...parsed];

        this.buildEditableForm(this.ocrResults);

        this.uploading = false;

        // force UI refresh (fix delayed render issue)
        this.cd.detectChanges();
      },

      error: err => {
        console.error(err);
        this.uploading = false;
      }
    });
  }

  // ✅ build editable form
  buildEditableForm(results: { fileName: string; extractedText: string }[]) {

    const group: any = {};

    results.forEach((r, i) => {
      group['file_' + i] = [r.extractedText];
    });

    this.editForm = this.fb.group(group);
    this.showEditForm = true;
  }

  // ✅ save corrected data
  saveCorrectedData() {[]

    if (!this.editForm) return;

    const corrected = this.editForm.value;
    console.log('Corrected:', corrected);

    // optional API save
    // this.service.saveCorrected(corrected).subscribe(...)
  }
}
