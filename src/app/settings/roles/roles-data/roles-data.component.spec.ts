import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RolesDataComponent } from './roles-data.component';

describe('RolesDataComponent', () => {
  let component: RolesDataComponent;
  let fixture: ComponentFixture<RolesDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RolesDataComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RolesDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
