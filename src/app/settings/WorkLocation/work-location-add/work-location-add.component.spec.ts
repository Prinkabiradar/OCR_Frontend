import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkLocationAddComponent } from './work-location-add.component';

describe('WorkLocationAddComponent', () => {
  let component: WorkLocationAddComponent;
  let fixture: ComponentFixture<WorkLocationAddComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WorkLocationAddComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkLocationAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
