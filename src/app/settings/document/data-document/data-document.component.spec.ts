import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataDocumentComponent } from './data-document.component';

describe('DataDocumentComponent', () => {
  let component: DataDocumentComponent;
  let fixture: ComponentFixture<DataDocumentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataDocumentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataDocumentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
