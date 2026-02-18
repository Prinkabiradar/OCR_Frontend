import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmastertableDataComponent } from './submastertable-data.component';

describe('SubmastertableDataComponent', () => {
  let component: SubmastertableDataComponent;
  let fixture: ComponentFixture<SubmastertableDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SubmastertableDataComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubmastertableDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
