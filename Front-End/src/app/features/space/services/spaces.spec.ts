import { TestBed } from '@angular/core/testing';

import { Spaces } from './spaces';

describe('Spaces', () => {
  let service: Spaces;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Spaces);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
