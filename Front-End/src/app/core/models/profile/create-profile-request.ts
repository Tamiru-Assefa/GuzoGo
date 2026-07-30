export interface CreateProfileRequest {
  userId: number;
  firstName: string;
  lastName: string;
  professionTitleId: number;
  experienceLevel: number;
  company: string;
  country: string;
  city: string;
  bio: string;
  linkedInUrl: string;
  gitHubUrl: string;
  portfolioUrl: string;
  profilePictureUrl: string;
}