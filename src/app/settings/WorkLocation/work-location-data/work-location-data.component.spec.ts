import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkLocationDataComponent } from './work-location-data.component';

describe('WorkLocationDataComponent', () => {
  let component: WorkLocationDataComponent;
  let fixture: ComponentFixture<WorkLocationDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WorkLocationDataComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkLocationDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
