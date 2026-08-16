import { TestBed } from '@angular/core/testing';

import { PeerMatchRtc } from './peer-match-rtc';

describe('PeerMatchRtc', () => {
  let service: PeerMatchRtc;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PeerMatchRtc);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
