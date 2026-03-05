"use client";

import { useEffect, useState } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import { callBackend } from "../../lib/api";

type Category = "bug" | "feature_request" | "account_issue" | "billing" | "technical" | "other";
type Priority = "low" | "medium" | "high" | "urgent";

interface SupportMessage {
  _id: string;
  subject: string;
  category: Category;
  priority: Priority;
  message: string;
  attachments?: string[];
  status: "pending" | "in_progress" | "resolved" | "closed";
  response?: string;
  respondedAt?: string;
  createdAt: string;
}

interface SupportHistoryResponse {
  supportMessages: SupportMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const categoryLabels: Record<Category, string> = {
  bug: "Bug Report",
  feature_request: "Feature Request",
  account_issue: "Account Issue",
  billing: "Billing",
  technical: "Technical Support",
  other: "Other",
};

const priorityLabels: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const priorityColors: Record<Priority, string> = {
  low: "bg-gray-100 text-gray-700 border-gray-200",
  medium: "bg-blue-50 text-blue-700 border-blue-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  urgent: "bg-red-50 text-red-700 border-red-200",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  resolved: "bg-green-50 text-green-700 border-green-200",
  closed: "bg-gray-100 text-gray-700 border-gray-300",
};

// SVG Components
const AlertSVG = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const CheckCircleSVG = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PaperAirplaneSVG = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const InboxSVG = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
  </svg>
);

const PlusSVG = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
  </svg>
);

const AttachmentSVG = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a2 2 0 000-2.828z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10l.01 0" />
  </svg>
);

