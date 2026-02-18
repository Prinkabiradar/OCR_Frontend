import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RolesAddComponent } from './roles-add.component';

describe('RolesAddComponent', () => {
  let component: RolesAddComponent;
  let fixture: ComponentFixture<RolesAddComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RolesAddComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RolesAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
