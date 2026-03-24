import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfViewerModalComponent } from './pdf-viewer-modal.component';

describe('PdfViewerModalComponent', () => {
  let component: PdfViewerModalComponent;
  let fixture: ComponentFixture<PdfViewerModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PdfViewerModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfViewerModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
