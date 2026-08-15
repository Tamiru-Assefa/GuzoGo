import {
  Directive,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

@Directive({
  selector: '[appVideoStream]',
  standalone: true
})
export class VideoStreamDirective implements OnChanges {
  @Input('appVideoStream') stream: MediaStream | null | undefined = null;
  @Input('isMuted') muted = false;

  constructor(private el: ElementRef<HTMLMediaElement>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['stream']) {
      const media = this.el.nativeElement as HTMLMediaElement;
      media.srcObject = this.stream ?? null;

      if (this.stream) {
        media.play().catch(() => undefined);
      }
    }

    if (changes['muted']) {
      this.el.nativeElement.muted = this.muted;
    }
  }
}
