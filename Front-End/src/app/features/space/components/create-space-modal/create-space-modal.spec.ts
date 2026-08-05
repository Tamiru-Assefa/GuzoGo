import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateSpaceModal } from './create-space-modal';

describe('CreateSpaceModal', () => {
  let component: CreateSpaceModal;
  let fixture: ComponentFixture<CreateSpaceModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateSpaceModal],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateSpaceModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
