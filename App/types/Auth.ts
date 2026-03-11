// Authentication related types

export interface SupabaseUser {
  id: string;
  email?: string;
  phone?: string;
  user_metadata?: {
    phone?: string;
    email?: string;
    full_name?: string;
    avatar_url?: string;
  };
  app_metadata?: {
    provider?: string;
  };
}

// Database user type with optional fields for store persistence
export interface DBUser {
  _id?: string;
  user_id: string;
  referralCode?: string;
  email: string;
  phoneNumber?: string;
  displayName?: string;
  photoURL?: string;
  provider?: 'google' | 'email' | 'phone';
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  status?: 'active' | 'banned' | 'deleted' | 'suspended';
  profile?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    gender?: string;
    bio?: string;
    location?: {
      type?: string;
      coordinates?: number[];
      city?: string;
      country?: string;
    };
    photos?: Array<{
      url?: string;
      isPrimary?: boolean;
      uploadedAt?: Date;
    }>;
    interests?: string[];
    height?: number;
    education?: string;
    occupation?: string;
    company?: string;
    school?: string;
    isOnboarded?: boolean;
  };
  preferences?: {
    distanceMaxKm?: number;
    ageRange?: number[];
    showMe?: string[];
  };
  subscription?: {
    status?: 'none' | 'pending' | 'active' | 'expired' | 'cancelled';
    plan?: 'basic' | 'premium' | 'super' | 'free';
    startDate?: Date | null;
    endDate?: Date | null;
    autoRenew?: boolean;
    lastPaymentAt?: Date | null;
    provider?: 'razorpay' | 'stripe' | 'paypal' | 'apple' | 'google' | null;
    updatedAt?: Date | null;
  };
  createdAt?: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
  notificationTokens?: string[];
  isAdmin: boolean
}

