// features/space/space-dashboard/space-dashboard.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SpacesService } from '../services/spaces';
import { Space } from '../models/space.models';

import { CategoryFilterComponent } from '../components/category-filter/category-filter';
import { SpaceCardComponent } from '../components/space-card/space-card';
import { CreateSpaceModalComponent } from '../components/create-space-modal/create-space-modal';

@Component({
  selector: 'app-space-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    CategoryFilterComponent, 
    SpaceCardComponent,
    CreateSpaceModalComponent
  ],
  templateUrl: './space-dashboard.html',
  styleUrls: ['./space-dashboard.scss']
})
export class SpaceDashboardComponent implements OnInit {
  public isCreateModalOpen = false;
  public selectedCategory = 'All Topics';
  public searchQuery = '';
  public activeFilter: 'all' | 'my-spaces' | 'public' | 'private' = 'all';

  public spaces: Space[] = [];

  constructor(
    private spacesService: SpacesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchSpaces();
  }

  public fetchSpaces(): void {
    this.spacesService.getSpaces().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.spaces = data;
        }
      },
      error: (err) => console.error('Error fetching spaces', err)
    });
  }

  /**
   * Consolidated single getter for Search, Category, and Privacy/Ownership tabs
   */
  public get filteredSpaces(): Space[] {
    const currentUserId = localStorage.getItem('userId');

    return this.spaces.filter((space) => {
      // 1. Category Filter
      const matchesCategory =
        this.selectedCategory === 'All' ||
        this.selectedCategory === 'All Topics' ||
        space.category === this.selectedCategory;

      // 2. Search Text Filter
      const searchText = (space.title ?? '').toLowerCase();
      const queryText = this.searchQuery.trim().toLowerCase();
      const matchesSearch = !queryText || searchText.includes(queryText);

      // 3. Tab (All / My Spaces / Public / Private) Filter
      let matchesType = true;
      if (this.activeFilter === 'public') {
        matchesType = space.isPublic === true;
      } else if (this.activeFilter === 'private') {
        matchesType = space.isPublic === false;
      } else if (this.activeFilter === 'my-spaces') {
        matchesType = String((space as any).hostId) === String(currentUserId);
      }

      return matchesCategory && matchesSearch && matchesType;
    });
  }

  public onCategorySelect(category: string): void {
    this.selectedCategory = category;
  }

  public filterOwnership(type: 'all' | 'my-spaces' | 'public' | 'private'): void {
    this.activeFilter = type;
  }

  public openCreateModal(): void {
    this.isCreateModalOpen = true;
  }

  public closeCreateModal(): void {
    this.isCreateModalOpen = false;
  }

  public onSpaceCreated(newSpace: Space): void {
    this.closeCreateModal();
    this.fetchSpaces();
  }

  public joinSpace(spaceId: number): void {
    this.router.navigate(['/spaces', spaceId]);
  }
}