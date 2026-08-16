import { TestBed } from '@angular/core/testing';

import { PeerMatchSignalr } from './peer-match-signalr';

describe('PeerMatchSignalr', () => {
  let service: PeerMatchSignalr;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PeerMatchSignalr);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
