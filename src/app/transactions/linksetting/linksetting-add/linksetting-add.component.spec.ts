import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LinksettingAddComponent } from './linksetting-add.component';

describe('LinksettingAddComponent', () => {
  let component: LinksettingAddComponent;
  let fixture: ComponentFixture<LinksettingAddComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LinksettingAddComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LinksettingAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
