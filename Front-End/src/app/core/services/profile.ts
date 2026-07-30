import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateProfileRequest } from '../models/profile/create-profile-request'; // Adjust relative path if needed
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/Profile`;
  createProfile(data: CreateProfileRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/create`, data);
  }
  getProfileByUserId(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/user/${userId}`);
  }
}