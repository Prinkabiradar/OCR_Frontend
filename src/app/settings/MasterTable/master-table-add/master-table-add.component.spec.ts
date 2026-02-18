import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterTableAddComponent } from './master-table-add.component';

describe('MasterTableAddComponent', () => {
  let component: MasterTableAddComponent;
  let fixture: ComponentFixture<MasterTableAddComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterTableAddComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MasterTableAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
