// features/space/components/category-filter/category-filter.component.ts

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-category-filter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-filter.html',
  styleUrls: ['./category-filter.scss'],
})
export class CategoryFilterComponent {
  @Input() selectedCategory: string = 'All Topics';
  @Output() categorySelected = new EventEmitter<string>();

   public categories = [
    { name: 'All Topics', icon: '🌐' },
    { name: 'Software Development', icon: '💻' },
    { name: 'Language Exchange', icon: '🗣️' },
    { name: 'Career & Interview', icon: '💼' },
    { name: 'Creative & Design', icon: '🎨' },
    { name: 'Business & Growth', icon: '📈' }
  ];

  selectCategory(category: string): void {
    this.categorySelected.emit(category);
  }
}