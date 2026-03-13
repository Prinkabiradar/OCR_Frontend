import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OcrPageModalComponent } from './ocr-page-modal.component';

describe('OcrPageModalComponent', () => {
  let component: OcrPageModalComponent;
  let fixture: ComponentFixture<OcrPageModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OcrPageModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OcrPageModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
