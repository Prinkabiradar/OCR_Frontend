import { ComponentFixture, TestBed } from '@angular/core/testing';

describe('AllDocumentsComponent', () => {
  let component: AllDocumentsComponent;
  let fixture: ComponentFixture<AllDocumentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AllDocumentsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllDocumentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
