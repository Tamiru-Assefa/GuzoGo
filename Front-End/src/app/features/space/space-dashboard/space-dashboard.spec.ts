import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpaceDashboard } from './space-dashboard';

describe('SpaceDashboard', () => {
  let component: SpaceDashboard;
  let fixture: ComponentFixture<SpaceDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpaceDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(SpaceDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
