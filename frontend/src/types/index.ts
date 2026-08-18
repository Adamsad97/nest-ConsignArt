// Types qui correspondent exactement aux réponses du backend ConsignArt

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'gallery' | 'artist' | 'collector';
  isActive: boolean;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Artist {
  id: string;
  firstName: string;
  lastName: string;
  bio?: string;
  isActive: boolean;
  galleryId?: string;
}

export type ArtworkStatus = 'available' | 'on_loan' | 'sold' | 'returned';

export interface Artwork {
  id: string;
  title: string;
  description?: string;
  price: number;
  reservePrice?: number;
  status: ArtworkStatus;
  medium?: string;
  dimensions?: string;
  artist?: Artist;
  artistId?: string;
  createdAt?: string;
}

export interface Exhibition {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  status: 'planned' | 'ongoing' | 'closed';
  artworks?: Artwork[];
}

export interface Loan {
  id: string;
  artwork?: Artwork;
  artworkId: string;
  borrowerName: string;
  startDate: string;
  endDate: string;
  returnedAt?: string;
  status?: 'active' | 'returned';
}

export interface Sale {
  id: string;
  artwork?: Artwork;
  artworkId: string;
  salePrice: number;
  commission: number;
  artistAmount: number;
  buyerEmail?: string;
  soldAt?: string;
  invoice?: Invoice;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  issuedAt: string;
}

export interface ArtistStatement {
  id: string;
  artistId: string;
  periodStart: string;
  periodEnd: string;
  totalSales: number;
  totalArtistAmount: number;
  generatedAt: string;
}

// Réponse paginée générique du backend
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
