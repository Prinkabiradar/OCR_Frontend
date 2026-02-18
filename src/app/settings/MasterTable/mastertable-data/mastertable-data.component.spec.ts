import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MastertableDataComponent } from './mastertable-data.component';

describe('MastertableDataComponent', () => {
  let component: MastertableDataComponent;
  let fixture: ComponentFixture<MastertableDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MastertableDataComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MastertableDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
