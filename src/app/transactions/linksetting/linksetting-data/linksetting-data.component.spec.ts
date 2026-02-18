import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LinksettingDataComponent } from './linksetting-data.component';

describe('LinksettingDataComponent', () => {
  let component: LinksettingDataComponent;
  let fixture: ComponentFixture<LinksettingDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LinksettingDataComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LinksettingDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
