import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CreateProfileRequest } from '../models/profile/create-profile-request';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  profession: string;
  professionCategory: string;
  company: string;
  country: string;
  city: string;
  bio: string;
  linkedInUrl: string;
  gitHubUrl: string;
  portfolioUrl: string;
  profilePictureUrl: string;
  experienceLevel: number;
  rating: number;
  totalRatings: number;
  badgeLevel: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {

  private http = inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/Profile`;


  createProfile(
    data: CreateProfileRequest
  ): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/create`,
      data
    );
  }


  // GET /api/Profile/user/{userId}
  getProfileByUserId(
    userId: number
  ): Observable<UserProfile> {

    return this.http.get<UserProfile>(
      `${this.apiUrl}/user/${userId}`
    );
  }


  // Get profile using USER ID
  //
  // IMPORTANT:
  // userId is NOT profileId.
  //
  getProfile(
    userId: number
  ): Observable<UserProfile> {

    return this.http.get<UserProfile>(
      `${this.apiUrl}/user/${userId}`
    );
  }


  // Get just the profile picture URL
  getProfilePicture(
    userId: number
  ): Observable<string> {

    return this.getProfile(userId).pipe(
      map(profile =>
        profile.profilePictureUrl || ''
      )
    );
  }


  updateProfile(
    profileId: number,
    data: any
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/${profileId}`,
      data
    );
  }
}