const CloseSVG = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ClockSVG = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronSVG = ({ className = "", direction = "right" }: { className?: string; direction?: "left" | "right" }) => (
  <svg className={`${className} ${direction === "left" ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
  </svg>
);

const LoadingSpinnerSVG = ({ className = "" }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const QuestionSVG = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function SupportPage() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<Category>("other");
  const [priority, setPriority] = useState<Priority>("medium");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [historyData, setHistoryData] = useState<SupportHistoryResponse | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!currentSession) {
          router.push("/auth");
          return;
        }
        
        setIsCheckingAuth(false);
      } catch (error) {
        console.error("Error checking auth:", error);
        router.push("/");
      }
    };

    void checkAuth();
  }, [supabase, router]);

  useEffect(() => {
    if (activeTab === "history" && !historyData) {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await callBackend<SupportHistoryResponse>(
        supabase,
        `/api/v1/support?page=${historyPage}&limit=10`,
        { method: "GET" }
      );
      if (response.success && response.data) {
        setHistoryData(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch support history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length + attachments.length > 5) {
      setSubmitError("Maximum 5 attachments allowed");
      return;
    }

    setUploadingFiles(true);
    setSubmitError(null);

    try {
      const fileArray = Array.from(files);
      const mimeTypes = fileArray.map((file) => file.type || "application/octet-stream");

      const presignedResponse = await callBackend<{ urls: Array<{ uploadUrl: string; fileURL: string }> }>(
        supabase,
        "/api/v1/aws/get-s3-presigned-url",
        {
          method: "POST",
          jsonBody: { mimeTypes },
        }
      );

      if (!presignedResponse.success || !presignedResponse.data?.urls) {
        throw new Error("Failed to get upload URLs");
      }

      const uploadedUrls: string[] = [];
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const { uploadUrl, fileURL } = presignedResponse.data.urls[i];

        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        uploadedUrls.push(fileURL);
      }

      setAttachments([...attachments, ...uploadedUrls]);
    } catch (error) {
      console.error("File upload error:", error);
      setSubmitError(error instanceof Error ? error.message : "Failed to upload files");
    } finally {
      setUploadingFiles(false);
      e.target.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim()) {
      setSubmitError("Please enter a subject");
      return;
    }

    if (!message.trim()) {
      setSubmitError("Please enter your message");
      return;
    }

    if (!session) {
      router.push("/");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await callBackend(supabase, "/api/v1/support", {
        method: "POST",
        jsonBody: {
          subject: subject.trim(),
          category,
          priority,
          message: message.trim(),
          attachments: attachments.length > 0 ? attachments : undefined,
        },
      });

      setSubmitSuccess(true);
      setSubject("");
      setMessage("");
      setCategory("other");
      setPriority("medium");
      setAttachments([]);
      
      setTimeout(() => {
        setSubmitSuccess(false);
        setActiveTab("history");
        fetchHistory();
      }, 2000);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to submit support message. Please try again.";
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-pink-50/30 to-purple-50/20">
        <div className="text-center">
          <div className="mb-4">
            <div className="inline-block rounded-2xl bg-gradient-to-br from-[#E94057]/10 to-[#FF7EB3]/10 p-4">
              <LoadingSpinnerSVG className="h-8 w-8 text-[#E94057]" />
            </div>
          </div>
          <p className="text-sm text-[#6F6077]">Loading support center...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-pink-50/30 to-purple-50/20">
      {/* Background Patterns */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-[#E94057]/5 to-[#FF7EB3]/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-[#4b164c]/5 to-[#E94057]/5 rounded-full blur-3xl translate-x-1/4 translate-y-1/4" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-[#FF7EB3]/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative">
        {/* Header */}
        <div className="relative mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            

            {/* Apology png */}
          <div className="flex justify-center items-center my-8">
            <img 
              src="/we_are_sorry.png" 
              alt="We are sorry" 
              width={400}
              height={400}
              className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 lg:w-[400px] lg:h-[400px] object-contain"
            />
          </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              <span className="block text-[#2A1F2D]">We're here to</span>
              <span className="block bg-gradient-to-r from-[#E94057] via-[#FF7EB3] to-[#4b164c] bg-clip-text text-transparent">
                Help You
              </span>
            </h1>
            
            <p className="text-base sm:text-lg text-[#6F6077] max-w-xl mx-auto">
              Have a question or need assistance? Our team is ready to help you.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mt-8 flex justify-center">
            <div className="inline-flex bg-white/80 backdrop-blur-sm rounded-2xl p-1 border border-white/50 shadow-lg">
              <button
                onClick={() => setActiveTab("new")}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === "new"
                    ? "bg-gradient-to-r from-[#E94057] to-[#FF7EB3] text-white shadow-md"
                    : "text-[#6F6077] hover:text-[#2A1F2D] hover:bg-white/50"
                }`}
              >
                <PaperAirplaneSVG className="w-4 h-4" />
                <span>New Request</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("history");
                  if (!historyData) fetchHistory();
                }}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  activeTab === "history"
                    ? "bg-gradient-to-r from-[#E94057] to-[#FF7EB3] text-white shadow-md"
                    : "text-[#6F6077] hover:text-[#2A1F2D] hover:bg-white/50"
                }`}
              >
                <InboxSVG className="w-4 h-4" />
                <span>My Requests</span>
                {historyData?.pagination.total && (
                  <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full">
                    {historyData.pagination.total}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8">
          

          {/* Content Area */}
          {activeTab === "new" ? (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-white/50 shadow-xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-semibold text-[#2A1F2D] mb-2">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief description of your issue..."
                      className="w-full rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-sm text-[#2A1F2D] placeholder-[#6F6077]/50 shadow-sm transition-all duration-200 focus:border-[#E94057]/50 focus:outline-none focus:ring-2 focus:ring-[#E94057]/20 focus:bg-white"
                      disabled={isSubmitting}
                      maxLength={200}
                      required
                    />
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-xs text-[#6F6077]">Be specific about your issue</span>
                      <span className="text-xs text-[#6F6077]">{subject.length}/200</span>
                    </div>
                  </div>

                  {/* Category and Priority - Responsive Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#2A1F2D] mb-2">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value as Category)}
                          className="w-full rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-sm text-[#2A1F2D] shadow-sm transition-all duration-200 focus:border-[#E94057]/50 focus:outline-none focus:ring-2 focus:ring-[#E94057]/20 focus:bg-white appearance-none pr-10"
                          disabled={isSubmitting}
                          required
                        >
                          {Object.entries(categoryLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <ChevronSVG className="w-5 h-5 text-[#6F6077]" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#2A1F2D] mb-2">
                        Priority
                      </label>
                      <div className="relative">
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value as Priority)}
                          className="w-full rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-sm text-[#2A1F2D] shadow-sm transition-all duration-200 focus:border-[#E94057]/50 focus:outline-none focus:ring-2 focus:ring-[#E94057]/20 focus:bg-white appearance-none pr-10"
                          disabled={isSubmitting}
                        >
                          {Object.entries(priorityLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <ChevronSVG className="w-5 h-5 text-[#6F6077]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-semibold text-[#2A1F2D] mb-2">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-[#E94057]/5 to-[#FF7EB3]/5">
                      <p className="text-xs text-[#6F6077] flex items-center gap-2">
                        <QuestionSVG className="w-4 h-4" />
                        Please describe your issue, question, or feedback in detail
                      </p>
                    </div>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={6}
                      placeholder="Tell us what's on your mind... Be as detailed as possible."
                      className="w-full rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-sm text-[#2A1F2D] placeholder-[#6F6077]/50 shadow-sm transition-all duration-200 focus:border-[#E94057]/50 focus:outline-none focus:ring-2 focus:ring-[#E94057]/20 focus:bg-white resize-none"
                      disabled={isSubmitting}
                      maxLength={10000}
                      required
                    />
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-xs text-[#6F6077]">Include steps to reproduce, screenshots, or any relevant details</span>
                      <span className="text-xs text-[#6F6077]">{message.length}/10000</span>
                    </div>
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-[#2A1F2D] mb-2">
                      Attachments (Optional)
                    </label>
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="cursor-pointer flex-1">
                          <input
                            type="file"
                            multiple
                            accept="image/*,.pdf,.doc,.docx"
                            onChange={handleFileUpload}
                            disabled={isSubmitting || uploadingFiles}
                            className="hidden"
                          />
                          <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#E94057]/30 bg-white/50 px-4 py-3 text-sm font-medium text-[#2A1F2D] transition-all hover:bg-white hover:border-[#E94057]/50 hover:shadow-sm">
                            <PlusSVG className="w-5 h-5 text-[#E94057]" />
                            {uploadingFiles ? "Uploading..." : "Choose Files"}
                          </div>
                        </label>
                        <div className="text-xs text-[#6F6077] text-center sm:text-left">
                          Max 5 files (images, PDF, DOC)
                        </div>
                      </div>
                      
                      {attachments.length > 0 && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {attachments.map((url, index) => (
                              <div key={index} className="group relative rounded-xl bg-gradient-to-r from-white/80 to-white/60 p-3 border border-white/50 hover:border-[#E94057]/30 transition-all duration-200">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E94057]/10 to-[#FF7EB3]/10 flex items-center justify-center">
                                    <AttachmentSVG className="w-4 h-4 text-[#E94057]" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block text-xs font-medium text-[#2A1F2D] truncate hover:text-[#E94057] transition-colors"
                                      title={url.split("/").pop()}
                                    >
                                      {url.split("/").pop()}
                                    </a>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeAttachment(index)}
                                    disabled={isSubmitting}
                                    className="text-[#6F6077] hover:text-[#E94057] transition-colors p-1"
                                  >
                                    <CloseSVG className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Error Message */}
                  {submitError && (
                    <div className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50/80 to-red-50/60 p-4">
                      <div className="flex items-start gap-2">
                        <AlertSVG className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm font-medium text-red-700">{submitError}</div>
                      </div>
                    </div>
                  )}

                  {/* Success Message */}
                  {submitSuccess && (
                    <div className="rounded-2xl border border-green-200 bg-gradient-to-r from-green-50/80 to-green-50/60 p-4">
                      <div className="flex items-start gap-2">
                        <CheckCircleSVG className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-green-700 mb-1">
                            Thank you! Your message has been submitted successfully.
                          </div>
                          <div className="text-xs text-green-600 flex items-center gap-1">
                            <ClockSVG className="w-3 h-3" />
                            Redirecting to your requests...
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || !message.trim() || !subject.trim() || uploadingFiles}
                      className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#E94057] via-[#FF7EB3] to-[#4b164c] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-[#E94057]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#E94057]/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {isSubmitting ? (
                          <>
                            <LoadingSpinnerSVG className="w-5 h-5" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <PaperAirplaneSVG className="w-5 h-5" />
                            Submit Support Request
                          </>
                        )}
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-[#FF7EB3] via-[#E94057] to-[#4b164c] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {loadingHistory ? (
                <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-12 border border-white/50 shadow-xl">
                  <div className="text-center">
                    <div className="inline-block rounded-2xl bg-gradient-to-br from-[#E94057]/10 to-[#FF7EB3]/10 p-4 mb-4">
                      <LoadingSpinnerSVG className="h-8 w-8 text-[#E94057]" />
                    </div>
                    <p className="text-sm text-[#6F6077]">Loading your requests...</p>
                  </div>
                </div>
              ) : historyData && historyData.supportMessages.length > 0 ? (
                <div className="space-y-4">
                  {historyData.supportMessages.map((support) => (
                    <div
                      key={support._id}
                      className="group bg-white/90 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-[#E94057]/20"
                    >
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-bold text-[#2A1F2D] break-words">{support.subject}</h3>
                              <div className="flex flex-wrap gap-2">
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${priorityColors[support.priority]}`}>
                                  {priorityLabels[support.priority]}
                                </span>
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${statusColors[support.status]}`}>
                                  {support.status.replace("_", " ")}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-[#6F6077]">
                              <span className="inline-flex items-center gap-1">
                                {categoryLabels[support.category]}
                              </span>
                              <span className="hidden sm:inline">•</span>
                              <span className="inline-flex items-center gap-1">
                                <ClockSVG className="w-3 h-3" />
                                {formatDate(support.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Message */}
                        <div className="rounded-xl bg-gradient-to-r from-white/50 to-white/30 p-4">
                          <p className="text-sm text-[#2A1F2D] whitespace-pre-wrap break-words">{support.message}</p>
                        </div>

                        {/* Attachments */}
                        {support.attachments && Array.isArray(support.attachments) && support.attachments.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-[#6F6077] mb-2">Attachments:</p>
                            <div className="flex flex-wrap gap-2">
                              {support.attachments.map((url, index) => (
                                <a
                                  key={index}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/60 border border-white/50 hover:border-[#E94057]/30 transition-all duration-200 text-xs font-medium text-[#2A1F2D] hover:text-[#E94057]"
                                >
                                  <AttachmentSVG className="w-3 h-3" />
                                  {url.split("/").pop()}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Response */}
                        {support.response && (
                          <div className="rounded-xl bg-gradient-to-r from-green-50/50 to-green-50/30 border border-green-200/50 p-4">
                            <div className="flex items-start gap-2 mb-2">
                              <CheckCircleSVG className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-green-700 mb-1">Support Team Response</p>
                                {support.respondedAt && (
                                  <p className="text-xs text-green-600/80 flex items-center gap-1">
                                    <ClockSVG className="w-3 h-3" />
                                    {formatDate(support.respondedAt)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-[#2A1F2D] whitespace-pre-wrap break-words">{support.response}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Pagination */}
                  {historyData.pagination.pages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-6">
                      <button
                        onClick={() => {
                          setHistoryPage((prev) => Math.max(1, prev - 1));
                          fetchHistory();
                        }}
                        disabled={historyPage === 1 || loadingHistory}
                        className="px-4 py-2 rounded-xl bg-white/80 border border-white/50 text-sm font-medium text-[#2A1F2D] hover:bg-white hover:border-[#E94057]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronSVG className="w-4 h-4" direction="left" />
                      </button>
                      <span className="text-sm text-[#6F6077]">
                        Page {historyData.pagination.page} of {historyData.pagination.pages}
                      </span>
                      <button
                        onClick={() => {
                          setHistoryPage((prev) => Math.min(historyData.pagination.pages, prev + 1));
                          fetchHistory();
                        }}
                        disabled={historyPage === historyData.pagination.pages || loadingHistory}
                        className="px-4 py-2 rounded-xl bg-white/80 border border-white/50 text-sm font-medium text-[#2A1F2D] hover:bg-white hover:border-[#E94057]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronSVG className="w-4 h-4" direction="right" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-12 border border-white/50 shadow-xl">
                  <div className="text-center">
                    <div className="inline-block rounded-2xl bg-gradient-to-br from-[#E94057]/10 to-[#FF7EB3]/10 p-6 mb-4">
                      <InboxSVG className="h-12 w-12 text-[#E94057]" />
                    </div>
                    <h3 className="text-xl font-bold text-[#2A1F2D] mb-2">No Support Requests Yet</h3>
                    <p className="text-sm text-[#6F6077] mb-6">
                      You haven't submitted any support requests. Need help? Create your first request!
                    </p>
                    <button
                      onClick={() => setActiveTab("new")}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#E94057] to-[#FF7EB3] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    >
                      <PlusSVG className="w-4 h-4" />
                      Create New Request
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}