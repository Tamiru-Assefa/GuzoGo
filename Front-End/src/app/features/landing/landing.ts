import { Component } from '@angular/core';
import { HeaderComponent } from '../../core/header/header';
import { FooterComponent } from '../../core/footer/footer';
import { HeroComponent } from './components/hero/hero';
import { FeaturesGridComponent } from './components/features-grid/features-grid';
import { CtaComponent } from './components/cta/cta';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    HeaderComponent,
    HeroComponent,
    FeaturesGridComponent,
    CtaComponent,
    FooterComponent
  ],
  template: `
    <app-header />
    <main>
      <app-hero />
      <app-features-grid />
      <app-cta />
    </main>
    <app-footer />
  `
})
export class LandingComponent {}