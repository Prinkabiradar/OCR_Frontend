import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataDocumentTypeComponent } from './data-document-type.component';

describe('DataDocumentTypeComponent', () => {
  let component: DataDocumentTypeComponent;
  let fixture: ComponentFixture<DataDocumentTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataDocumentTypeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataDocumentTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
