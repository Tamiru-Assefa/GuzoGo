import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { profileCheckGuard } from './profile-check-guard';

describe('profileCheckGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => profileCheckGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
