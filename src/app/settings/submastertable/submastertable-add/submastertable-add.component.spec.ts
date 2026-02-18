import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmastertableAddComponent } from './submastertable-add.component';

describe('SubmastertableAddComponent', () => {
  let component: SubmastertableAddComponent;
  let fixture: ComponentFixture<SubmastertableAddComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SubmastertableAddComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubmastertableAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
