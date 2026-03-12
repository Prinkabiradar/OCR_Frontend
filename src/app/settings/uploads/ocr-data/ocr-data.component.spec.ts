import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OcrDataComponent } from './ocr-data.component';

describe('OcrDataComponent', () => {
  let component: OcrDataComponent;
  let fixture: ComponentFixture<OcrDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OcrDataComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OcrDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
