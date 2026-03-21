"use client";

import { useEffect, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useParams, useRouter } from "next/navigation";
import { callBackend } from "../../../../lib/api";
import Link from "next/link";

interface UserDetails {
  user: {
    email: string;
    displayName?: string;
    photoURL?: string;
    phoneNumber?: string;
    provider: string;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    status: string;
    referralCode?: string;
  };
  profile: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    age?: number;
    gender?: string;
    bio?: string;
    location?: {
      coordinates?: [number, number];
      city?: string;
      country?: string;
    };
    photos?: Array<{
      url: string;
      isPrimary?: boolean;
      uploadedAt?: string;
    }>;
    interests?: string[];
    height?: number;
    education?: string;
    occupation?: string;
    company?: string;
    school?: string;
    isOnboarded?: boolean;
  } | null;
  preferences?: {
    distanceMaxKm?: number;
    ageRange?: [number, number];
    showMe?: string[];
  };
  subscription?: {
    status: string;
    plan?: string;
    startDate?: string;
    endDate?: string;
    autoRenew?: boolean;
    provider?: string;
    lastPaymentAt?: string;
  };
  subscriptions?: Array<{
    plan: string;
    status: string;
    startDate: string;
    endDate: string;
    createdAt?: string;
  }>;
  account: {
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string;
    dailyInteractionCount?: number;
    lastInteractionResetAt?: string;
  };
  interactions: {
    likesSent: number;
    likesReceived: number;
    matches: number;
    messagesSent: number;
    reportsAgainst: number;
  };
  stories?: Array<{
    id: string;
    type: "image" | "video";
    mediaUrl: string;
    views: number;
    createdAt: string;
    expiresAt: string;
    isExpired: boolean;
  }>;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const supabase = useSupabaseClient();
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; isPrimary?: boolean; uploadedAt?: string; type?: "image" | "video" } | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await callBackend<UserDetails>(
          supabase,
          `/api/v1/admin/users/${userId}`,
          { method: "GET" }
        );

        if (response.success && response.data) {
          setUserDetails(response.data);
        } else {
          router.push("/admin/users");
        }
      } catch (err) {
        console.error("Failed to fetch user details:", err);
        router.push("/admin/users");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      void fetchData();
    }
  }, [supabase, userId, router]);

  // Keyboard navigation for photo lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedPhoto || !userDetails?.profile?.photos) return;

      if (e.key === "Escape") {
        setSelectedPhoto(null);
      } else if (e.key === "ArrowLeft") {
        const currentIndex = userDetails.profile.photos.findIndex(
          (p) => p.url === selectedPhoto.url
        );
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : userDetails.profile.photos.length - 1;
        setSelectedPhoto(userDetails.profile.photos[prevIndex]);
      } else if (e.key === "ArrowRight") {
        const currentIndex = userDetails.profile.photos.findIndex(
          (p) => p.url === selectedPhoto.url
        );
        const nextIndex = currentIndex < userDetails.profile.photos.length - 1 ? currentIndex + 1 : 0;
        setSelectedPhoto(userDetails.profile.photos[nextIndex]);
      }
    };

    if (selectedPhoto) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedPhoto, userDetails]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-[#6F6077]">Loading user details...</div>
      </div>
    );
  }

  if (!userDetails) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-700",
      banned: "bg-red-100 text-red-700",
      deleted: "bg-gray-100 text-gray-700",
      suspended: "bg-yellow-100 text-yellow-700",
    };
    return (
      <span className={`pill ${colors[status] || colors.active} text-xs px-3 py-1`}>
        {status}
      </span>
    );
  };

  const openStatusModal = (currentStatus: string) => {
    setNewStatus(currentStatus);
    setShowStatusModal(true);
  };

  const handleStatusChange = async () => {
    if (!newStatus || newStatus === userDetails?.user.status) {
      setShowStatusModal(false);
      return;
    }

    try {
      setUpdatingStatus(true);
      const response = await callBackend(
        supabase,
        `/api/v1/admin/users/${userId}/status`,
        {
          method: "PATCH",
          jsonBody: { status: newStatus },
        }
      );

      if (response.success) {
        // Refresh user details
        const refreshResponse = await callBackend<UserDetails>(
          supabase,
          `/api/v1/admin/users/${userId}`,
          { method: "GET" }
        );
        if (refreshResponse.success && refreshResponse.data) {
          setUserDetails(refreshResponse.data);
        }
        setShowStatusModal(false);
        setNewStatus("");
      } else {
        alert("Failed to update user status");
      }
    } catch (err) {
      console.error("Failed to update user status:", err);
      alert(err instanceof Error ? err.message : "Failed to update user status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="relative">
        <Link
          href="/admin/users"
          className="text-sm text-[#6F6077] hover:text-[#E94057] mb-2 inline-block"
        >
          ← Back to Users
        </Link>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-[#2A1F2D] mb-2">User Details</h1>
            <p className="text-sm md:text-base text-[#6F6077]">Email: {decodeURIComponent(userId)}</p>
          </div>
          {userDetails && (
            <button
              onClick={() => openStatusModal(userDetails.user.status)}
              className="relative px-6 py-3 bg-gradient-to-r from-[#E94057] to-[#F27121] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 animate-pulse hover:animate-none focus:outline-none focus:ring-4 focus:ring-[#E94057]/50"
              style={{
                boxShadow: "0 0 20px rgba(233, 64, 87, 0.5), 0 0 40px rgba(233, 64, 87, 0.3)",
              }}
            >
              <span className="relative z-10 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Change Status
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Basic Information */}
      <div className="glass-card rounded-2xl p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold text-[#2A1F2D] mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {userDetails.user.displayName && (
            <div>
              <p className="text-xs md:text-sm text-[#6F6077] mb-1">Display Name</p>
              <p className="text-sm md:text-base font-medium text-[#2A1F2D]">
                {userDetails.user.displayName}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs md:text-sm text-[#6F6077] mb-1">Email</p>
            <p className="text-sm md:text-base font-medium text-[#2A1F2D]">{userDetails.user.email}</p>
          </div>
          {userDetails.user.phoneNumber && (
            <div>
              <p className="text-xs md:text-sm text-[#6F6077] mb-1">Phone Number</p>
              <p className="text-sm md:text-base font-medium text-[#2A1F2D]">
                {userDetails.user.phoneNumber}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs md:text-sm text-[#6F6077] mb-1">Provider</p>
            <p className="text-sm md:text-base font-medium text-[#2A1F2D] capitalize">
              {userDetails.user.provider}
            </p>
          </div>
          <div>
            <p className="text-xs md:text-sm text-[#6F6077] mb-1">Status</p>
            <div className="flex items-center gap-2">
              {getStatusBadge(userDetails.user.status)}
            </div>
          </div>
          <div>
            <p className="text-xs md:text-sm text-[#6F6077] mb-1">Verification</p>
            <div className="flex gap-2">
              <span className={`text-xs px-2 py-1 rounded ${userDetails.user.isEmailVerified ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                Email {userDetails.user.isEmailVerified ? "✓" : "✗"}
              </span>
              <span className={`text-xs px-2 py-1 rounded ${userDetails.user.isPhoneVerified ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                Phone {userDetails.user.isPhoneVerified ? "✓" : "✗"}
              </span>
            </div>
          </div>
          {userDetails.user.referralCode && (
            <div>
              <p className="text-xs md:text-sm text-[#6F6077] mb-1">Referral Code</p>
              <p className="text-sm md:text-base font-medium text-[#2A1F2D] font-mono">
                {userDetails.user.referralCode}
              </p>
            </div>
          )}
          {userDetails.user.photoURL && (
            <div>
              <p className="text-xs md:text-sm text-[#6F6077] mb-2">Profile Photo</p>
              <img
                src={userDetails.user.photoURL}
                alt={userDetails.user.displayName || "Profile"}
                className="h-20 w-20 rounded-full object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {/* Profile Details */}
      {userDetails.profile && (
        <div className="glass-card rounded-2xl p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-[#2A1F2D] mb-4">Profile Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(userDetails.profile.firstName || userDetails.profile.lastName) && (
              <div>
                <p className="text-xs md:text-sm text-[#6F6077] mb-1">Name</p>
                <p className="text-sm md:text-base font-medium text-[#2A1F2D]">
                  {userDetails.profile.firstName || ""} {userDetails.profile.lastName || ""}
                </p>
              </div>
            )}
            {userDetails.profile.age !== null && userDetails.profile.age !== undefined && (
              <div>
                <p className="text-xs md:text-sm text-[#6F6077] mb-1">Age</p>
                <p className="text-sm md:text-base font-medium text-[#2A1F2D]">
                  {userDetails.profile.age} years
                </p>
              </div>
            )}
            {userDetails.profile.dateOfBirth && (
              <div>
                <p className="text-xs md:text-sm text-[#6F6077] mb-1">Date of Birth</p>
                <p className="text-sm md:text-base font-medium text-[#2A1F2D]">
                  {new Date(userDetails.profile.dateOfBirth).toLocaleDateString()}
                </p>
              </div>
            )}
            {userDetails.profile.gender && (
              <div>
                <p className="text-xs md:text-sm text-[#6F6077] mb-1">Gender</p>
                <p className="text-sm md:text-base font-medium text-[#2A1F2D] capitalize">
                  {userDetails.profile.gender}
                </p>
              </div>
            )}
            {userDetails.profile.height && (
              <div>
                <p className="text-xs md:text-sm text-[#6F6077] mb-1">Height</p>
                <p className="text-sm md:text-base font-medium text-[#2A1F2D]">
                  {userDetails.profile.height} cm
                </p>
              </div>
            )}
            {userDetails.profile.location && (
              <div>
                <p className="text-xs md:text-sm text-[#6F6077] mb-1">Location</p>
                <p className="text-sm md:text-base font-medium text-[#2A1F2D]">
                  {userDetails.profile.location.city || "Unknown"}
                  {userDetails.profile.location.country && `, ${userDetails.profile.location.country}`}
                </p>
              </div>
            )}
            {userDetails.profile.bio && (
              <div className="md:col-span-2">
                <p className="text-xs md:text-sm text-[#6F6077] mb-1">Bio</p>
                <p className="text-sm md:text-base text-[#2A1F2D]">{userDetails.profile.bio}</p>
              </div>
            )}
            {userDetails.profile.interests && userDetails.profile.interests.length > 0 && (
              <div className="md:col-span-2">
                <p className="text-xs md:text-sm text-[#6F6077] mb-2">Interests</p>
                <div className="flex flex-wrap gap-2">
                  {userDetails.profile.interests.map((interest, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full bg-[#E94057]/10 text-[#E94057] text-xs"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {userDetails.profile.education && (
              <div>
                <p className="text-xs md:text-sm text-[#6F6077] mb-1">Education</p>
                <p className="text-sm md:text-base font-medium text-[#2A1F2D]">
                  {userDetails.profile.education}
                </p>
              </div>
            )}
            {userDetails.profile.occupation && (
              <div>
                <p className="text-xs md:text-sm text-[#6F6077] mb-1">Occupation</p>
                <p className="text-sm md:text-base font-medium text-[#2A1F2D]">
                  {userDetails.profile.occupation}
                </p>
              </div>
            )}
            {userDetails.profile.company && (
              <div>
                <p className="text-xs md:text-sm text-[#6F6077] mb-1">Company</p>
                <p className="text-sm md:text-base font-medium text-[#2A1F2D]">
                  {userDetails.profile.company}
                </p>
              </div>
            )}
            {userDetails.profile.school && (
              <div>
                <p className="text-xs md:text-sm text-[#6F6077] mb-1">School</p>
                <p className="text-sm md:text-base font-medium text-[#2A1F2D]">
                  {userDetails.profile.school}
                </p>
              </div>
            )}
            {/* Photos 
            
            {userDetails.profile.photos && userDetails.profile.photos.length > 0 && (
              <div className="md:col-span-2">
                <p className="text-xs md:text-sm text-[#6F6077] mb-2">Photos ({userDetails.profile.photos.length})</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {userDetails.profile.photos.map((photo, idx) => (
                    <div
                      key={idx}
                      className="relative group cursor-pointer"
                      onClick={() => setSelectedPhoto({ ...photo, type: "image" })}
                    >
                      <img
                        src={photo.url}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-40 md:h-48 object-cover rounded-xl transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-colors" />
                      {photo.isPrimary && (
                        <span className="absolute top-2 right-2 bg-[#E94057] text-white text-xs px-2 py-1 rounded font-medium">
                          Primary
                        </span>
                      )}
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
                          <p className="text-white text-xs font-medium">Photo {idx + 1}</p>
                          {photo.uploadedAt && (
                            <p className="text-white/80 text-xs">
                              {new Date(photo.uploadedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            */}
          </div>
        </div>
      )}

      {/* Preferences */}
      {userDetails.preferences &&
        (userDetails.preferences.distanceMaxKm !== undefined ||
          userDetails.preferences.ageRange ||
          (userDetails.preferences.showMe && userDetails.preferences.showMe.length > 0)) && (
          <div className="glass-card rounded-2xl p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold text-[#2A1F2D] mb-4">Preferences</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {userDetails.preferences.distanceMaxKm !== undefined && (
                <div>
                  <p className="text-xs md:text-sm text-[#6F6077] mb-1">Max Distance</p>
                  <p className="text-sm md:text-base font-medium text-[#2A1F2D]">
                    {userDetails.preferences.distanceMaxKm} km
                  </p>
                </div>
              )}
              {userDetails.preferences.ageRange && (
                <div>
                  <p className="text-xs md:text-sm text-[#6F6077] mb-1">Age Range</p>
                  <p className="text-sm md:text-base font-medium text-[#2A1F2D]">
                    {userDetails.preferences.ageRange[0]} - {userDetails.preferences.ageRange[1]} years
                  </p>
                </div>
              )}
              {userDetails.preferences.showMe && userDetails.preferences.showMe.length > 0 && (
                <div>
                  <p className="text-xs md:text-sm text-[#6F6077] mb-1">Show Me</p>
                  <div className="flex gap-2">
                    {userDetails.preferences.showMe.map((gender, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full bg-white/50 text-[#2A1F2D] text-xs capitalize"
                      >
                        {gender}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Subscription */}
      {(userDetails.subscription || (userDetails.subscriptions && userDetails.subscriptions.length > 0)) && (
        <div className="glass-card rounded-2xl p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-[#2A1F2D] mb-4">Subscription</h2>
          <div className="space-y-4">
            {userDetails.subscription && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs md:text-sm text-[#6F6077] mb-1">Status</p>
                  <span className={`pill ${userDetails.subscription.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"} text-xs px-3 py-1`}>
                    {userDetails.subscription.status}
                  </span>
                </div>
                {userDetails.subscription.plan && (
                  <div>
                    <p className="text-xs md:text-sm text-[#6F6077] mb-1">Plan</p>
                    <p className="text-sm md:text-base font-medium text-[#2A1F2D] capitalize">
                      {userDetails.subscription.plan}
                    </p>
                  </div>
                )}
                {userDetails.subscription.startDate && (
                  <div>
                    <p className="text-xs md:text-sm text-[#6F6077] mb-1">Start Date</p>
                    <p className="text-sm md:text-base font-medium text-[#2A1F2D]">
                      {formatDate(userDetails.subscription.startDate)}
                    </p>
                  </div>
                )}
                {userDetails.subscription.endDate && (
                  <div>
                    <p className="text-xs md:text-sm text-[#6F6077] mb-1">End Date</p>
                    <p className="text-sm md:text-base font-medium text-[#2A1F2D]">
                      {formatDate(userDetails.subscription.endDate)}
                    </p>
                  </div>
                )}
              </div>
            )}
            {userDetails.subscriptions && userDetails.subscriptions.length > 0 && (
              <div>
                <p className="text-xs md:text-sm font-medium text-[#6F6077] mb-2">Subscription History</p>
                <div className="space-y-2">
                  {userDetails.subscriptions.map((sub, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl bg-white/50 p-3 md:p-4 border border-white/60"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <p className="font-medium text-[#2A1F2D] text-sm md:text-base">
                            {sub.plan} - {sub.status}
                          </p>
                          <p className="text-xs md:text-sm text-[#6F6077]">
                            {formatDate(sub.startDate)} to {formatDate(sub.endDate)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(!userDetails.subscription && (!userDetails.subscriptions || userDetails.subscriptions.length === 0)) && (
              <p className="text-sm text-[#6F6077]">No subscription information available</p>
            )}
          </div>
        </div>
      )}

      {/* Account Information */}
      <div className="glass-card rounded-2xl p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold text-[#2A1F2D] mb-4">Account Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs md:text-sm text-[#6F6077] mb-1">Created At</p>
            <p className="text-sm md:text-base font-medium text-[#2A1F2D]">
              {formatDate(userDetails.account.createdAt)}
            </p>
          </div>
          <div>
            <p className="text-xs md:text-sm text-[#6F6077] mb-1">Last Updated</p>
            <p className="text-sm md:text-base font-medium text-[#2A1F2D]">
              {formatDate(userDetails.account.updatedAt)}
            </p>
          </div>
          <div>
            <p className="text-xs md:text-sm text-[#6F6077] mb-1">Last Login</p>
            <p className="text-sm md:text-base font-medium text-[#2A1F2D]">
              {formatDate(userDetails.account.lastLoginAt)}
            </p>
          </div>
          {userDetails.account.dailyInteractionCount !== undefined && (
            <div>
              <p className="text-xs md:text-sm text-[#6F6077] mb-1">Daily Interactions</p>
              <p className="text-sm md:text-base font-medium text-[#2A1F2D]">
                {userDetails.account.dailyInteractionCount}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stories */}
      {userDetails.stories && userDetails.stories.length > 0 && (
        <div className="glass-card rounded-2xl p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-[#2A1F2D] mb-4">
            Stories ({userDetails.stories.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {userDetails.stories.map((story) => (
              <div
                key={story.id}
                className="relative group cursor-pointer"
                onClick={() => setSelectedPhoto({ url: story.mediaUrl, isPrimary: false, type: story.type })}
              >
                {story.type === "image" ? (
                  <img
                    src={story.mediaUrl}
                    alt="Story"
                    className="w-full h-40 md:h-48 object-cover rounded-xl transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-40 md:h-48 bg-gradient-to-br from-[#E94057] to-[#FF7EB3] rounded-xl flex items-center justify-center relative overflow-hidden">
                    <video
                      src={story.mediaUrl}
                      className="w-full h-full object-cover"
                      muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-colors" />
                {story.isExpired && (
                  <span className="absolute top-2 left-2 bg-gray-600 text-white text-xs px-2 py-1 rounded font-medium">
                    Expired
                  </span>
                )}
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
                    <div className="flex items-center justify-between text-white text-xs">
                      <span>{story.views} views</span>
                      <span className="capitalize">{story.type}</span>
                    </div>
                    <p className="text-white/80 text-xs mt-1">
                      {new Date(story.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactions */}
      <div className="glass-card rounded-2xl p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold text-[#2A1F2D] mb-4">Interactions</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-xl md:text-2xl font-bold text-[#E94057]">
              {userDetails.interactions.likesSent}
            </p>
            <p className="text-xs md:text-sm text-[#6F6077]">Likes Sent</p>
          </div>
          <div className="text-center">
            <p className="text-xl md:text-2xl font-bold text-[#E94057]">
              {userDetails.interactions.likesReceived}
            </p>
            <p className="text-xs md:text-sm text-[#6F6077]">Likes Received</p>
          </div>
          <div className="text-center">
            <p className="text-xl md:text-2xl font-bold text-[#E94057]">
              {userDetails.interactions.matches}
            </p>
            <p className="text-xs md:text-sm text-[#6F6077]">Matches</p>
          </div>
          <div className="text-center">
            <p className="text-xl md:text-2xl font-bold text-[#E94057]">
              {userDetails.interactions.messagesSent}
            </p>
            <p className="text-xs md:text-sm text-[#6F6077]">Messages Sent</p>
          </div>
          <div className="text-center">
            <p className="text-xl md:text-2xl font-bold text-red-600">
              {userDetails.interactions.reportsAgainst}
            </p>
            <p className="text-xs md:text-sm text-[#6F6077]">Reports</p>
          </div>
        </div>
      </div>

      {/* Photo Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 md:p-6">
              {selectedPhoto.type === "video" ? (
                <video
                  src={selectedPhoto.url}
                  controls
                  className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img
                  src={selectedPhoto.url}
                  alt="Full size media"
                  className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
                  onClick={(e) => e.stopPropagation()}
                />
              )}

              <div className="mt-4 flex items-center justify-between text-white">
                <div>
                  {selectedPhoto.isPrimary && (
                    <span className="inline-block bg-[#E94057] text-white text-xs px-3 py-1 rounded-full font-medium mr-2">
                      Primary Photo
                    </span>
                  )}
                  {selectedPhoto.type && (
                    <span className="inline-block bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium mr-2 capitalize">
                      {selectedPhoto.type}
                    </span>
                  )}
                  {selectedPhoto.uploadedAt && (
                    <span className="text-sm text-white/80">
                      Uploaded: {new Date(selectedPhoto.uploadedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {/* Navigation for profile photos */}
                  {userDetails.profile?.photos && userDetails.profile.photos.length > 1 && selectedPhoto.type === "image" && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentIndex = userDetails.profile!.photos!.findIndex(
                            (p) => p.url === selectedPhoto.url
                          );
                          const prevIndex = currentIndex > 0 ? currentIndex - 1 : userDetails.profile!.photos!.length - 1;
                          setSelectedPhoto({ ...userDetails.profile!.photos![prevIndex], type: "image" });
                        }}
                        className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
                        aria-label="Previous photo"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentIndex = userDetails.profile!.photos!.findIndex(
                            (p) => p.url === selectedPhoto.url
                          );
                          const nextIndex = currentIndex < userDetails.profile!.photos!.length - 1 ? currentIndex + 1 : 0;
                          setSelectedPhoto({ ...userDetails.profile!.photos![nextIndex], type: "image" });
                        }}
                        className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
                        aria-label="Next photo"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}
                  {/* Navigation for stories */}
                  {userDetails.stories && userDetails.stories.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentIndex = userDetails.stories!.findIndex(
                            (s) => s.mediaUrl === selectedPhoto.url
                          );
                          const prevIndex = currentIndex > 0 ? currentIndex - 1 : userDetails.stories!.length - 1;
                          const prevStory = userDetails.stories![prevIndex];
                          setSelectedPhoto({ url: prevStory.mediaUrl, type: prevStory.type });
                        }}
                        className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
                        aria-label="Previous story"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentIndex = userDetails.stories!.findIndex(
                            (s) => s.mediaUrl === selectedPhoto.url
                          );
                          const nextIndex = currentIndex < userDetails.stories!.length - 1 ? currentIndex + 1 : 0;
                          const nextStory = userDetails.stories![nextIndex];
                          setSelectedPhoto({ url: nextStory.mediaUrl, type: nextStory.type });
                        }}
                        className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
                        aria-label="Next story"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Confirmation Modal */}
      {showStatusModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => !updatingStatus && setShowStatusModal(false)}
        >
          <div
            className="glass-card bg-white/10 backdrop-blur-sm rounded-3xl p-6 md:p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl md:text-2xl font-bold text-[#2A1F2D] mb-4">
              Change User Status
            </h3>
            <p className="text-sm md:text-base text-[#6F6077] mb-4">
              Current status: <span className="font-semibold text-[#2A1F2D]">{userDetails?.user.status}</span>
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#6F6077] mb-2">
                Select New Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                disabled={updatingStatus}
                className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#E94057] disabled:opacity-50"
              >
                <option value="">Select status...</option>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
                <option value="suspended">Suspended</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>
            {newStatus && newStatus !== userDetails?.user.status && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="text-sm text-yellow-800 font-medium mb-1">⚠️ Warning</p>
                <p className="text-xs text-yellow-700">
                  Are you sure you want to change the user status from{" "}
                  <span className="font-semibold">{userDetails?.user.status}</span> to{" "}
                  <span className="font-semibold">{newStatus}</span>? This action cannot be easily undone.
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setNewStatus("");
                }}
                disabled={updatingStatus}
                className="flex-1 rounded-xl bg-white/50 px-4 py-3 text-[#6F6077] font-medium hover:bg-white/70 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusChange}
                disabled={updatingStatus || !newStatus || newStatus === userDetails?.user.status}
                className="flex-1 rounded-xl bg-[#E94057] px-4 py-3 text-white font-medium hover:bg-[#E94057]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatingStatus ? "Updating..." : "Confirm Change"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
