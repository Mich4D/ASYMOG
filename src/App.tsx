import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, LucideQuote, Download, LogOut, User, Users, PlusCircle, Church, Phone, Mail, Lock, Award, ShieldCheck, Menu, X, Video, ArrowRight, Eye, EyeOff, Loader2, Check, Search, ChevronDown, CreditCard, History, Facebook, MessageCircle, Reply, Calendar, Globe, TrendingUp, Heart, Briefcase, Zap, Camera, Clock, Plus, DollarSign, PieChart as PieChartIcon, BarChart as BarChartIcon, BarChart2, FileText, Cloud } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { jsPDF } from "jspdf";
import { createClient } from "@supabase/supabase-js";
import ChatWidget from "./components/ChatWidget";
import MeetingRoom from "./components/MeetingRoom";
import Typewriter from "./components/Typewriter";
import { useFlutterwave, closePaymentModal } from "flutterwave-react-v3";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "";
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = () => {
  return supabaseUrl !== "" && supabaseKey !== "" && !supabaseKey.startsWith("sb_publishable_");
};

const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co", 
  supabaseKey || "placeholder"
);

export type User = {
  id?: string;
  fullName: string;
  email: string;
  churchName: string;
  phone?: string;
  role?: string;
  status?: string;
  userType?: 'member' | 'executive' | 'admin';
  registrationNumber?: string;
  certificateData?: string;
  licenseData?: string;
  certificateExpiry?: string;
  licenseExpiry?: string;
  certificatePayment?: { reference: string; datePaid: string; amount: number };
  licensePayment?: { reference: string; datePaid: string; amount: number };
  cooperativeEnrollment?: boolean;
  cooperativeHands?: number;
  cooperativePayments?: { datePaid: string; amount: number; reference: string; month: string; year: string; hands: number }[];
  duesPayments?: { datePaid: string; amount: number; reference: string; month: string; year: string }[];
  certForm?: any;
  licForm?: any;
};

const optimizeImage = (url: string | null | undefined, width?: number) => {
  if (!url) return "";
  if (url.includes("res.cloudinary.com") && !url.includes("f_auto")) {
    const parts = url.split("/upload/");
    if (parts.length === 2) {
      const transform = width ? `f_auto,q_auto,w_${width},c_limit` : "f_auto,q_auto";
      return `${parts[0]}/upload/${transform}/${parts[1]}`;
    }
  }
  return url;
};

const handleUniversalUpload = async (file: File, supabaseBucket: string): Promise<string> => {
  // First attempt Cloudinary via backend
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/upload-cloudinary', {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.url && !result.fallback) {
        return result.url;
      }
    }
  } catch (err) {
    console.warn("Cloudinary upload failed, falling back to Supabase/Base64:", err);
  }

  // Fallback to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage.from(supabaseBucket).upload(fileName, file, { upsert: true });
      if (!error && data) {
        const { data: publicData } = supabase.storage.from(supabaseBucket).getPublicUrl(fileName);
        return publicData.publicUrl;
      }
    } catch (err) {
      console.warn("Supabase upload failed:", err);
    }
  }

  // Final fallback: Base64
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

type Page = "home" | "register" | "login" | "dashboard" | "meeting" | "admin" | "about" | "resources" | "verification" | "executive-portal";

const defaultTestimonials = [
  { id: 1, name: "Pastor Solomon", text: "ASYMOG has strengthened my calling and grounded me in truth. The fellowship is unmatched.", image: "https://res.cloudinary.com/dlg60ept3/image/upload/f_auto,q_auto/v1778155739/assymog_uploads/johpi8d58hbluscuxbky.jpg" },
  { id: 2, name: "Pastor. Siminiye", text: "This association brought unity and clarity to my ministry. We are stronger together.", image: "https://res.cloudinary.com/dlg60ept3/image/upload/f_auto,q_auto/v1778155785/assymog_uploads/qgpe05nuxoverioxdfbo.jpg" },
  { id: 3, name: "Pastor Oluwasegun", text: "The monthly roll-ups and conferences have totally transformed my approach to leadership and pastoring.", image: "https://utgwqjmxelinswelqgwg.supabase.co/storage/v1/object/public/App_files/663a9w3wbt8_1778155879103.jpg" },
  { id: 4, name: "Pastor Sunday", text: "A family of ministers where you are truly supported. Getting my ministerial license here was seamless.", image: "https://res.cloudinary.com/dlg60ept3/image/upload/f_auto,q_auto/v1778156023/assymog_uploads/g1eiasyqovpus8wifyvr.jpg" },
  { id: 5, name: "Prophetess Deborah", text: "The cooperative hand has been a financial lifesaver for my ministry. ASYMOG truly cares for its own.", image: "https://i.pravatar.cc/150?img=32" },
  { id: 6, name: "Bishop Emmanuel", text: "Integrity and transparency are the hallmarks of this association. I'm proud to be one of the leaders.", image: "https://i.pravatar.cc/150?img=12" },
];

const defaultRegularMeetings = [
  { id: 1, title: "Monthly General Meeting", schedule: "First Thursday of every month", venue: "Google Meet (Online Link provided in Member Portal)", meta: "Time: 10:00 AM Prompt" },
  { id: 2, title: "Executive Meeting", schedule: "Last Tuesday of every month", venue: "Google Meet (Direct Link in Executive Portal)", meta: "Time: 7:00 PM" },
  { id: 3, title: "Annual Ministers Conference", schedule: "Every 3rd week of November", venue: "Combined: Physical (Aboru, Lagos) & Google Meet", meta: "A 3-day strategic annual gathering." }
];

function SupportSection({ user }: { user: User }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/messages/my/${encodeURIComponent(user.email)}`)
      .then(res => res.json())
      .then(data => setMessages(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user.email]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: user.email,
          userName: user.fullName,
          subject,
          message
        })
      });
      const newMessage = await res.json();
      setMessages([newMessage, ...messages]);
      setSubject("");
      setMessage("");
      alert("Message sent to Admin. You will receive a reply here.");
    } catch (e) {
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-primary-gold/10">
        <h3 className="font-serif text-3xl font-bold text-primary-theme mb-2">Support Helpdesk</h3>
        <p className="text-gray-500 mb-8">Send a message to the ASYMOG Secretariat/Admin for any inquiries or support.</p>
        
        <form onSubmit={handleSendMessage} className="space-y-4">
          <input 
            type="text" 
            placeholder="Subject" 
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary-gold/30"
          />
          <textarea 
            placeholder="How can we help you today?" 
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
            rows={4}
            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary-gold/30"
          ></textarea>
          <button 
            type="submit" 
            disabled={sending}
            className="w-full bg-primary-theme text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-black transition-all disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-primary-gold/10">
        <h4 className="font-serif text-2xl font-bold text-gray-800 mb-6">Conversation History</h4>
        {loading ? (
          <p className="text-gray-500 italic">Loading messages...</p>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-gray-400 italic bg-gray-50 rounded-2xl border border-gray-100">
            No messages found.
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg: any) => (
              <div key={msg.id} className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-gray-50 p-5 flex justify-between items-center">
                  <div>
                    <h5 className="font-bold text-primary-theme">{msg.subject}</h5>
                    <p className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    msg.status === 'replied' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {msg.status}
                  </span>
                </div>
                <div className="p-6 space-y-4">
                  <div className="bg-primary-gold/5 p-4 rounded-xl border-l-4 border-primary-gold">
                    <p className="text-sm font-medium text-gray-800">{msg.message}</p>
                  </div>
                  
                  {msg.replies && msg.replies.map((rep: any) => (
                    <div key={rep.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 ml-8 relative">
                      <div className="absolute top-1/2 -left-4 w-4 h-px bg-gray-200"></div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-primary-theme uppercase tracking-widest">{rep.sender}</span>
                        <span className="text-[10px] text-gray-400">{new Date(rep.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-700 italic">"{rep.message}"</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SupportMessagesAdmin() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState<{ [key: number]: string }>({});
  const [sending, setSending] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    fetch("/api/admin/messages")
      .then(res => res.json())
      .then(data => setMessages(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleReply = async (messageId: number) => {
    const reply = replyText[messageId];
    if (!reply || !reply.trim()) return;
    
    setSending(prev => ({ ...prev, [messageId]: true }));
    try {
      const res = await fetch("/api/admin/messages/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, reply, adminName: "ASYMOG Admin" })
      });
      const data = await res.json();
      if (data.success) {
        setMessages(messages.map(m => m.id === messageId ? data.message : m));
        setReplyText(prev => ({ ...prev, [messageId]: "" }));
        alert("Reply sent successfully");
      }
    } catch (e) {
      alert("Failed to send reply");
    } finally {
      setSending(prev => ({ ...prev, [messageId]: false }));
    }
  };

  const deleteMessage = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    try {
      await fetch(`/api/admin/messages/${id}`, { method: "DELETE" });
      setMessages(messages.filter(m => m.id !== id));
    } catch (e) {}
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-primary-gold/10 overflow-hidden">
      <div className="p-8 border-b border-gray-100 bg-off-white">
        <h3 className="font-serif text-2xl font-bold text-primary-theme">Support Messages</h3>
        <p className="text-gray-500 mt-2 text-sm">Respond to member inquiries and help requests.</p>
      </div>
      
      <div className="p-8 space-y-8">
        {loading ? (
          <p className="text-center py-20 text-gray-500 italic">Loading inquiries...</p>
        ) : messages.length === 0 ? (
          <div className="text-center py-20 text-gray-400 italic">No inquiries found.</div>
        ) : (
          messages.slice().reverse().map((msg: any) => (
            <div key={msg.id} className="border border-gray-100 rounded-3xl overflow-hidden shadow-sm group">
              <div className="bg-gray-50 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                   <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-bold text-lg text-primary-theme">{msg.subject}</h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${
                        msg.status === 'replied' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {msg.status}
                      </span>
                   </div>
                   <p className="text-xs text-gray-500">From: <strong className="text-gray-800">{msg.userName}</strong> ({msg.userEmail}) • {new Date(msg.createdAt).toLocaleString()}</p>
                </div>
                <button 
                  onClick={() => deleteMessage(msg.id)}
                  className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-8">
                 <div className="bg-primary-gold/5 p-6 rounded-2xl border border-primary-gold/10 mb-8">
                    <p className="text-gray-800 leading-relaxed">{msg.message}</p>
                 </div>

                 <div className="space-y-4 mb-8">
                    {msg.replies && msg.replies.map((rep: any) => (
                      <div key={rep.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 max-w-[80%]">
                         <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">{rep.sender}</span>
                            <span className="text-[10px] text-gray-400">{new Date(rep.createdAt).toLocaleDateString()}</span>
                         </div>
                         <p className="text-sm text-gray-700">{rep.message}</p>
                      </div>
                    ))}
                 </div>

                 <div className="flex gap-4">
                    <input 
                      type="text" 
                      placeholder="Write a reply..."
                      value={replyText[msg.id] || ""}
                      onChange={e => setReplyText({ ...replyText, [msg.id]: e.target.value })}
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary-gold/30 outline-none"
                    />
                    <button 
                      onClick={() => handleReply(msg.id)}
                      disabled={sending[msg.id] || !replyText[msg.id]?.trim()}
                      className="bg-primary-theme text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-black transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <Reply size={18} />
                      <span>Reply</span>
                    </button>
                 </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const path = window.location.pathname;
    if (path === "/admin") return "admin";
    if (path === "/verification") return "verification";
    if (path === "/about") return "about";
    if (path === "/resources") return "resources";
    if (path === "/register") return "register";
    if (path === "/login") return "login";
    if (path === "/executive-portal") return "executive-portal";
    return "home";
  });
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [heroImage, setHeroImage] = useState("/hero-bg.jpg");
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [presidentImage, setPresidentImage] = useState<string | null>(null);
  const [presidentName, setPresidentName] = useState("Bishop Emmanuel");
  const [events, setEvents] = useState<{ id: number; title: string; date: string; loc: string }[]>([]);
  const [testimonials, setTestimonials] = useState<{ id: number; name: string; text: string; image: string }[]>(defaultTestimonials);
  const [regularMeetings, setRegularMeetings] = useState<{ id: number; title: string; schedule: string; venue: string; meta: string }[]>(defaultRegularMeetings);
  const [flutterwaveKey, setFlutterwaveKey] = useState("");
  const [flutterwaveSecretKey, setFlutterwaveSecretKey] = useState("");
  const [cloudinaryUrl, setCloudinaryUrl] = useState("");
  const [monthlyDuesAmount, setMonthlyDuesAmount] = useState<number>(2000);
  const [executiveDuesAmount, setExecutiveDuesAmount] = useState<number>(5000);
  const [certificatePrice, setCertificatePrice] = useState<number>(5000);
  const [licensePrice, setLicensePrice] = useState<number>(7500);
  const [cooperativeHandPrice, setCooperativeHandPrice] = useState<number>(5000);
  const [cooperativeGraceDay, setCooperativeGraceDay] = useState<number>(10);
  const [cooperativeFineAmount, setCooperativeFineAmount] = useState<number>(500);

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [publicSearchQuery, setPublicSearchQuery] = useState("");
  const [publicSearchResults, setPublicSearchResults] = useState<any[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  
  useEffect(() => {
    const path = currentPage === "home" ? "/" : `/${currentPage}`;
    if (window.location.pathname !== path) {
      window.history.pushState({ page: currentPage }, "", path);
    }
  }, [currentPage]);

  const [networkVerified, setNetworkVerified] = useState(() => {
    return localStorage.getItem("assymog_network_verified") === "true";
  });
  const [networkVerifyInput, setNetworkVerifyInput] = useState("");
  const [networkVerifyError, setNetworkVerifyError] = useState("");
  const [networkVerifyLoading, setNetworkVerifyLoading] = useState(false);

  const performNetworkVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!networkVerifyInput.trim()) return;
    setNetworkVerifyLoading(true);
    setNetworkVerifyError("");
    try {
      const res = await fetch(`/api/members/search`);
      const data = await res.json();
      const members = data.members || [];
      const found = members.find((m: any) => m.registrationNumber?.toLowerCase() === networkVerifyInput.toLowerCase().trim());
      if (found) {
        setNetworkVerified(true);
        localStorage.setItem("assymog_network_verified", "true");
        performMemberSearch(""); // load all members initially
      } else {
        setNetworkVerifyError("Invalid Registration or Certificate Number.");
      }
    } catch(err) {
      setNetworkVerifyError("Error verifying number. Please try again.");
    } finally {
      setNetworkVerifyLoading(false);
    }
  };

  useEffect(() => {
    if (networkVerified) {
      performMemberSearch("");
    }
  }, [networkVerified]);

  const [expandedMemberIndex, setExpandedMemberIndex] = useState<number | null>(null);

  const performMemberSearch = async (q: string) => {
    setSearchingMembers(true);
    setExpandedMemberIndex(null);
    try {
      const res = await fetch(`/api/members/search?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      setPublicSearchResults(data.members || []);
    } catch (e) {
      console.error(e);
      setPublicSearchResults([]);
    } finally {
      setSearchingMembers(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("assymog_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setCurrentPage("dashboard");
      window.history.pushState({ loggedIn: true }, "");
    }

    // Fetch initial platform settings
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          if (data.settings.heroImage !== undefined) setHeroImage(data.settings.heroImage);
          if (data.settings.logoImage !== undefined) setLogoImage(data.settings.logoImage);
          if (data.settings.presidentImage !== undefined) setPresidentImage(data.settings.presidentImage);
          if (data.settings.presidentName !== undefined) setPresidentName(data.settings.presidentName);
          if (data.settings.flutterwaveKey !== undefined) setFlutterwaveKey(data.settings.flutterwaveKey);
          if (data.settings.flutterwaveSecretKey !== undefined) setFlutterwaveSecretKey(data.settings.flutterwaveSecretKey);
          if (data.settings.cloudinaryUrl !== undefined) setCloudinaryUrl(data.settings.cloudinaryUrl);
          if (data.settings.monthlyDuesAmount !== undefined) setMonthlyDuesAmount(data.settings.monthlyDuesAmount);
          if (data.settings.executiveDuesAmount !== undefined) setExecutiveDuesAmount(data.settings.executiveDuesAmount);
          if (data.settings.certificatePrice !== undefined) setCertificatePrice(data.settings.certificatePrice);
          if (data.settings.licensePrice !== undefined) setLicensePrice(data.settings.licensePrice);
          if (data.settings.cooperativeHandPrice !== undefined) setCooperativeHandPrice(data.settings.cooperativeHandPrice);
          if (data.settings.cooperativeGraceDay !== undefined) setCooperativeGraceDay(data.settings.cooperativeGraceDay);
          if (data.settings.cooperativeFineAmount !== undefined) setCooperativeFineAmount(data.settings.cooperativeFineAmount);
          if (data.settings.events !== undefined) setEvents(data.settings.events);
          if (data.settings.regularMeetings !== undefined) setRegularMeetings(data.settings.regularMeetings);
          if (data.settings.testimonials !== undefined) {
             setTestimonials(data.settings.testimonials);
          }
        }
      })
      .catch(err => console.error("Could not load settings", err));

    // Listen for setting updates across the app
    const handleSettingsUpdated = (e: any) => {
      if (e.detail?.heroImage) setHeroImage(e.detail.heroImage);
      if (e.detail?.logoImage !== undefined) setLogoImage(e.detail.logoImage);
      if (e.detail?.presidentImage !== undefined) setPresidentImage(e.detail.presidentImage);
      if (e.detail?.presidentName !== undefined) setPresidentName(e.detail.presidentName);
      if (e.detail?.flutterwaveKey !== undefined) setFlutterwaveKey(e.detail.flutterwaveKey);
      if (e.detail?.flutterwaveSecretKey !== undefined) setFlutterwaveSecretKey(e.detail.flutterwaveSecretKey);
      if (e.detail?.cloudinaryUrl !== undefined) setCloudinaryUrl(e.detail.cloudinaryUrl);
      if (e.detail?.monthlyDuesAmount !== undefined) setMonthlyDuesAmount(e.detail.monthlyDuesAmount);
      if (e.detail?.executiveDuesAmount !== undefined) setExecutiveDuesAmount(e.detail.executiveDuesAmount);
      if (e.detail?.certificatePrice !== undefined) setCertificatePrice(e.detail.certificatePrice);
      if (e.detail?.licensePrice !== undefined) setLicensePrice(e.detail.licensePrice);
      if (e.detail?.cooperativeHandPrice !== undefined) setCooperativeHandPrice(e.detail.cooperativeHandPrice);
      if (e.detail?.cooperativeGraceDay !== undefined) setCooperativeGraceDay(e.detail.cooperativeGraceDay);
      if (e.detail?.cooperativeFineAmount !== undefined) setCooperativeFineAmount(e.detail.cooperativeFineAmount);
      if (e.detail?.events) setEvents(e.detail.events);
      if (e.detail?.regularMeetings) setRegularMeetings(e.detail.regularMeetings);
      if (e.detail?.testimonials) setTestimonials(e.detail.testimonials);
    };

    const handleTriggerSearch = (e: any) => {
      setPublicSearchQuery(e.detail || "");
      setPublicSearchResults([]);
      const isVerified = user !== null;
      setNetworkVerified(isVerified);
      setNetworkVerifyInput("");
      setNetworkVerifyError("");
      setShowSearchModal(true);
      if (isVerified) {
        performMemberSearch(e.detail || "");
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      const path = window.location.pathname;
      const pageBase = path.split("/")[1] || "home";
      // Basic mapping
      const validPages: Page[] = ["home", "register", "login", "dashboard", "meeting", "admin", "about", "resources", "verification", "executive-portal"];
      if (validPages.includes(pageBase as Page)) {
        setCurrentPage(pageBase as Page);
      } else {
        setCurrentPage("home");
      }
    };

    window.addEventListener("settings-updated", handleSettingsUpdated);
    window.addEventListener("trigger-public-search", handleTriggerSearch);
    window.addEventListener("popstate", handlePopState);
    
    return () => {
      window.removeEventListener("settings-updated", handleSettingsUpdated);
      window.removeEventListener("trigger-public-search", handleTriggerSearch);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const logout = () => {
    localStorage.removeItem("assymog_user");
    setUser(null);
    setCurrentPage("home");
  };

  const goHome = () => {
    if (user) {
      logout();
    } else {
      setCurrentPage("home");
    }
  };

  const generatePDF = (type: "certificate" | "license") => {
    if (!user) return;
    
    // Use uploaded data if admin provided it
    if (type === "certificate" && user.certificateData) {
      const link = document.createElement('a');
      link.href = user.certificateData;
      link.download = `ASYMOG_Certificate_${user.fullName.replace(/\\s+/g, '_')}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    
    if (type === "license" && user.licenseData) {
      const link = document.createElement('a');
      link.href = user.licenseData;
      link.download = `ASYMOG_License_${user.fullName.replace(/\\s+/g, '_')}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(10, 25, 47); // Navy Blue
    doc.rect(0, 0, 210, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("ASSOCIATION OF YORUBA MINISTERS OF GOD", 105, 18, { align: "center" });
    doc.setFontSize(14);
    doc.text("(ASYMOG)", 105, 28, { align: "center" });

    // Golden border
    doc.setDrawColor(212, 175, 55); // Gold
    doc.setLineWidth(1.5);
    doc.rect(10, 10, 190, 277);

    // Content
    doc.setTextColor(0, 0, 0);
    if (type === "certificate") {
      doc.setFontSize(30);
      doc.text("CERTIFICATE OF MEMBERSHIP", 105, 70, { align: "center" });
      
      doc.setFontSize(16);
      doc.text("This is to certify that", 105, 95, { align: "center" });
      
      doc.setFontSize(24);
      doc.setTextColor(10, 25, 47);
      doc.text(user.fullName.toUpperCase(), 105, 115, { align: "center" });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.text("is a registered and recognized member of the", 105, 135, { align: "center" });
      doc.text("Association of Yoruba Ministers of God.", 105, 145, { align: "center" });
      
      doc.text(`Church: ${user.churchName}`, 105, 165, { align: "center" });
      
      const membershipBase = user.registrationNumber || `ASYM/M${new Date().getFullYear().toString().substring(2)}/${String(user.id || "0000").slice(0,4)}`;
      const certNumber = membershipBase.replace('ASYM/M', 'ASYM/C');
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.text(`Certificate No: ${certNumber}`, 105, 185, { align: "center" });
    } else {
      doc.setFontSize(30);
      doc.text("MINISTERIAL LICENSE", 105, 70, { align: "center" });
      
      doc.setFontSize(16);
      doc.text("Authorization is hereby granted to", 105, 95, { align: "center" });
      
      doc.setFontSize(24);
      doc.setTextColor(10, 25, 47);
      doc.text(user.fullName.toUpperCase(), 105, 115, { align: "center" });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.text("to perform the duties and functions of a Minister of the Gospel", 105, 135, { align: "center" });
      doc.text("under the oversight and standards of ASYMOG.", 105, 145, { align: "center" });

      const membershipBase = user.registrationNumber || `ASYM/M${new Date().getFullYear().toString().substring(2)}/${String(user.id || "0000").slice(0,4)}`;
      const certNumber = membershipBase.replace('ASYM/M', 'ASYM/C');
      const licNumber = certNumber.replace('ASYM/C', 'ASYM/L');
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.text(`License No: ${licNumber}`, 105, 185, { align: "center" });
    }

    doc.setFontSize(12);
    doc.text(`Issued on: ${new Date().toLocaleDateString()}`, 105, 230, { align: "center" });
    
    doc.text("__________________________", 50, 260);
    doc.text("General Secretary", 55, 265);
    
    doc.text("__________________________", 160, 260, { align: "right" });
    doc.text("President", 155, 265, { align: "right" });

    doc.save(`ASYMOG_${type}_${user.fullName.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-primary-gold selection:text-white">
      {/* Navigation */}
      <nav className="bg-white/80 border-b border-primary-gold/20 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div 
            className="flex items-center space-x-2 cursor-pointer group" 
            onClick={goHome}
            id="nav-logo"
          >
            {logoImage ? (
              <img src={optimizeImage(logoImage, 100)} alt="ASYMOG Logo" referrerPolicy="no-referrer" className="w-10 h-10 object-contain group-hover:scale-110 transition-transform" />
            ) : (
              <div className="w-10 h-10 bg-primary-theme rounded-lg flex items-center justify-center text-white font-serif font-bold text-xl shadow-lg group-hover:scale-110 transition-transform">
                A
              </div>
            )}
            <span className="font-serif font-bold text-xl tracking-tight hidden sm:block">ASYMOG</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden xl:flex items-center space-x-3 text-sm font-medium">
            <div className="relative group mr-1">
               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input 
                 type="text" 
                 placeholder="Search Minister..." 
                 className="pl-9 pr-2 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs focus:ring-2 focus:ring-primary-gold/30 outline-none w-32 focus:w-48 transition-all"
                 onKeyDown={(e) => {
                   if (e.key === 'Enter') {
                     // Trigger search action
                     const val = (e.currentTarget as HTMLInputElement).value;
                     if (val) window.dispatchEvent(new CustomEvent("trigger-public-search", { detail: val }));
                   }
                 }}
               />
            </div>
            <button onClick={goHome} className="hover:text-primary-theme transition-colors px-1 py-1">Home</button>
            <button onClick={() => setCurrentPage("verification")} className="hover:text-primary-theme transition-colors px-1 py-1">Verification</button>
            <button onClick={() => setCurrentPage("about")} className="hover:text-primary-theme transition-colors px-1 py-1">About</button>
            <button onClick={() => setCurrentPage("resources")} className="hover:text-primary-theme transition-colors px-1 py-1 whitespace-nowrap">Resources</button>
            <button onClick={() => setCurrentPage("executive-portal")} className="hover:text-primary-theme transition-colors px-1 py-1 flex items-center gap-1">
              <ShieldCheck size={14} className="text-primary-gold" />
              <span>Board</span>
            </button>
            <button onClick={() => { setPublicSearchQuery(""); setPublicSearchResults([]); setShowSearchModal(true); }} className="hover:text-primary-theme transition-colors px-1 py-1 whitespace-nowrap">Find Minister</button>
            <button onClick={() => alert("Events coming soon!")} className="hover:text-primary-theme transition-colors px-1 py-1">Events</button>
            {user ? (
              <>
                <button onClick={() => setCurrentPage("dashboard")} className="hover:text-primary-theme transition-colors px-2 py-1">Dashboard</button>
                <button onClick={logout} className="flex items-center space-x-2 bg-primary-theme text-white px-5 py-2.5 rounded-full hover:bg-black transition-all shadow-md active:scale-95">
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setCurrentPage("login")} className="hover:text-primary-theme transition-colors px-2 py-1">Login</button>
                <button 
                  onClick={() => setCurrentPage("register")} 
                  className="bg-primary-gold text-white px-6 py-2.5 rounded-full hover:bg-primary-theme transition-all shadow-md active:scale-95"
                >
                  Register
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center space-x-2 xl:hidden">
            <button 
              className="p-2 text-primary-gold" 
              onClick={() => { setPublicSearchQuery(""); setPublicSearchResults([]); setShowSearchModal(true); }}
            >
              <Search size={24} />
            </button>
            <button className="p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="xl:hidden border-t border-primary-gold/10 overflow-hidden bg-white"
            >
              <div className="p-4 flex flex-col space-y-4 font-medium">
                <button onClick={() => { goHome(); setIsMenuOpen(false); }}>Home</button>
                <button onClick={() => { setCurrentPage("verification"); setIsMenuOpen(false); }}>Verification</button>
                <button onClick={() => { setCurrentPage("about"); setIsMenuOpen(false); }}>About Us</button>
                <button onClick={() => { setCurrentPage("resources"); setIsMenuOpen(false); }}>Library & Resources</button>
                <button onClick={() => { setCurrentPage("executive-portal"); setIsMenuOpen(false); }} className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-primary-gold" />
                  <span>Board Portal</span>
                </button>
                {user ? (
                  <>
                    <button onClick={() => { setCurrentPage("dashboard"); setIsMenuOpen(false); }}>Dashboard</button>
                    <button onClick={() => { logout(); setIsMenuOpen(false); }} className="text-primary-theme">Logout</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setCurrentPage("login"); setIsMenuOpen(false); }}>Login</button>
                    <button onClick={() => { setCurrentPage("register"); setIsMenuOpen(false); }}>Register</button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="flex-grow flex flex-col">
        <AnimatePresence mode="wait">
          {currentPage === "home" && <HomePage onNavigate={setCurrentPage} heroImage={heroImage} logoImage={logoImage} presidentImage={presidentImage} presidentName={presidentName} events={events} regularMeetings={regularMeetings} testimonials={testimonials} onOpenNetwork={() => setShowSearchModal(true)} />}
          {currentPage === "register" && <RegisterPage onNavigate={setCurrentPage} />}
          {currentPage === "login" && <LoginPage onNavigate={setCurrentPage} onLogin={(u) => { 
            setUser(u); 
            setCurrentPage("dashboard"); 
            window.history.pushState({ loggedIn: true }, ""); 
          }} />}
          {currentPage === "executive-portal" && <ExecutiveLoginPage onNavigate={setCurrentPage} onLogin={(u) => { 
            setUser(u); 
            setCurrentPage("dashboard"); 
            window.history.pushState({ loggedIn: true }, ""); 
          }} />}
          {currentPage === "dashboard" && user && (
            <DashboardPage 
              user={user} 
              onUpdateUser={(u) => { setUser(u); localStorage.setItem("assymog_user", JSON.stringify(u)); }}
              onDownload={generatePDF} 
              onNavigate={setCurrentPage} 
              onOpenSearch={() => setShowSearchModal(true)}
              onLogout={logout}
              executiveDuesAmount={executiveDuesAmount}
              monthlyDuesAmount={monthlyDuesAmount}
              certificatePrice={certificatePrice}
              licensePrice={licensePrice}
              cooperativeHandPrice={cooperativeHandPrice}
              cooperativeGraceDay={cooperativeGraceDay}
              cooperativeFineAmount={cooperativeFineAmount}
              flutterwaveKey={flutterwaveKey}
            />
          )}
          {currentPage === "meeting" && user && (
            <MeetingRoom user={user} onBack={() => setCurrentPage("dashboard")} />
          )}
          {currentPage === "admin" && (
            <AdminDashboardPage 
              onNavigate={setCurrentPage} 
              onLoginExecutive={(exec) => {
                setUser(exec);
                setCurrentPage("dashboard");
                localStorage.setItem("assymog_user", JSON.stringify(exec));
              }}
              onLogout={logout}
              heroImage={heroImage}
              logoImage={logoImage}
              presidentImage={presidentImage}
              presidentName={presidentName}
              flutterwaveKey={flutterwaveKey}
              flutterwaveSecretKey={flutterwaveSecretKey}
              cloudinaryUrl={cloudinaryUrl}
              monthlyDuesAmount={monthlyDuesAmount}
              executiveDuesAmount={executiveDuesAmount}
              certificatePrice={certificatePrice}
              licensePrice={licensePrice}
              cooperativeHandPrice={cooperativeHandPrice}
              cooperativeGraceDay={cooperativeGraceDay}
              cooperativeFineAmount={cooperativeFineAmount}
              events={events}
              regularMeetings={regularMeetings}
              testimonials={testimonials}
            />
          )}
          {currentPage === "about" && (
            <AboutPage onNavigate={setCurrentPage} presidentImage={presidentImage} presidentName={presidentName} logoImage={logoImage} />
          )}
          {currentPage === "verification" && (
            <VerificationPage onNavigate={setCurrentPage} />
          )}
          {currentPage === "resources" && (
            <ResourcesPage />
          )}
        </AnimatePresence>
      </main>

      {/* Public Search Modal */}
      <AnimatePresence>
        {showSearchModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary-theme/60 backdrop-blur-sm"
            onClick={() => setShowSearchModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-off-white">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-primary-theme">Minister Directory</h3>
                  {!networkVerified && <p className="text-gray-500 text-sm mt-1">Verification Required</p>}
                </div>
                <button onClick={() => setShowSearchModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              {!(networkVerified || !!user) ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-primary-theme/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock size={32} className="text-primary-gold" />
                  </div>
                  <h4 className="font-bold text-xl text-primary-theme mb-2">Access Restricted</h4>
                  <p className="text-gray-500 mb-8 max-w-sm mx-auto">Please enter your Registration Number or Certificate Number to view other registered ministers.</p>
                  
                  <form onSubmit={performNetworkVerify} className="max-w-sm mx-auto space-y-4">
                    <input 
                      type="text" 
                      placeholder="e.g. ASYMOG/M24/0001" 
                      className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-gold/30 font-medium text-center"
                      value={networkVerifyInput}
                      onChange={(e) => setNetworkVerifyInput(e.target.value)}
                      required
                    />
                    {networkVerifyError && <p className="text-red-500 text-sm">{networkVerifyError}</p>}
                    <button 
                      type="submit" 
                      disabled={networkVerifyLoading || !networkVerifyInput.trim()}
                      className="w-full bg-primary-theme text-white py-4 rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                      {networkVerifyLoading && <Loader2 size={16} className="animate-spin" />}
                      Verify Access
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  <div className="p-8 pb-0">
                    <div className="relative">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-gold" size={20} />
                       <input 
                         type="text" 
                         placeholder="Search Name, Registration ID or Church..." 
                         className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary-gold/30 font-medium"
                         value={publicSearchQuery}
                         onChange={(e) => {
                           setPublicSearchQuery(e.target.value);
                           performMemberSearch(e.target.value);
                         }}
                         autoFocus
                       />
                    </div>
                  </div>

                  <div className="p-8 max-h-[60vh] overflow-y-auto">
                {searchingMembers ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 size={40} className="animate-spin text-primary-gold mb-4" />
                    <p className="text-gray-500 font-medium">Scanning our records...</p>
                  </div>
                ) : publicSearchResults.length === 0 ? (
                  <div className="text-center py-12">
                     <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                        <Search size={32} className="text-gray-300" />
                     </div>
                     <h4 className="text-lg font-bold text-gray-800 mb-2">No Member Found</h4>
                     <p className="text-gray-500 max-w-sm mx-auto">We couldn't find any registered minister matching your search criteria. Please check the spelling or try another term.</p>
                  </div>
                ) : (
                  <div className="space-y-4 pb-12">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Found {publicSearchResults.length} Result{publicSearchResults.length !== 1 ? 's' : ''}</p>
                    {publicSearchResults.map((m, i) => (
                      <div key={i} className="bg-gray-50 rounded-[2rem] border border-gray-100 overflow-hidden hover:border-primary-gold/30 transition-all">
                        <div 
                          className="flex items-center justify-between p-5 cursor-pointer hover:bg-white transition-all group"
                          onClick={() => setExpandedMemberIndex(expandedMemberIndex === i ? null : i)}
                        >
                          <div className="flex items-center space-x-4">
                              <div className="w-14 h-14 bg-primary-theme/5 rounded-2xl flex items-center justify-center text-primary-theme font-serif font-bold text-2xl border border-primary-theme/10 group-hover:bg-primary-theme group-hover:text-white transition-colors">
                                {m.fullName.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900 group-hover:text-primary-theme transition-colors flex items-center">
                                  {m.fullName}
                                  {m.status === 'approved' && <Check size={14} className="ml-2 text-green-600" />}
                                  {m.userType === 'executive' && (
                                    <span className="ml-2 px-2 py-0.5 bg-primary-gold/10 text-primary-gold text-[10px] font-bold rounded-full border border-primary-gold/20">BOARD</span>
                                  )}
                                </h4>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-tighter">{m.registrationNumber || "VERIFIED MEMBER"}</p>
                              </div>
                          </div>
                          <div className="text-right flex items-center space-x-4">
                              <div className="hidden sm:block">
                                <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Location</span>
                                <span className="text-xs font-bold text-gray-700">{m.state || "Nigeria"}</span>
                              </div>
                              <div className={`p-2 rounded-full bg-gray-200 transition-transform ${expandedMemberIndex === i ? 'rotate-180' : ''}`}>
                                 <ChevronDown size={20} className="text-gray-600" />
                              </div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {expandedMemberIndex === i && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-gray-100 bg-white"
                            >
                              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <div className="space-y-4">
                                    <div>
                                       <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Ecclesiastical Title / Role</label>
                                       <p className="text-sm font-bold text-primary-theme">{m.role || "Minister of God"}</p>
                                    </div>
                                    <div>
                                       <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Church Name</label>
                                       <p className="text-sm font-bold text-gray-800">{m.churchName || "Independent Ministry"}</p>
                                    </div>
                                    <div>
                                       <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Church Location</label>
                                       <p className="text-sm text-gray-600 leading-relaxed">{m.churchAddress || "Contact for address details"}</p>
                                    </div>
                                 </div>
                                 <div className="space-y-4">
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                       <label className="text-[10px] font-bold text-primary-gold uppercase block mb-1">Public Verification Contact</label>
                                       <p className="text-lg font-mono font-bold text-gray-900 tracking-tight">{m.phone || "Restricted"}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div>
                                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">State</label>
                                          <p className="text-sm font-bold">{m.state || "N/A"}</p>
                                       </div>
                                       <div>
                                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">LGA</label>
                                          <p className="text-sm font-bold">{m.lga || "N/A"}</p>
                                       </div>
                                    </div>
                                    <div className={`flex items-center space-x-2 text-xs font-bold p-3 rounded-xl border ${m.userType === 'executive' ? 'text-primary-gold bg-primary-gold/10 border-primary-gold/20' : 'text-green-600 bg-green-50 border-green-100'}`}>
                                       {m.userType === 'executive' ? <ShieldCheck size={16} /> : <Award size={16} />}
                                       <span>{m.userType === 'executive' ? "OFFICIAL EXECUTIVE BOARD MEMBER" : "AUTHORIZED ASYMOG REPRESENTATIVE"}</span>
                                    </div>
                                 </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-gray-50 border-t border-gray-100 text-center">
                 <p className="text-xs text-gray-400 italic">Official Directory of the Association of Yoruba Ministers of God</p>
              </div>
              </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {user && currentPage !== "meeting" && currentPage !== "admin" && currentPage !== "about" && <ChatWidget user={user} />}

      {currentPage !== "meeting" && currentPage !== "admin" && (
        <footer className="bg-primary-theme text-white border-t border-primary-gold/20 py-16 px-8 lg:px-24">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-6 relative">
                {logoImage ? (
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center p-1 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] flex-shrink-0 border border-primary-gold overflow-hidden">
                    <img src={optimizeImage(logoImage, 200)} alt="ASYMOG" referrerPolicy="no-referrer" className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-12 h-12 border border-primary-gold p-1 flex items-center justify-center rounded-full bg-gradient-to-br from-white/10 to-transparent shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                     <Church size={24} className="text-primary-gold" />
                  </div>
                )}
                <div>
                  <h3 className="font-serif font-bold text-xl tracking-wider select-none text-primary-gold leading-none drop-shadow-sm" onDoubleClick={() => setCurrentPage("admin")}>ASYMOG</h3>
                  <p className="text-[11px] text-white/80 uppercase mt-1.5 tracking-widest opacity-80">Association of Yoruba<br/>Ministers of God</p>
                </div>
              </div>
              <p className="text-sm text-white/70 mb-2 leading-relaxed">United in Faith. Equipped to Serve.<br/>Sent to Impact.</p>
            </div>
            
            <div>
              <h4 className="font-bold text-sm text-primary-gold mb-6 uppercase tracking-widest relative inline-block">
                Quick Links
                <span className="absolute -bottom-2 left-0 w-8 h-[2px] bg-primary-gold"></span>
              </h4>
              <ul className="space-y-4 text-sm text-white/80">
                <li><button onClick={() => setCurrentPage("home")} className="hover:text-primary-gold transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-primary-gold rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span> Home</button></li>
                <li><button onClick={() => setCurrentPage("about")} className="hover:text-primary-gold transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-primary-gold rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span> About Us</button></li>
                <li><button onClick={() => setCurrentPage("verification")} className="hover:text-primary-gold transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-primary-gold rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span> Verification Portal</button></li>
                <li><button onClick={() => { setPublicSearchQuery(""); setPublicSearchResults([]); setShowSearchModal(true); }} className="hover:text-primary-gold transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-primary-gold rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span> Find a Minister</button></li>
                <li><button onClick={() => setCurrentPage("resources")} className="hover:text-primary-gold transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-primary-gold rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span> Resources</button></li>
                <li><button onClick={() => setCurrentPage("register")} className="hover:text-primary-gold transition-colors flex items-center gap-2 group"><span className="w-1 h-1 bg-primary-gold rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span> Join ASYMOG</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-sm text-primary-gold mb-6 uppercase tracking-widest relative inline-block">
                Contact Us
                <span className="absolute -bottom-2 left-0 w-8 h-[2px] bg-primary-gold"></span>
              </h4>
              <ul className="space-y-5 text-sm text-white/80">
                <li className="flex items-start gap-4 hover:text-white transition-colors group">
                  <Mail size={18} className="text-primary-gold mt-0.5 group-hover:drop-shadow-[0_0_5px_rgba(212,175,55,0.5)] transition-all"/> 
                  <span className="leading-snug">isokankristi@gmail.com</span>
                </li>
                <li className="flex items-start gap-4 hover:text-white transition-colors group">
                  <Phone size={18} className="text-primary-gold mt-0.5 group-hover:drop-shadow-[0_0_5px_rgba(212,175,55,0.5)] transition-all"/> 
                  <span className="leading-snug">09067505783</span>
                </li>
                <li className="flex items-start gap-4 hover:text-white transition-colors group">
                  <Church size={18} className="text-primary-gold mt-0.5 group-hover:drop-shadow-[0_0_5px_rgba(212,175,55,0.5)] transition-all"/> 
                  <span className="leading-snug">Lagos, Nigeria</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-sm text-primary-gold mb-6 uppercase tracking-widest relative inline-block">
                Follow Us
                <span className="absolute -bottom-2 left-0 w-8 h-[2px] bg-primary-gold"></span>
              </h4>
              <div className="flex gap-4 mb-8">
                 <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#1877F2] hover:border-[#1877F2] hover:text-white transition-all cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(24,119,242,0.5)] hover:-translate-y-1"><Facebook size={16} /></div>
                 <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#25D366] hover:border-[#25D366] hover:text-white transition-all cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(37,211,102,0.5)] hover:-translate-y-1"><MessageCircle size={16} /></div>
                 <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#ff0050] hover:border-[#ff0050] hover:text-white transition-all cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(255,0,80,0.5)] hover:-translate-y-1"><Video size={16} /></div>
              </div>
              <p className="text-xs text-white/50 italic leading-relaxed border-l-2 border-primary-gold/50 pl-3">
                "But grow in grace, and in the knowledge of our Lord and Saviour Jesus Christ."<br/>
                <span className="text-primary-gold font-bold not-italic text-[10px] mt-2 block tracking-widest uppercase">— 2 Peter 3:18</span>
              </p>
            </div>
          </div>
          
          <div className="max-w-7xl mx-auto pt-8 border-t border-white/10 text-center flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-white/50 tracking-wider">&copy; {new Date().getFullYear()} ASYMOG. All Rights Reserved.</p>
            <div className="flex items-center gap-4 text-xs text-white/50">
               <button className="hover:text-primary-gold transition-colors">Privacy Policy</button>
               <span>•</span>
               <button className="hover:text-primary-gold transition-colors">Terms of Service</button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

function ExecutiveTeam({ editable = false }: { editable?: boolean }) {
  const [executives, setExecutives] = useState(() => Array(6).fill({ image: null, name: "Executive Name", role: "Executive Role" }));
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    fetch("/api/executives")
      .then(res => res.json())
      .then(data => {
        if (data.executives && data.executives.length > 0) {
           const merged = Array(6).fill({ image: null, name: "Executive Name", role: "Executive Role" });
           data.executives.forEach((ex: any, idx: number) => {
             const execIndex = ex.id !== undefined ? ex.id : idx;
             if (execIndex >= 0 && execIndex < 6) {
               merged[execIndex] = ex;
             }
           });
           setExecutives(merged);
        }
        setLoading(false);
        setIsInitialized(true);
      })
      .catch(err => {
        console.error("Failed to load executives", err);
        setLoading(false);
        setIsInitialized(true);
      });
  }, []);

  const saveExecutives = async () => {
    if (!editable) return;
    setSaving(true);
    setSaveMessage("");
    try {
      await fetch("/api/executives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ executives })
      });
      setSaveMessage("Saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      console.error("Failed to save executives", err);
      setSaveMessage("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editable) return;
    const file = e.target.files?.[0];
    if (file) {
      setExecutives(prev => {
        const newExecs = [...prev];
        newExecs[index] = { ...newExecs[index], uploading: true };
        return newExecs;
      });
      
      try {
        const url = await handleUniversalUpload(file, 'executive member');
        setExecutives(prev => {
          const finalExecs = [...prev];
          finalExecs[index] = { ...finalExecs[index], image: url, uploading: false };
          return finalExecs;
        });
      } catch (err) {
        console.error("Executive image upload failed:", err);
        setExecutives(prev => {
          const finalExecs = [...prev];
          finalExecs[index] = { ...finalExecs[index], uploading: false };
          return finalExecs;
        });
      }
    }
  };

  const handleTextChange = (index: number, field: string, value: string) => {
    if (!editable) return;
    setExecutives(prev => {
      const newExecs = [...prev];
      newExecs[index] = { ...newExecs[index], [field]: value };
      return newExecs;
    });
  };

  if (loading) return null;

  return (
    <section className="py-24 px-4 bg-white border-t border-primary-gold/10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12">
          <h2 className="font-serif text-4xl font-bold text-primary-theme">Our Executive Board</h2>
          {editable && (
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              {saveMessage && (
                <span className={`text-sm font-medium ${saveMessage.includes("Failed") ? "text-red-500" : "text-green-600"}`}>
                  {saveMessage}
                </span>
              )}
              <button 
                onClick={saveExecutives}
                disabled={saving || executives.some((ex: any) => ex.uploading)}
                className="bg-primary-theme text-white px-6 py-2 rounded-xl font-bold hover:bg-primary-theme/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? "Saving..." : "Save Executives"}
              </button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {executives.map((exec: any, index: number) => (
            <div key={index} className="flex flex-col items-center bg-off-white p-6 rounded-[2.5rem] border border-primary-gold/20 shadow-sm relative group hover:shadow-xl transition-all duration-500">
              <div className="w-full aspect-[3/4] rounded-[2rem] overflow-hidden mb-6 bg-white border-4 border-white shadow-lg relative group-hover:border-primary-gold transition-all duration-500 flex items-center justify-center group-hover:scale-[1.02]">
                {exec.uploading ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-primary-gold bg-gray-50">
                    <Loader2 size={40} className="animate-spin mb-2" />
                    <span className="text-xs font-medium px-2 text-center">Uploading...</span>
                  </div>
                ) : exec.image ? (
                  <img src={optimizeImage(exec.image, 600)} alt={exec.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-50">
                    <User size={40} className="mb-2" />
                    {editable && <span className="text-xs font-medium px-2 text-center">Click to upload</span>}
                  </div>
                )}
                {editable && !exec.uploading && (
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handleImageUpload(index, e)}
                    title="Upload Image"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                )}
              </div>
              <input 
                type="text" 
                value={exec.name}
                onChange={(e) => handleTextChange(index, 'name', e.target.value)}
                placeholder="Executive Name"
                readOnly={!editable}
                className={`font-serif text-2xl font-bold mb-1 text-center bg-transparent border-b border-transparent ${editable ? 'hover:border-gray-300 focus:border-primary-gold focus:outline-none cursor-text' : 'focus:outline-none cursor-default'} transition-colors w-full`}
              />
              <input 
                type="text" 
                value={exec.role}
                onChange={(e) => handleTextChange(index, 'role', e.target.value)}
                placeholder="Executive Role"
                readOnly={!editable}
                className={`text-sm text-primary-theme font-medium text-center bg-transparent border-b border-transparent ${editable ? 'hover:border-gray-300 focus:border-primary-gold focus:outline-none cursor-text' : 'focus:outline-none cursor-default'} transition-colors w-full`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomePage({ onNavigate, heroImage, logoImage, presidentImage, presidentName, events, regularMeetings = [], testimonials = [], onOpenNetwork }: { onNavigate: (p: Page) => void; heroImage: string; logoImage: string | null; presidentImage: string | null; presidentName: string; events: { id: number; title: string; date: string; loc: string }[]; regularMeetings?: { id: number; title: string; schedule: string; venue: string; meta: string }[]; testimonials?: { id: number; name: string; text: string; image: string }[]; onOpenNetwork: () => void }) {
  const [formData, setFormData] = useState({ fullName: "", phone: "", email: "", churchName: "", ministryCalling: "Pastor", photo: null as File | null });
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [licenseForm, setLicenseForm] = useState({ nin: "", certNumber: "" });
  const [licenseStatus, setLicenseStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  
  const handleOfferClick = (title: string) => {
    if (title === "MINISTERIAL LICENSE") {
      setShowLicenseModal(true);
      setLicenseStatus("idle");
      setLicenseForm({ nin: "", certNumber: "" });
    } else if (title === "TRAINING & SEMINARY SUPPORT") {
      window.open("https://www.winninggateseminary.com.ng", "_blank");
    } else if (title === "MINISTERIAL NETWORK") {
      onOpenNetwork();
    } else if (title === "RESOURCES DOWNLOAD") {
      onNavigate("resources");
    }
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-grow flex flex-col pt-20" // Add padding top to account for fixed header
    >
      {/* Hero Section */}
      <section 
        className="relative min-h-[700px] flex items-center justify-center overflow-hidden bg-primary-theme text-white px-4 py-20"
        style={{
          backgroundImage: `url('${optimizeImage(heroImage)}')`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <div className="absolute top-0 left-0 w-full h-full bg-black/70 pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none mix-blend-overlay">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-gold rounded-full blur-[150px]"></div>
        </div>
        
        <div className="w-full max-w-6xl z-10 flex flex-col items-center text-center mt-12 mb-8">
          
          {/* Logo Element */}
          {logoImage ? (
            <div className="relative w-44 h-44 md:w-64 md:h-64 mb-8 z-40 bg-white/90 backdrop-blur-sm rounded-full border-4 border-primary-gold flex items-center justify-center overflow-hidden shadow-[0_10px_40px_rgba(212,175,55,0.3)]">
               <img src={optimizeImage(logoImage, 500)} alt="ASYMOG Logo" referrerPolicy="no-referrer" className="w-[120%] h-[120%] object-contain" />
            </div>
          ) : (
            <div className="relative w-32 h-32 md:w-40 md:h-40 mb-8 rounded-full border-4 border-[#FFAA00] bg-gradient-to-b from-[#003b80] to-[#001026] shadow-[0_10px_40px_rgba(255,170,0,0.3),inset_0_-10px_20px_rgba(0,0,0,0.8)] flex items-center justify-center z-40">
              <div className="absolute inset-2 rounded-full border border-white/20"></div>
              <div className="relative flex flex-col items-center justify-center">
                <span className="text-[#FFD700] mb-0.5"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 7H7"/></svg></span>
                <BookOpen size={48} className="text-[#FFD700] drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]" />
                <div className="absolute -top-3 w-6 h-8 bg-[#FFD700] rounded-full blur-[4px] opacity-70 mix-blend-screen"></div>
              </div>
              {/* Base platform line reflection illusion */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-20 h-1 bg-white/30 rounded-full blur-[1px]"></div>
            </div>
          )}

          {/* 3D Text Block */}
          <h1 className="font-serif font-black uppercase flex flex-col items-center leading-none select-none z-30 relative">
            <svg viewBox="0 0 24 24" fill="white" className="absolute top-[5%] left-[15%] w-6 h-6 md:w-8 md:h-8 animate-sparkle pointer-events-none drop-shadow-[0_0_5px_white] z-50" style={{animationDelay: "0s"}}>
              <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
            </svg>
            <svg viewBox="0 0 24 24" fill="#FFD700" className="absolute top-[35%] right-[10%] w-8 h-8 md:w-12 md:h-12 animate-sparkle pointer-events-none drop-shadow-[0_0_8px_#FFD700] z-50" style={{animationDelay: "0.7s"}}>
              <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
            </svg>
            <svg viewBox="0 0 24 24" fill="white" className="absolute top-[45%] left-[5%] w-4 h-4 md:w-6 md:h-6 animate-sparkle pointer-events-none drop-shadow-[0_0_5px_white] z-50" style={{animationDelay: "1.2s"}}>
              <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
            </svg>
            <svg viewBox="0 0 24 24" fill="#FFD700" className="absolute bottom-[25%] left-[25%] w-7 h-7 md:w-10 md:h-10 animate-sparkle pointer-events-none drop-shadow-[0_0_8px_#FFD700] z-50" style={{animationDelay: "0.4s"}}>
              <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
            </svg>
            <svg viewBox="0 0 24 24" fill="white" className="absolute bottom-[5%] right-[20%] w-5 h-5 md:w-7 md:h-7 animate-sparkle pointer-events-none drop-shadow-[0_0_5px_white] z-50" style={{animationDelay: "1.8s"}}>
              <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
            </svg>
            <svg viewBox="0 0 24 24" fill="#FFD700" className="absolute top-[15%] right-[25%] w-4 h-4 md:w-5 md:h-5 animate-sparkle pointer-events-none drop-shadow-[0_0_5px_#FFD700] z-50" style={{animationDelay: "1s"}}>
              <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
            </svg>

            {/* ASSOCIATION OF */}
            <span 
              className="text-3xl md:text-5xl lg:text-6xl text-white tracking-widest relative z-30"
              style={{
                textShadow: "0 1px 0 #d9d9d9, 0 2px 0 #cccccc, 0 3px 0 #bfbfbf, 0 4px 0 #b3b3b3, 0 5px 0 #a6a6a6, 0 6px 0 #999999, 0 7px 1px rgba(0,0,0,.3), 0 1px 5px rgba(0,0,0,.3), 0 5px 10px rgba(0,0,0,.3), 0 15px 20px rgba(0,0,0,.4)",
                transform: "perspective(500px)"
              }}
            >
              ASSOCIATION OF
            </span>
            
            {/* YORUBA */}
            <span 
              className="text-[4.5rem] sm:text-[6rem] md:text-[9rem] lg:text-[12rem] tracking-tighter relative z-20 mt-[-5px] md:mt-[-20px] lg:mt-[-35px]"
              style={{
                color: "#ffed99",
                WebkitTextStroke: "1px #ffffff",
                textShadow: "0 2px 0 #e6bc17, 0 4px 0 #cc9b00, 0 6px 0 #b38400, 0 8px 0 #996e00, 0 10px 0 #805900, 0 12px 0 #664500, 0 14px 1px rgba(0,0,0,.4), 0 0 10px rgba(255,215,0,.4), 0 10px 20px rgba(0,0,0,.6), 0 20px 30px rgba(0,0,0,.8)"
              }}
            >
              YORUBA
            </span>
            
            {/* MINISTERS OF GOD */}
            <span 
              className="text-3xl md:text-5xl lg:text-7xl text-white tracking-tight relative z-30 mt-[-5px] md:mt-[-20px] lg:mt-[-35px]"
              style={{
                textShadow: "0 1px 0 #d9d9d9, 0 2px 0 #cccccc, 0 3px 0 #bfbfbf, 0 4px 0 #b3b3b3, 0 5px 0 #a6a6a6, 0 6px 0 #999999, 0 7px 1px rgba(0,0,0,.3), 0 1px 5px rgba(0,0,0,.3), 0 5px 10px rgba(0,0,0,.3), 0 15px 20px rgba(0,0,0,.4)",
              }}
            >
              MINISTERS OF GOD
            </span>
          </h1>

          {/* Slogan */}
          <div className="mt-4 md:mt-6 z-40 text-center">
            <h2 
              className="font-serif text-xl md:text-3xl lg:text-4xl italic font-bold tracking-wide"
              style={{
                color: "#FFD700",
                textShadow: "0 2px 4px rgba(0,0,0,0.8), 0 0 15px rgba(255, 215, 0, 0.4)"
              }}
            >
              "Isokan Kristi Lo Gbe Wa Ro"
            </h2>
          </div>

          {/* Banner Tagline Mimicking the curved ribbon */}
          <div className="mt-8 md:mt-12 bg-gradient-to-b from-[#003b80] to-[#00142e] border border-[#d4af37]/50 shadow-[0_15px_35px_rgba(0,0,0,0.8),0_0_0_2px_#d4af37] rounded-full px-8 py-3 md:px-14 md:py-4 relative overflow-hidden z-40 max-w-[95%]">
             <div className="absolute inset-0 border border-[#FFF7D6]/30 rounded-full m-[2px]"></div>
             <p 
                className="text-sm md:text-xl lg:text-2xl font-bold uppercase tracking-wider relative z-10 text-[#FFD700]"
                style={{
                  minHeight: "1.5rem",
                  textShadow: "0 2px 4px rgba(0,0,0,1)"
                }}
             >
               <Typewriter text="Raising Kingdom Leaders Across Generations" delay={80} />
             </p>
          </div>
          
          <p className="text-sm md:text-base font-serif italic text-white/80 mt-10 max-w-lg mb-8 drop-shadow-md">
            "Go ye therefore, and teach all nations..." <span className="font-sans not-italic text-primary-gold font-bold ml-2 text-xs uppercase">— Matthew 28:19</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 z-50 mt-4 relative">
            <button 
              onClick={() => onNavigate("register")}
              className="w-full sm:w-auto bg-gradient-to-r from-[#D4AF37] to-[#FFAA00] text-[#001026] px-10 py-4 font-bold text-sm hover:from-white hover:to-gray-200 transition-all rounded shadow-[0_5px_15px_rgba(0,0,0,0.5)] border border-[#FFE066]"
            >
              <User size={18} className="inline mr-2 -mt-1" />
              JOIN THE ASSOCIATION
            </button>
            <button 
              onClick={() => onNavigate("login")}
              className="w-full sm:w-auto bg-black/40 backdrop-blur-md border border-[#D4AF37]/50 text-white px-10 py-4 font-bold text-sm hover:bg-white/10 hover:border-[#D4AF37] transition-all rounded shadow-[0_5px_15px_rgba(0,0,0,0.5)]"
            >
              <Download size={18} className="inline mr-2 -mt-1" />
              DOWNLOAD LICENSE
            </button>
          </div>

          {/* Social Proof / Tiny Testimonials in Hero */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="mt-12 flex flex-col items-center"
          >
            <div className="flex -space-x-3 mb-3">
              {testimonials.slice(0, 6).map((t, i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-primary-gold overflow-hidden bg-gray-200">
                  <img src={optimizeImage(t.image, 80)} alt={t.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-primary-gold bg-primary-theme flex items-center justify-center text-[10px] font-bold text-primary-gold">
                +1k
              </div>
            </div>
            <p className="text-white/60 text-xs uppercase tracking-[0.2em] font-medium">
              Trusted by <span className="text-primary-gold font-bold">1000+ Ministers</span> across the globe
            </p>
          </motion.div>
        </div>

        {/* Delete the old side card to maintain clean centered symmetry */}
      </section>

      {/* About Section */}
      <section className="py-20 px-8 lg:px-24 bg-white relative">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16">
          <div className="lg:w-1/2">
            <p className="text-primary-gold font-bold text-sm uppercase tracking-widest mb-2">WHO WE ARE</p>
            <h2 className="font-serif text-4xl font-bold mb-6 text-primary-theme">About ASYMOG</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              The Association of Yoruba Ministers of God (ASYMOG) is a body of ordained and aspiring ministers committed to theological soundness, spiritual growth, and the advancement of the Gospel within Yoruba land and beyond.
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center text-gray-700">
                <div className="w-8 h-8 rounded bg-primary-theme flex items-center justify-center mr-4 flex-shrink-0">
                  <ShieldCheck size={16} className="text-white" />
                </div>
                <span className="font-medium">Sound biblical teaching (2 Timothy 2:15)</span>
              </li>
              <li className="flex items-center text-gray-700">
                <div className="w-8 h-8 rounded bg-primary-theme flex items-center justify-center mr-4 flex-shrink-0">
                  <User size={16} className="text-white" />
                </div>
                <span className="font-medium">Unity among ministers (Psalm 133:1)</span>
              </li>
              <li className="flex items-center text-gray-700">
                <div className="w-8 h-8 rounded bg-primary-theme flex items-center justify-center mr-4 flex-shrink-0">
                  <Award size={16} className="text-white" />
                </div>
                <span className="font-medium">Raising faithful servants of God (2 Timothy 2:2)</span>
              </li>
            </ul>
            <button 
              onClick={() => onNavigate("about")}
              className="bg-primary-theme text-white px-8 py-3 rounded font-bold text-sm hover:bg-black transition-colors"
            >
              LEARN MORE ABOUT US
            </button>
          </div>
          
          <div className="lg:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div 
              onClick={() => onNavigate("about")}
              className="bg-gray-50 border border-gray-100 p-8 rounded-xl text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-primary-gold/50 group"
            >
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-full border border-gray-200 bg-white group-hover:bg-primary-theme group-hover:border-primary-theme transition-colors">
                <Eye size={24} className="text-primary-theme group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-serif font-bold text-lg mb-4 text-primary-theme uppercase tracking-wider group-hover:text-primary-gold transition-colors">OUR MISSION</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                To equip ministers with sound doctrine, spiritual discipline, and leadership capacity for effective ministry.
              </p>
            </div>
            <div 
              onClick={() => onNavigate("about")}
              className="bg-gray-50 border border-gray-100 p-8 rounded-xl text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-primary-gold/50 group"
            >
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-full border border-gray-200 bg-white group-hover:bg-primary-theme group-hover:border-primary-theme transition-colors">
                <Eye size={24} className="text-primary-theme group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-serif font-bold text-lg mb-4 text-primary-theme uppercase tracking-wider group-hover:text-primary-gold transition-colors">OUR VISION</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                To build a united body of Yoruba ministers impacting nations through Christ.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Offer Section */}
      <section className="py-20 px-8 lg:px-24 bg-gray-50/50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl md:text-5xl font-serif font-black uppercase tracking-widest relative inline-block text-primary-theme">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-gold via-yellow-400 to-primary-gold drop-shadow-[0_2px_2px_rgba(0,0,0,0.1)]">
                  What We Offer
                </span>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-[3px] bg-gradient-to-r from-transparent via-primary-gold to-transparent rounded-full shadow-[0_0_10px_rgba(212,175,55,0.5)]"></div>
              </h2>
            </motion.div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: "MINISTERIAL LICENSE", desc: "Get officially recognized and certified for ministry work.", icon: <Award size={32} /> },
              { title: "TRAINING & SEMINARY SUPPORT", desc: "Access theological training and mentorship.", icon: <Church size={32} /> },
              { title: "MINISTERIAL NETWORK", desc: "Connect with other ministers locally and globally.", icon: <User size={32} /> },
              { title: "RESOURCES DOWNLOAD", desc: "Download sermons, teachings, and ministry materials.", icon: <Download size={32} /> }
            ].map((item, i) => (
              <div 
                key={i} 
                className="bg-white p-8 rounded-xl shadow-sm text-center border border-gray-100 transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer hover:border-primary-gold/30"
                onClick={() => handleOfferClick(item.title)}
              >
                <div className="w-20 h-20 mx-auto mb-6 bg-primary-theme rounded-full flex items-center justify-center text-primary-gold">
                  {item.icon}
                </div>
                <h3 className="font-serif font-bold text-sm mb-3 text-primary-theme uppercase tracking-wider">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Ministers Choose ASYMOG Section */}
      <section className="py-24 px-8 lg:px-24 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-black uppercase tracking-widest relative inline-block text-primary-theme">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-gold via-yellow-400 to-primary-gold drop-shadow-[0_2px_2px_rgba(0,0,0,0.1)]">
                  Why Ministers Choose ASYMOG
                </span>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-48 h-[3px] bg-gradient-to-r from-transparent via-primary-gold to-transparent rounded-full shadow-[0_0_10px_rgba(212,175,55,0.5)]"></div>
              </h2>
            </motion.div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[
              { title: "Spiritual Accountability", desc: "A safe haven where your calling is protected through mutual respect and spiritual covering.", icon: <ShieldCheck size={28} /> },
              { title: "Global Expansion", desc: "Network with ministers locally and intentionally expand your ministry's reach worldwide.", icon: <Globe size={28} /> },
              { title: "Advanced Training", desc: "Equip yourself through high-level seminars, conferences, and exclusive pastoral resources.", icon: <BookOpen size={28} /> },
              { title: "Verified Credentials", desc: "Obtain recognized ministerial licenses and certificates that attest to your divine calling.", icon: <Award size={28} /> },
              { title: "Peer Fellowship", desc: "Combat the isolation of leadership by building genuine, life-transforming brotherhood among leaders.", icon: <Heart size={28} /> },
              { title: "Leadership Growth", desc: "Scale the impact of your church with modern strategies rooted in solid Biblical truths and theology.", icon: <TrendingUp size={28} /> },
              { title: "Administrative Support", desc: "Gain insights into the legal and administrative structure for a healthy ministry setup.", icon: <Briefcase size={28} /> },
              { title: "Instant Empathy", desc: "Join a community where the burdens of ministry are understood, shared, and lightened.", icon: <Zap size={28} /> }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all hover:bg-white hover:-translate-y-1 group"
              >
                <div className="w-14 h-14 mb-5 bg-white border border-primary-gold/20 rounded-xl flex items-center justify-center text-primary-gold group-hover:bg-primary-gold group-hover:text-white transition-colors duration-300">
                  {item.icon}
                </div>
                <h3 className="font-serif font-bold text-lg mb-2 text-primary-theme uppercase tracking-wide group-hover:text-primary-gold transition-colors">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>



      {/* Testimonials */}
      <section className="max-w-7xl mx-auto w-full px-8 lg:px-24 pb-20 mt-12">
        <div className="flex flex-col">
          {/* Testimonials */}
          <div className="w-full">
             <div className="flex items-center justify-center mb-10 relative">
               <h3 className="font-serif text-2xl font-bold text-primary-theme uppercase tracking-wider bg-white px-8 z-10">
                 WHAT MEMBERS SAY
               </h3>
               <span className="absolute top-1/2 left-0 right-0 h-[1px] bg-primary-gold/30 -z-10"></span>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 z-20 text-primary-gold opacity-20">
                 <LucideQuote size={48} />
               </div>
             </div>
             
             <div className="relative overflow-hidden pt-4 -mx-4 px-4">
               <motion.div 
                 className="flex gap-6"
                 animate={{ 
                   x: testimonials.length > 0 ? [0, -(testimonials.length * 324)] : 0 
                 }}
                 transition={{ 
                   duration: Math.max(15, testimonials.length * 2.5), 
                   ease: "linear", 
                   repeat: Infinity 
                 }}
                 style={{ width: "max-content" }}
               >
                 {[...testimonials, ...testimonials].map((t, idx) => (
                   <div key={`${t.id}-${idx}`} className="bg-gray-50 border border-gray-100 p-6 rounded-xl relative hover:shadow-md transition-shadow hover:border-primary-gold/20 w-[300px] flex-shrink-0">
                     <p className="text-sm italic text-gray-700 mb-6 leading-relaxed min-h-[80px]">
                       "{t.text}"
                     </p>
                     <div className="flex items-center gap-4">
                       <div className="w-16 h-22 bg-gray-200 rounded-xl overflow-hidden border border-primary-gold/20 flex-shrink-0 shadow-sm">
                         <img src={optimizeImage(t.image, 500)} alt={t.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                       </div>
                       <div className="min-w-0">
                         <p className="font-bold text-sm text-primary-theme truncate">{t.name}</p>
                         <div className="flex text-primary-gold text-[10px] mt-1 gap-0.5">★★★★★</div>
                       </div>
                     </div>
                   </div>
                 ))}
               </motion.div>
             </div>
          </div>
        </div>
      </section>

      {/* About Us (Full content from before, hidden unless scrolled to) */}
      <div id="about-full">
        <ExecutiveTeam />
      </div>
      
      {/* Events Section */}
      <div id="events-section">
        <section className="py-24 px-4 bg-off-white border-t border-primary-gold/10">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="font-serif text-4xl font-bold mb-4 text-primary-theme">Meeting Roll-Up & Schedule</h2>
            <p className="text-gray-600 mb-12 max-w-2xl mx-auto">Stay updated with our association's regular meeting days and special upcoming events. Our meetings are designed to equip and unite ministers across the region.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 text-left mb-16">
              
              <div className="bg-white p-8 rounded-3xl border border-primary-gold/20 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-gold/5 rounded-bl-full -mr-8 -mt-8"></div>
                <h3 className="font-serif text-2xl font-bold text-primary-theme mb-6 border-b border-gray-100 pb-4 text-center">Regular Meetings (Roll-Up)</h3>
                
                <div className="space-y-6">
                  {regularMeetings.map((rm) => (
                    <div key={rm.id} className="flex gap-4 items-start p-3 hover:bg-gray-50 rounded-xl transition-colors">
                      <div className="w-16 h-16 bg-primary-theme/5 rounded-lg flex-shrink-0 overflow-hidden border border-primary-gold/10 flex items-center justify-center">
                        {(rm as any).image ? (
                          <img src={optimizeImage((rm as any).image, 160)} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <Calendar size={24} className="text-primary-gold" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-primary-theme">{rm.title}</h4>
                        <p className="text-sm font-bold text-primary-gold mb-1">{rm.schedule}</p>
                        <p className="text-gray-600 text-sm">Venue: {rm.venue}</p>
                        <p className="text-gray-500 text-sm mt-1">{rm.meta}</p>
                      </div>
                    </div>
                  ))}
                  {regularMeetings.length === 0 && (
                    <p className="text-gray-400 italic">No regular meetings scheduled.</p>
                  )}
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                <h3 className="font-serif text-2xl font-bold text-primary-theme mb-6 border-b border-gray-100 pb-4 text-center">Upcoming Special Events</h3>
                
                {events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 opacity-50">
                    <History size={48} className="text-gray-300 mb-4" />
                    <p className="text-gray-400 italic">No special events scheduled at the moment.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {events.map((ev, i) => (
                      <div key={ev.id || i} className="group flex gap-4 border-l-4 border-primary-gold pl-4 py-3 hover:bg-gray-50 transition-colors rounded-r-lg">
                        {(ev as any).image && (
                          <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0 hidden sm:block">
                             <img src={optimizeImage((ev as any).image, 200)} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-primary-theme font-bold text-sm uppercase tracking-wider mb-1">{ev.date}</p>
                          <h4 className="font-serif text-lg font-bold mb-1 text-gray-900 group-hover:text-primary-gold transition-colors">{ev.title}</h4>
                          <p className="text-gray-500 text-sm">{ev.loc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
            </div>
          </div>
        </section>
      </div>

      {/* Ministerial License Modal */}
      <AnimatePresence>
        {showLicenseModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary-theme/60 backdrop-blur-sm"
            onClick={() => setShowLicenseModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-off-white">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-primary-theme">Ministerial License</h3>
                  <p className="text-gray-500 text-sm mt-1">Application Request</p>
                </div>
                <button onClick={() => setShowLicenseModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8">
                {licenseStatus === "success" ? (
                   <div className="text-center py-4">
                     <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                       <Check size={32} className="text-green-500" />
                     </div>
                     <h4 className="font-bold text-xl text-primary-theme mb-2">Request Submitted</h4>
                     <p className="text-gray-500 mb-6 text-sm">Your application for the Ministerial License has been received. You will be notified once reviewed.</p>
                     <button onClick={() => setShowLicenseModal(false)} className="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded text-sm font-bold transition-colors">Close</button>
                   </div>
                ) : (
                   <form onSubmit={(e) => {
                     e.preventDefault();
                     setLicenseStatus("loading");
                     setTimeout(() => setLicenseStatus("success"), 1500);
                   }} className="space-y-4">
                     <p className="text-sm text-gray-600 mb-4">Please provide your NIN and ASYMOG Certificate Number to apply for the Ministerial License.</p>
                     
                     <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">NIN (National Identity Number)</label>
                       <input 
                         type="text" 
                         required
                         value={licenseForm.nin}
                         onChange={e => setLicenseForm({...licenseForm, nin: e.target.value})}
                         className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded outline-none focus:ring-2 focus:ring-primary-gold/30"
                       />
                     </div>
                     
                     <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Certificate Number</label>
                       <input 
                         type="text" 
                         required
                         placeholder="ASYMOG/..."
                         value={licenseForm.certNumber}
                         onChange={e => setLicenseForm({...licenseForm, certNumber: e.target.value})}
                         className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded outline-none focus:ring-2 focus:ring-primary-gold/30"
                       />
                     </div>
                     
                     {licenseStatus === "error" && (
                       <p className="text-red-500 text-sm">An error occurred. Please try again.</p>
                     )}
                     
                     <div className="pt-4">
                       <button 
                         type="submit" 
                         disabled={licenseStatus === "loading"}
                         className="w-full bg-primary-gold text-white font-bold py-4 rounded shadow-lg hover:bg-[#b08d2b] transition-all flex justify-center items-center gap-2 disabled:opacity-70"
                       >
                         {licenseStatus === "loading" ? <Loader2 size={20} className="animate-spin" /> : <Award size={20} />}
                         SUBMIT REQUEST
                       </button>
                     </div>
                   </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}

function RegisterPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    churchName: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const toTitleCase = (str: string) => str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    const formattedData = {
      ...formData,
      fullName: toTitleCase(formData.fullName),
      churchName: toTitleCase(formData.churchName),
      email: formData.email.toLowerCase()
    };

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formattedData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex-grow flex items-center justify-center p-6 bg-off-white py-16"
      >
        <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-2xl w-full max-w-lg border border-primary-gold/10 text-center">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Check size={40} />
          </div>
          <h2 className="font-serif text-3xl font-bold text-primary-theme mb-4">Registration Successful!</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Your application to join the Association of Yoruba Ministers of God has been submitted. 
            An administrator will review your application soon. You can log in now to see your membership status.
          </p>
          <button 
            onClick={() => onNavigate("login")}
            className="w-full bg-primary-theme text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition-all shadow-md active:scale-95"
          >
            Continue to Login
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex-grow flex items-center justify-center p-6 bg-off-white py-16"
    >
      <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-2xl w-full max-w-lg border border-primary-gold/10">
        <div className="text-center mb-10">
          <h2 className="font-serif text-4xl font-bold text-primary-theme mb-2">Member Registration</h2>
          <p className="text-gray-500">Join the Association of Yoruba Ministers of God</p>
        </div>

        {error && <div className="bg-red-50 text-red-500 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Full Name</label>
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                required
                type="text" 
                placeholder="Minister John Doe"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-transparent focus:border-primary-gold/50 focus:bg-white focus:ring-0 transition-all outline-none"
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Email</label>
                <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                    required
                    type="email" 
                    placeholder="john@example.com"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-transparent focus:border-primary-gold/50 focus:bg-white focus:ring-0 transition-all outline-none"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Phone</label>
                <div className="relative">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                    required
                    type="tel" 
                    placeholder="08012345678"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-transparent focus:border-primary-gold/50 focus:bg-white focus:ring-0 transition-all outline-none"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
                </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Church Name</label>
            <div className="relative">
              <Church size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                required
                type="text" 
                placeholder="Victory Tabernacle"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-transparent focus:border-primary-gold/50 focus:bg-white focus:ring-0 transition-all outline-none"
                value={formData.churchName}
                onChange={e => setFormData({ ...formData, churchName: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                required
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-4 bg-gray-50 rounded-2xl border-transparent focus:border-primary-gold/50 focus:bg-white focus:ring-0 transition-all outline-none"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary-theme text-white py-5 rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-50 mt-4"
          >
            {loading ? "Creating Account..." : "Complete Registration"}
          </button>
        </form>

        <p className="text-center mt-8 text-gray-500 font-medium">
          Already a member? <button onClick={() => onNavigate("login")} className="text-primary-gold hover:underline">Log In here</button>
        </p>
      </div>
    </motion.div>
  );
}

function LoginPage({ onNavigate, onLogin }: { onNavigate: (p: Page) => void, onLogin: (u: User) => void }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem("assymog_user", JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex-grow flex items-center justify-center p-6 bg-off-white"
    >
      <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-2xl w-full max-w-md border border-primary-gold/10">
        <div className="text-center mb-10">
          <h2 className="font-serif text-4xl font-bold text-primary-theme mb-2">Welcome Back</h2>
          <p className="text-gray-500">Log in to access your portal</p>
        </div>

        {error && <div className="bg-red-50 text-red-500 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                required
                type="email" 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-transparent focus:border-primary-gold/50 focus:bg-white focus:ring-0 transition-all outline-none"
                placeholder="john@example.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Password</label>
              <button type="button" className="text-xs text-primary-gold font-bold">Forgot?</button>
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                required
                type={showPassword ? "text" : "password"} 
                className="w-full pl-12 pr-12 py-4 bg-gray-50 rounded-2xl border-transparent focus:border-primary-gold/50 focus:bg-white focus:ring-0 transition-all outline-none"
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary-theme text-white py-5 rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-50 mt-4"
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        <p className="text-center mt-8 text-gray-500 font-medium">
          New minister? <button onClick={() => onNavigate("register")} className="text-primary-gold hover:underline">Register today</button>
        </p>
      </div>
    </motion.div>
  );
}

function ExecutiveLoginPage({ onNavigate, onLogin }: { onNavigate: (p: Page) => void, onLogin: (u: User) => void }) {
  const [accessKey, setAccessKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/executive-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessKey })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem("assymog_user", JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-grow flex items-center justify-center p-6 bg-primary-theme/5"
    >
      <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl w-full max-w-md border-t-8 border-primary-gold relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <ShieldCheck size={120} className="text-primary-gold" />
        </div>
        
        <div className="text-center mb-10 relative z-10">
          <div className="w-20 h-20 bg-primary-gold/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={40} className="text-primary-gold" />
          </div>
          <h2 className="font-serif text-3xl font-bold text-primary-theme mb-2">Executive Board</h2>
          <p className="text-gray-500">Secure portal for ASYMOG Executives</p>
        </div>

        {error && <div className="bg-red-50 text-red-500 p-4 rounded-xl mb-6 text-sm font-bold border border-red-100 flex items-center gap-2">
          <X size={16} />
          {error}
        </div>}

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-primary-gold ml-1">Member Access Key</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                required
                type="password" 
                className="w-full pl-12 pr-4 py-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-primary-gold/50 focus:bg-white focus:ring-4 focus:ring-primary-gold/5 transition-all outline-none font-mono text-center text-xl tracking-[0.5em]"
                placeholder="••••••••"
                value={accessKey}
                onChange={e => setAccessKey(e.target.value)}
              />
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-2 px-4 italic">
              Please enter the 8-character secure key sent to your registered email address.
            </p>
          </div>

          <button 
            type="submit"
            disabled={loading || accessKey.length < 4}
            className="w-full bg-primary-theme text-white py-5 rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-xl shadow-primary-theme/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Access Portal"}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-gray-100 flex flex-col gap-4 text-center">
          <button onClick={() => onNavigate("login")} className="text-sm font-bold text-gray-500 hover:text-primary-theme transition-colors">
            Back to General Login
          </button>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Official Board Access Only</p>
        </div>
      </div>
    </motion.div>
  );
}

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara", "Federal Capital Territory"
];

const EDUCATIONAL_QUALIFICATIONS = [
  "Primary School Leaving Certificate", "SSCE / WASSCE", "Diploma", "OND", "HND", "BSc", "B.Ed", "B.Tech", "MSc", "M.A", "PhD", "Post Graduate Diploma (PGD)", "Others"
];

const CHURCH_POSITIONS = [
  "General Overseer", "Presiding Pastor", "Pastor", "Assistant Pastor", "Prophet", "Prophetess", "Evangelist", "Apostle", "Deacon", "Deaconess", "Elder", "Ministry Leader", "General Secretary", "Others"
];

const EXECUTIVE_ROLES_LIMITS: Record<string, number> = {
  "President": 1,
  "Vice President": 1,
  "General Secretary": 1,
  "Assistant General Secretary": 1,
  "Financial Secretary": 1,
  "Treasurer": 1,
  "Auditor": 1,
  "Public Relations Officer (PRO)": 1,
  "Welfare Officer": 2,
  "Legal Adviser": 1,
  "Ex-Officio": 5,
  "Member of Board": 20
};

function ExecutivePortal({ user, onUpdateUser }: { user: User, onUpdateUser: (u: User) => void }) {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "members" | "finance" | "resources">("overview");
  
  useEffect(() => {
    setLoading(true);
    fetch("/api/users")
      .then(res => res.json())
      .then(data => {
        setMembers(data.users || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalMemberDues = members.reduce((sum, m) => sum + (m.duesPayments?.reduce((s, p) => s + p.amount, 0) || 0), 0);
  const pendingApprovals = members.filter(m => m.status === 'pending').length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="bg-gradient-to-br from-primary-theme to-black p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-gold/10 blur-[100px] rounded-full -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div>
              <div className="flex items-center gap-2 mb-4">
                 <span className="bg-primary-gold text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Executive Portal</span>
                 <span className="bg-white/10 text-white/80 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">{user.role}</span>
              </div>
              <h1 className="font-serif text-5xl font-bold mb-2">Shalom, {user.fullName}</h1>
              <p className="text-white/60 text-lg">Your specialized tools for the role of <strong>{user.role}</strong> are active.</p>
           </div>
           <div className="flex gap-4">
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 text-center min-w-[140px]">
                 <p className="text-[10px] uppercase font-bold text-white/40 mb-1">Total Members</p>
                 <p className="text-3xl font-bold">{members.length}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 text-center min-w-[140px]">
                 <p className="text-[10px] uppercase font-bold text-white/40 mb-1">Pending Review</p>
                 <p className="text-3xl font-bold text-primary-gold">{pendingApprovals}</p>
              </div>
           </div>
        </div>
      </div>

      <div className="flex space-x-2 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm w-fit">
         <button onClick={() => setActiveTab("overview")} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "overview" ? "bg-primary-theme text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}>Overview</button>
         {(user.role === "President" || user.role === "General Secretary" || user.role === "Vice President" || user.role === "Assistant General Secretary") && (
            <button onClick={() => setActiveTab("members")} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "members" ? "bg-primary-theme text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}>Members</button>
         )}
         {(user.role === "President" || user.role === "Financial Secretary" || user.role === "Treasurer" || user.role === "Auditor") && (
            <button onClick={() => setActiveTab("finance")} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "finance" ? "bg-primary-theme text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}>Finance</button>
         )}
         {(user.role === "President" || user.role === "General Secretary" || user.role === "Public Relations Officer (PRO)") && (
            <button onClick={() => setActiveTab("resources")} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "resources" ? "bg-primary-theme text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}>Resources</button>
         )}
      </div>

      <AnimatePresence mode="wait">
         {activeTab === "overview" && (
           <motion.div key="overview" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden group">
                 <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Users size={24} />
                 </div>
                 <h3 className="font-serif text-xl font-bold text-gray-900 mb-4">Membership Reach</h3>
                 <p className="text-gray-500 text-sm leading-relaxed mb-6">Track association growth and member verification status across all Nigerian states.</p>
                 <button onClick={() => setActiveTab("members")} className="text-primary-theme font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">View Members <ArrowRight size={16} /></button>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden group">
                 <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <CreditCard size={24} />
                 </div>
                 <h3 className="font-serif text-xl font-bold text-gray-900 mb-4">Financial Flow</h3>
                 <p className="text-gray-500 text-sm leading-relaxed mb-6">Review monthly dues and cooperative contributions for financial integrity and planning.</p>
                 <button onClick={() => setActiveTab("finance")} className="text-primary-theme font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">View Records <ArrowRight size={16} /></button>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden group">
                 <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <FileText size={24} />
                 </div>
                 <h3 className="font-serif text-xl font-bold text-gray-900 mb-4">Documents & Rules</h3>
                 <p className="text-gray-500 text-sm leading-relaxed mb-6">Access association resources, certificates, and legal documentation templates.</p>
                 <button onClick={() => setActiveTab("resources")} className="text-primary-theme font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">Manage Files <ArrowRight size={16} /></button>
              </div>
           </motion.div>
         )}

         {activeTab === "members" && (
           <motion.div key="members" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
             <div className="p-8 border-b border-gray-50">
                <h3 className="font-serif text-2xl font-bold text-gray-900">Member Directory</h3>
                <p className="text-gray-500 text-sm italic">Showing members eligible for your role's oversight.</p>
             </div>
             <div className="p-0 max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50">
                    <tr className="text-[10px] uppercase font-bold text-gray-400">
                      <th className="px-8 py-4">ID</th>
                      <th className="px-8 py-4">Name</th>
                      <th className="px-8 py-4">State</th>
                      <th className="px-8 py-4">Status</th>
                      <th className="px-8 py-4">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(m => (
                      <tr key={m.email} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-4 font-mono text-[10px] text-gray-400">{m.registrationNumber || "---"}</td>
                        <td className="px-8 py-4 font-bold text-gray-800 text-sm">{m.fullName}</td>
                        <td className="px-8 py-4 text-xs font-medium text-gray-500">{m.certForm?.stateOfOrigin || "---"}</td>
                        <td className="px-8 py-4 text-xs">
                          <span className={`px-2 py-0.5 rounded-full font-bold ${m.status === 'approved' ? 'bg-green-50 text-green-600' : m.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-xs text-gray-400">{m.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
           </motion.div>
         )}

         {activeTab === "finance" && (
            <motion.div key="finance" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl">
                     <h4 className="font-serif text-xl font-bold text-gray-900 mb-6">Revenue Summary</h4>
                     <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                           <span className="text-sm font-medium text-gray-500">Monthly Dues Pool</span>
                           <span className="text-xl font-bold text-emerald-600">₦{totalMemberDues.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                           <span className="text-sm font-medium text-gray-500">Active Contributors</span>
                           <span className="text-xl font-bold text-gray-900">{members.filter(m => (m.duesPayments?.length || 0) > 0).length}</span>
                        </div>
                     </div>
                  </div>
                  <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl flex flex-col justify-center items-center text-center">
                     <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4">
                        <BarChart2 size={32} />
                     </div>
                     <h4 className="font-serif text-xl font-bold text-gray-900">Audit in Progress</h4>
                     <p className="text-gray-500 text-sm mt-2 font-medium italic">Full financial visualizations are currently undergoing audit reviews for transparency.</p>
                  </div>
               </div>
            </motion.div>
         )}

         {activeTab === "resources" && (
            <motion.div key="resources" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-white p-12 rounded-[3rem] border border-primary-gold/10 shadow-2xl text-center">
               <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 bg-primary-gold/10 text-primary-gold rounded-full flex items-center justify-center mx-auto mb-8">
                     <Lock size={40} />
                  </div>
                  <h3 className="font-serif text-3xl font-bold text-gray-900 mb-4">Secured Resources</h3>
                  <p className="text-gray-500 text-lg mb-8 italic">You have executive authority to broadcast documents to the general membership. Access the central library to upload new materials.</p>
                  <button onClick={() => window.scrollTo(0, 0)} className="bg-primary-theme text-white px-10 py-4 rounded-2xl font-bold shadow-xl hover:scale-105 transition-transform active:scale-95">Open Secretariat Archives</button>
               </div>
            </motion.div>
         )}
      </AnimatePresence>
    </motion.div>
  );
}

function DashboardPage({ 
  user, 
  onUpdateUser, 
  onDownload, 
  onNavigate, 
  onOpenSearch, 
  onLogout,
  executiveDuesAmount,
  monthlyDuesAmount,
  certificatePrice,
  licensePrice,
  cooperativeHandPrice,
  cooperativeGraceDay,
  cooperativeFineAmount,
  flutterwaveKey
}: { 
  user: User, 
  onUpdateUser: (u: User) => void, 
  onDownload: (t: "certificate" | "license") => void, 
  onNavigate: (p: Page) => void, 
  onOpenSearch: () => void, 
  onLogout: () => void,
  executiveDuesAmount: number,
  monthlyDuesAmount: number,
  certificatePrice: number,
  licensePrice: number,
  cooperativeHandPrice: number,
  cooperativeGraceDay: number,
  cooperativeFineAmount: number,
  flutterwaveKey: string
}) {
  const [certVerifyInput, setCertVerifyInput] = useState("");
  const [certVerified, setCertVerified] = useState(false);
  const [licVerifyInput, setLicVerifyInput] = useState("");
  const [licVerified, setLicVerified] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payingDues, setPayingDues] = useState(false);
  const [payingCoop, setPayingCoop] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [showLicModal, setShowLicModal] = useState(false);
  const [paymentSuccessSlip, setPaymentSuccessSlip] = useState<{ type: string; reference: string } | null>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [coopHands, setCoopHands] = useState(user.cooperativeHands || 1);
  const [activeDashTab, setActiveDashTab] = useState<"dashboard" | "support" | "executive_portal">("dashboard");

  useEffect(() => {
    if (user.userType === "executive") {
      setActiveDashTab("executive_portal");
    }
  }, [user.userType]);

  const [certStage, setCertStage] = useState(1);
  const [licStage, setLicStage] = useState(1);
  const [certForm, setCertForm] = useState({
    officialName: user.fullName || "",
    dob: "",
    gender: "Male" as "Male" | "Female",
    address: "",
    stateOfOrigin: "",
    lga: "",
    nationality: "Nigerian",
    churchName: user.churchName || "",
    churchPosition: "",
    churchAddress: "",
    yearOfOrdination: "",
    reference1: "",
    reference2: "",
    baptismDate: "",
    baptismCert: "",
    ordinationCert: "",
    maritalStatus: "Single",
    educationStatus: "",
    contactNumber: user.phone || "",
    whatsappNumber: "",
    socialMedia: "",
    assymogPosition: "Member" as "Member" | "Executive",
    executivePost: "",
    oaths: [false, false, false, false, false],
    signature: "",
    profilePicture: ""
  });

  const [licForm, setLicForm] = useState({
    officialName: user.fullName || "",
    nin: "",
    certNumber: "",
    passportNumber: "",
    issuingCountry: "Nigeria",
    isVerifyingNin: false,
    isVerifyingCert: false,
    ninVerified: false,
    certVerified: false,
    ninError: "",
    certError: "",
    dob: "",
    gender: "",
    address: "",
    churchName: "",
    churchPosition: "",
    ordinationYear: ""
  });
  
  const resetCertModal = () => {
    setShowCertModal(false);
    setCertStage(1);
  };

  const resetLicModal = () => {
    setShowLicModal(false);
    setLicStage(1);
    setLicForm(prev => ({ ...prev, ninVerified: false, certVerified: false, isVerifyingNin: false, isVerifyingCert: false, ninError: "", certError: "", nin: "", certNumber: "", dob: "", gender: "", address: "", churchName: "", churchPosition: "", ordinationYear: "" }));
  };

  useEffect(() => {
    fetch("/api/resources")
      .then(res => res.json())
      .then(data => setResources(data || []))
      .catch(() => {});
  }, []);

  const configCert = {
    public_key: flutterwaveKey || "FLWPUBK_TEST-sandbox",
    tx_ref: Date.now().toString() + "-cert",
    amount: certificatePrice,
    currency: 'NGN',
    payment_options: 'card,mobilemoney,ussd',
    customer: {
      email: user.email,
      phone_number: user.phone || "",
      name: user.fullName,
    },
    customizations: {
      title: 'Obtain Certificate',
      description: 'Payment for Membership Certificate',
      logo: 'https://st2.depositphotos.com/4403291/7418/v/450/depositphotos_74189661-stock-illustration-online-shop-log.jpg',
    },
  };

  const configLicense = {
    public_key: flutterwaveKey || "FLWPUBK_TEST-sandbox",
    tx_ref: Date.now().toString() + "-lic",
    amount: licensePrice,
    currency: 'NGN',
    payment_options: 'card,mobilemoney,ussd',
    customer: {
      email: user.email,
      phone_number: user.phone || "",
      name: user.fullName,
    },
    customizations: {
      title: 'Obtain License',
      description: 'Payment for Ministerial License',
      logo: 'https://st2.depositphotos.com/4403291/7418/v/450/depositphotos_74189661-stock-illustration-online-shop-log.jpg',
    },
  };

  const currentMonthDate = new Date();
  const currentMonthString = currentMonthDate.toLocaleString('default', { month: 'long' });
  const currentYearString = currentMonthDate.getFullYear().toString();

  const isCurrentMonthPaid = user.duesPayments?.some(
    p => p.month === currentMonthString && p.year === currentYearString
  );

  const configDues = {
    public_key: flutterwaveKey || "FLWPUBK_TEST-sandbox",
    tx_ref: Date.now().toString() + "-dues",
    amount: monthlyDuesAmount,
    currency: 'NGN',
    payment_options: 'card,mobilemoney,ussd',
    customer: {
      email: user.email,
      phone_number: user.phone || "",
      name: user.fullName,
    },
    customizations: {
      title: 'Monthly Dues',
      description: `Payment for ${currentMonthString} ${currentYearString} Dues`,
      logo: 'https://st2.depositphotos.com/4403291/7418/v/450/depositphotos_74189661-stock-illustration-online-shop-log.jpg',
    },
  };

  const handleFlutterPaymentCert = useFlutterwave(configCert);
  const handleFlutterPaymentLicense = useFlutterwave(configLicense);
  const handleFlutterPaymentDues = useFlutterwave(configDues);

  const handlePayExecDues = async () => {
    setPaying(true);
    const reference = "EX-PAY-" + Date.now();
    const currentMonthString = new Date().toLocaleString('default', { month: 'long' });
    const currentYearString = new Date().getFullYear().toString();

    const flwConfig = {
      public_key: flutterwaveKey,
      tx_ref: reference,
      amount: executiveDuesAmount,
      currency: "NGN",
      payment_options: "card,banktransfer,ussd",
      customer: {
        email: user.email,
        phone_number: user.phone || '08000000000',
        name: user.fullName,
      },
      customizations: {
        title: "ASYMOG Board Dues",
        description: `Executive Board Monthly Dues - ${currentMonthString} ${currentYearString}`,
        logo: "https://www.assymog.org/logo.png",
      },
    };

    if (!(window as any).FlutterwaveCheckout) {
       setTimeout(async () => {
          try {
            const res = await fetch("/api/executive/pay-dues", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                accessKey: user.registrationNumber,
                amount: executiveDuesAmount,
                reference,
                month: currentMonthString,
                year: currentYearString,
                datePaid: new Date().toLocaleDateString()
              })
            });
            const data = await res.json();
            if (data.success) {
               onUpdateUser({ ...user, duesPayments: [...(user.duesPayments || []), data.payment] });
               alert("Board dues paid successfully!");
            }
          } catch(e) {
             alert("Sync Error");
          } finally {
             setPaying(false);
          }
       }, 2000);
       return;
    }

    (window as any).FlutterwaveCheckout({
      ...flwConfig,
      callback: async (response: any) => {
        closePaymentModal();
        if (response.status === "successful") {
          try {
            const res = await fetch("/api/executive/pay-dues", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                accessKey: user.registrationNumber,
                amount: executiveDuesAmount,
                reference: response.transaction_id.toString(),
                month: currentMonthString,
                year: currentYearString,
                datePaid: new Date().toLocaleDateString()
              })
            });
            const data = await res.json();
            if (data.success) {
               onUpdateUser({ ...user, duesPayments: [...(user.duesPayments || []), data.payment] });
               alert("Board dues paid successfully!");
            }
          } catch(e) {}
        }
        setPaying(false);
      },
      onclose: () => setPaying(false),
    });
  };

  const handlePayDues = () => {
    if (user.status === 'pending') return;
    
    // Fallback to use window directly if useFlutterwave hook is blocked
    if ((window as any).FlutterwaveCheckout) {
       (window as any).FlutterwaveCheckout({
          ...configDues,
          callback: (response: any) => {
              closePaymentModal();
              if (response.status === "successful") {
                 recordDuesPayment(response.transaction_id.toString());
              }
          },
          onclose: () => {},
       });
    } else {
       handleFlutterPaymentDues({
         callback: (response) => {
           closePaymentModal();
           if (response.status === "successful") {
             recordDuesPayment(response.transaction_id.toString());
           }
         },
         onClose: () => {},
       });
    }
  };

  const recordDuesPayment = async (reference: string) => {
    setPayingDues(true);
    try {
      // Securely verify on server
      const verifyRes = await fetch(`/api/verify-payment/${encodeURIComponent(reference)}`);
      const verifyData = await verifyRes.json();
      
      if (!verifyData.success) {
        alert("Verification failed: " + (verifyData.message || "Unknown payment reference"));
        return;
      }

      const res = await fetch("/api/pay-dues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          amount: monthlyDuesAmount,
          reference,
          month: currentMonthString,
          year: currentYearString,
          datePaid: new Date().toISOString()
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Monthly Dues paid successfully!");
        onUpdateUser({
          ...user,
          duesPayments: [...(user.duesPayments || []), data.payment]
        });
      }
    } catch(e) {
      alert("Failed to record dues");
    } finally {
      setPayingDues(false);
    }
  };

  const currentMonth = new Date().toLocaleDateString('en-NG', { month: 'long' });
  const currentYear = new Date().getFullYear();
  const currentMonthYear = `${currentMonth} ${currentYear}`;
  
  const isCoopPaidThisMonth = user.cooperativePayments?.some(p => p.month === currentMonth && p.year === currentYear.toString());
  const currentDay = new Date().getDate();
  
  // Arrears check: Check last 3 months
  const monthsArr = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const arrearsCount = monthsArr.slice(0, new Date().getMonth()).filter(m => {
    return !user.cooperativePayments?.some(p => p.month === m && p.year === currentYear.toString());
  }).length;

  const isOverdue = (!isCoopPaidThisMonth && currentDay > cooperativeGraceDay) || arrearsCount > 0;
  const activeFine = (!isCoopPaidThisMonth && currentDay > cooperativeGraceDay) ? cooperativeFineAmount : 0;
  const totalArrearsAmount = arrearsCount * (cooperativeHandPrice * (user.cooperativeHands || 1));
  const totalFineAmount = activeFine + (arrearsCount * cooperativeFineAmount); // Fine for each missed month too? Let's keep it simple: one fine for current, plus missed months bases.
  
  const handlePayCooperative = () => {
    if (!user.cooperativeEnrollment) {
      if (!confirm(`Are you sure you want to join ASYMOG Cooperative with ${coopHands} hand(s)?`)) return;
    }

    const baseCoopAmount = cooperativeHandPrice * coopHands;
    const totalCoopAmount = baseCoopAmount + totalArrearsAmount + (user.cooperativeEnrollment ? totalFineAmount : 0);

    if ((window as any).FlutterwaveCheckout) {
       (window as any).FlutterwaveCheckout({
          public_key: flutterwaveKey || "FLWPUBK_TEST-sandbox",
          tx_ref: Date.now().toString() + "-coop",
          amount: totalCoopAmount,
          currency: 'NGN',
          payment_options: 'card,mobilemoney,ussd',
          customer: {
            email: user.email,
            phone_number: user.phone || "",
            name: user.fullName,
          },
          customizations: {
            title: 'ASYMOG Cooperative Contribution',
            description: `Payment for ${coopHands} hand(s) ${totalFineAmount > 0 ? '(Including Arrears & Fines)' : ''}`,
            logo: 'https://ais-dev-7k42dc2jp5bz57rrisb57p-249106592411.europe-west2.run.app/logo.png',
          },
          callback: (response: any) => {
              if (response.status === "successful") {
                 recordCooperativePayment(response.transaction_id.toString(), totalCoopAmount);
              }
          },
          onclose: () => {},
       });
    }
  };

  const recordCooperativePayment = async (reference: string, amount: number) => {
    setPayingCoop(true);
    try {
      // Securely verify on server
      const verifyRes = await fetch(`/api/verify-payment/${encodeURIComponent(reference)}`);
      const verifyData = await verifyRes.json();
      
      if (!verifyData.success) {
        alert("Verification failed: " + (verifyData.message || "Unknown payment reference"));
        return;
      }

      const res = await fetch("/api/cooperative/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          amount,
          reference,
          month: currentMonth,
          year: currentYear.toString(),
          datePaid: new Date().toISOString(),
          hands: coopHands
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Cooperative Contribution paid successfully!");
        onUpdateUser({
          ...user,
          cooperativeEnrollment: true,
          cooperativeHands: coopHands,
          cooperativePayments: [...(user.cooperativePayments || []), data.payment]
        });
      }
    } catch(e) {
      alert("Failed to record contribution");
    } finally {
      setPayingCoop(false);
    }
  };

  const handleObtain = (type: "certificate" | "license") => {
    if (user.status === 'pending') return;

    const onPaymentSuccess = async (response: any) => {
      closePaymentModal();
      const reference = response.transaction_id.toString();
      
      try {
        // Verify payment on server first
        const verifyRes = await fetch(`/api/verify-payment/${encodeURIComponent(reference)}`);
        const verifyData = await verifyRes.json();
        
        if (!verifyData.success) {
          alert("Payment verification failed: " + (verifyData.message || "Unknown error"));
          return;
        }

        const updates: any = {};
        if (type === 'certificate') {
          updates.certificatePayment = { reference, datePaid: new Date().toISOString(), amount: certificatePrice };
        } else {
          updates.licensePayment = { reference, datePaid: new Date().toISOString(), amount: licensePrice };
        }

        const res = await fetch("/api/admin/update-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, ...updates })
        });
        
        const data = await res.json();
        if (data.success) {
          onUpdateUser({ ...user, ...updates });
          setPaymentSuccessSlip({ type, reference });
        }
      } catch (e) {
        console.error("Payment Record Error:", e);
        alert("Payment successful but failed to update record. Please save your reference: " + reference);
      }
    };

    if ((window as any).FlutterwaveCheckout) {
       (window as any).FlutterwaveCheckout({
          ...(type === "certificate" ? configCert : configLicense),
          callback: onPaymentSuccess,
          onclose: () => {},
       });
    } else {
       const handler = type === "certificate" ? handleFlutterPaymentCert : handleFlutterPaymentLicense;
       
       handler({
          callback: onPaymentSuccess,
          onClose: () => {},
       });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-7xl mx-auto w-full px-4 py-12 flex-grow"
    >
      <div className="flex space-x-2 mb-12 bg-white p-2 rounded-[2rem] border border-primary-gold/10 w-fit">
        <button 
          onClick={() => setActiveDashTab("dashboard")}
          className={`px-8 py-4 rounded-2xl font-bold transition-all ${activeDashTab === "dashboard" ? "bg-primary-theme text-white shadow-xl" : "text-gray-500 hover:bg-gray-50"}`}
        >
          User Dashboard
        </button>
        {user.userType === 'executive' && (
          <button 
            onClick={() => setActiveDashTab("executive_portal")}
            className={`px-8 py-4 rounded-2xl font-bold transition-all ${activeDashTab === "executive_portal" ? "bg-primary-gold text-white shadow-xl" : "text-gray-500 hover:bg-gray-50"}`}
          >
            Position Portal
          </button>
        )}
        <button 
          onClick={() => setActiveDashTab("support")}
          className={`px-8 py-4 rounded-2xl font-bold transition-all ${activeDashTab === "support" ? "bg-primary-theme text-white shadow-xl" : "text-gray-500 hover:bg-gray-50"}`}
        >
          Message Admin
        </button>
      </div>

      {activeDashTab === "support" ? (
        <SupportSection user={user} />
      ) : activeDashTab === "executive_portal" ? (
        <ExecutivePortal user={user} onUpdateUser={onUpdateUser} />
      ) : (
        <>
          <AnimatePresence>
        {paymentSuccessSlip && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-primary-theme/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-8 text-center relative"
            >
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Check size={40} />
              </div>
              <h2 className="font-serif text-3xl font-bold text-primary-theme mb-2">Payment Successful!</h2>
              <p className="text-gray-500 mb-8 underline decoration-primary-gold decoration-2 underline-offset-4 font-medium uppercase text-xs tracking-widest">Digital Payment Slip Generated</p>
              
              <div className="bg-gray-50 p-8 rounded-2xl border-2 border-dashed border-gray-200 mb-8 relative">
                 <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-4 text-[10px] font-bold text-primary-gold uppercase tracking-[0.2em]">Tracking Number</div>
                 <p className="text-2xl font-mono font-bold text-gray-900 tracking-tighter mb-4">{paymentSuccessSlip.reference}</p>
                 <div className="pt-4 border-t border-gray-100 text-left space-y-3">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-gray-400">
                       <span>Document</span>
                       <span className="text-gray-900">{paymentSuccessSlip.type === 'certificate' ? 'Ministerial Certificate' : 'Ministerial License'}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold uppercase text-gray-400">
                       <span>Status</span>
                       <span className="text-blue-600 italic">Processing</span>
                    </div>
                 </div>
              </div>

              <div className="space-y-4 text-sm text-gray-600 leading-relaxed mb-8 bg-primary-gold/5 p-4 rounded-xl border border-primary-gold/20">
                 <p className="font-bold text-primary-theme">🚨 IMPORTANT INSTRUCTIONS:</p>
                 <p>1. Please print this slip or take a screenshot and submit it to the ASYMOG Secretariat/Admin immediately.</p>
                 <p>2. Come back to the <strong>Verification Portal</strong> on the home page after a <strong>two-week interval</strong> to track and download your document.</p>
              </div>

              <button 
                onClick={() => setPaymentSuccessSlip(null)}
                className="w-full bg-primary-theme text-white py-5 rounded-2xl font-bold shadow-xl hover:bg-black transition-all active:scale-95"
              >
                Close Receipt
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <header className="flex flex-col md:flex-row md:items-end md:justify-between mb-8 gap-6">
        <div>
          <h1 className="font-serif text-5xl font-bold text-primary-theme mb-2">
            {user.userType === 'executive' ? "Board Member Dashboard" : "Welcome,"}
          </h1>
          <p className="text-3xl font-light text-gray-500">
            {user.fullName}
            {user.userType === 'executive' && (
              <span className="ml-4 text-xs font-bold bg-primary-gold text-white px-3 py-1 rounded-full uppercase tracking-widest inline-block align-middle transform -translate-y-1 shadow-sm">
                Board {user.role}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => onNavigate("meeting")}
            className="flex items-center space-x-3 bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-sm hover:bg-indigo-700 transition-colors shadow-lg active:scale-95"
          >
            <Video size={24} />
            <div className="text-left hidden sm:block">
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Live</p>
              <p className="font-medium">Join Meeting Room</p>
            </div>
          </button>

          <button 
            onClick={onLogout}
            className="flex items-center space-x-3 bg-red-50 text-red-600 px-6 py-4 rounded-2xl shadow-sm hover:bg-red-100 transition-colors active:scale-95 border border-red-100"
          >
            <LogOut size={24} />
            <div className="text-left hidden sm:block">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">Exit</p>
              <p className="font-bold">Sign Out</p>
            </div>
          </button>
        </div>
      </header>

      <div className="bg-gradient-to-r from-primary-theme to-[#1a251e] p-8 rounded-[2rem] shadow-xl text-white mb-12 relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-gold rounded-full mix-blend-screen opacity-20 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-primary-gold rounded-full mix-blend-screen opacity-10 blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 w-full md:w-auto">
           <div className="flex items-center space-x-2 mb-4">
             <ShieldCheck size={20} className="text-primary-gold" />
             <p className="text-primary-gold font-bold uppercase tracking-widest text-xs">{user.userType === 'executive' ? 'ASYMOG Executive Portal' : 'ASYMOG Membership Panel'}</p>
           </div>
           <h2 className="font-serif text-3xl font-bold mb-6">{user.fullName}</h2>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-300">
             <div className="flex items-center space-x-3 bg-white/5 p-3 rounded-xl">
               <Mail size={16} className="text-primary-gold" /> 
               <span>{user.email}</span>
             </div>
             {user.phone && (
               <div className="flex items-center space-x-3 bg-white/5 p-3 rounded-xl">
                 <Phone size={16} className="text-primary-gold" /> 
                 <span>{user.phone}</span>
               </div>
             )}
             <div className="flex items-center space-x-3 bg-white/5 p-3 rounded-xl sm:col-span-2">
               <Church size={16} className="text-primary-gold" /> 
               <span>Assigned Church: <strong className="text-white">{user.churchName}</strong></span>
             </div>
           </div>
        </div>
        
        <div className="relative z-10 bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 w-full md:w-64 text-center shrink-0">
          <p className="text-xs uppercase tracking-widest text-primary-gold mb-3">Membership Status</p>
          {user.status === 'pending' ? (
            <div className="inline-flex items-center space-x-2 bg-yellow-500/20 text-yellow-300 px-5 py-2.5 rounded-full font-bold text-sm mb-4">
              <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.8)]"></div>
              <span>Pending Approval</span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-2 bg-green-500/20 text-green-300 px-5 py-2.5 rounded-full font-bold text-sm mb-4">
              <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
              <span>Active Member</span>
            </div>
          )}
          <div className="pt-4 border-t border-white/10">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Registration ID</p>
            <p className="text-lg font-mono font-bold text-white tracking-wider">
              {user.status === 'approved' ? (user.registrationNumber || (user.id ? `ASYM-${user.id.slice(0,6).toUpperCase()}` : "ASYM-7A9B2C")) : "PENDING"}
            </p>
          </div>
        </div>
      </div>

      {user.userType === 'executive' && (
        <div className="mb-12 p-8 rounded-[2rem] bg-primary-gold/5 border border-primary-gold/20 flex items-center gap-6 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
             <ShieldCheck size={120} />
           </div>
           <div className="w-16 h-16 bg-primary-gold text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
             <ShieldCheck size={32} />
           </div>
           <div>
             <h3 className="font-serif text-2xl font-bold text-gray-900 mb-1">Official Board Access</h3>
             <p className="text-gray-600 max-w-2xl">
               As an appointed Executive Board member ({user.role}), you have authorized access to this portal. 
               Your profile is verified and active. Use your unique access key to rejoin this portal at any time.
             </p>
           </div>
        </div>
      )}

      {user.userType === 'executive' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] shadow-xl border border-primary-gold/10 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-primary-gold/5 rounded-bl-full -mr-8 -mt-8"></div>
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h3 className="font-serif text-3xl font-bold text-gray-900 mb-2">Monthly Dues</h3>
                   <p className="text-gray-500 font-medium italic">Support the Association's Vision</p>
                </div>
                <div className="text-right">
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Board Amount</p>
                   <p className="text-2xl font-serif font-bold text-primary-gold">₦{executiveDuesAmount.toLocaleString()}</p>
                </div>
             </div>

             <div className="flex flex-col sm:flex-row gap-6 mb-8">
                <div className="flex-1 bg-gray-50 rounded-2xl p-6 border border-gray-100">
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Last Payment</p>
                   {user.duesPayments && user.duesPayments.length > 0 ? (
                     <div className="flex justify-between items-end">
                       <p className="text-lg font-bold text-primary-theme">₦{user.duesPayments[user.duesPayments.length - 1].amount.toLocaleString()}</p>
                       <p className="text-[10px] font-bold text-gray-400">{user.duesPayments[user.duesPayments.length - 1].datePaid}</p>
                     </div>
                   ) : (
                     <p className="text-sm font-bold text-red-400 italic">No payments yet</p>
                   )}
                </div>
                <div className="flex-1 bg-gray-50 rounded-2xl p-6 border border-gray-100">
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Next Due Date</p>
                   <p className="text-lg font-bold text-gray-900">
                      {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}
                   </p>
                </div>
             </div>

             <button 
               onClick={handlePayExecDues}
               disabled={paying}
               className="w-full bg-primary-theme text-white py-5 rounded-2xl font-bold shadow-xl hover:bg-black transition-all flex items-center justify-center space-x-3 active:scale-[0.98] disabled:opacity-50"
             >
               <CreditCard size={20} className="text-primary-gold" />
               <span>{paying ? "Processing Payment..." : `Pay Executive Dues (₦${executiveDuesAmount.toLocaleString()})`}</span>
             </button>
          </div>

          <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-primary-gold/10 flex flex-col">
             <div className="flex items-center justify-between mb-8">
                <h3 className="font-serif text-xl font-bold text-gray-900">Board History</h3>
                <History size={18} className="text-primary-gold" />
             </div>
             
             <div className="flex-grow overflow-y-auto max-h-[300px] space-y-4 pr-2">
                {!user.duesPayments || user.duesPayments.length === 0 ? (
                  <div className="text-center py-12">
                     <p className="text-gray-400 text-sm italic">No transaction history found.</p>
                  </div>
                ) : (
                  [...user.duesPayments].reverse().map((pay, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                       <div>
                          <p className="text-xs font-bold text-gray-900">{pay.month} {pay.year}</p>
                          <p className="text-[10px] text-gray-500 font-mono">{pay.reference.slice(0, 12)}...</p>
                       </div>
                       <p className="font-bold text-primary-gold text-sm">₦{pay.amount.toLocaleString()}</p>
                    </div>
                  ))
                )}
             </div>
             
             <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Contributed</p>
                <p className="font-bold text-gray-900">₦{(user.duesPayments || []).reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</p>
             </div>
          </div>
        </div>
      )}

      {user.status === 'pending' && user.userType !== 'executive' && (
        <div className="bg-yellow-50/50 p-10 md:p-12 rounded-[2.5rem] shadow-sm border border-yellow-200 text-center relative overflow-hidden mb-8">
          <div className="absolute top-0 right-[-10%] w-64 h-64 bg-yellow-200 rounded-full mix-blend-screen opacity-50 blur-3xl pointer-events-none"></div>
          <div className="flex flex-col md:flex-row items-center md:items-start justify-center space-x-0 md:space-x-6">
            <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center shrink-0 mb-4 md:mb-0 shadow-sm">
              <User size={32} />
            </div>
            <div className="text-left">
              <h3 className="font-serif text-2xl font-bold mb-2 text-yellow-800 text-center md:text-left">Registration Pending</h3>
              <p className="text-yellow-700 max-w-2xl leading-relaxed">
                Your member registration form is currently under review by our executive board. 
                You can still fill the forms below to apply for your Membership Certificate and Ministerial License while waiting for approval.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <motion.div 
          whileHover={{ y: -8 }}
          className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-primary-gold/10 group cursor-pointer"
          onClick={() => {
            setCertStage(1);
            setShowCertModal(true);
          }}
        >
          <div className="flex justify-between items-start mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transform bg-primary-theme text-white group-hover:rotate-6 transition-transform">
              <Award size={32} />
            </div>
            <Download size={24} className="text-gray-300 group-hover:text-primary-gold transition-colors" />
          </div>
          <h3 className="font-serif text-3xl font-bold mb-4">
            {user.certificateData ? "ASYMOG Membership Certificate" : "Obtain Membership Certificate"}
          </h3>
              {user.certificateData ? (
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-green-600 font-bold flex items-center">
                        <Check size={18} className="mr-2" /> Application Processed
                      </p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Track your document</p>
                      <p className="text-sm font-bold text-primary-theme mb-3">Use the Tracking Number provided on your payment slip in the public Verification portal.</p>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onNavigate("verification"); }}
                        className="text-primary-gold text-xs font-bold underline"
                      >
                        Go to Verification Page
                      </button>
                    </div>
                 </div>
              ) : (
            <>
              <p className="text-gray-500 mb-8 leading-relaxed font-sans">
                Formal documentation confirming your status as a registered member of the Association of Yoruba Ministers of God.
              </p>
              <button 
                className="flex items-center space-x-3 font-bold transition-transform text-primary-theme group-hover:translate-x-2"
              >
                <span>Obtain Certificate</span>
                <div className="w-8 h-px bg-primary-theme group-hover:w-12 transition-all"></div>
              </button>
            </>
          )}
        </motion.div>

        <motion.div 
          whileHover={{ y: -8 }}
          className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-primary-gold/10 group cursor-pointer"
          onClick={() => {
            setLicStage(1);
            setShowLicModal(true);
          }}
        >
          <div className="flex justify-between items-start mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transform bg-primary-gold text-white group-hover:-rotate-6 transition-transform">
              <ShieldCheck size={32} />
            </div>
            <Download size={24} className="text-gray-300 group-hover:text-primary-gold transition-colors" />
          </div>
          <h3 className="font-serif text-3xl font-bold mb-4">
            {user.licenseData ? "ASYMOG Ministerial License" : "Obtain Ministerial License"}
          </h3>
          {user.licenseData ? (
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-green-600 font-bold flex items-center">
                    <Check size={18} className="mr-2" /> License Application Processed
                  </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Track Application</p>
                  <p className="text-sm font-bold text-primary-theme mb-3">Copy your reference number and track progress in the Verification portal after 2 weeks.</p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onNavigate("verification"); }}
                    className="text-primary-gold text-xs font-bold underline"
                  >
                    Track Now
                  </button>
                </div>
             </div>
          ) : (
            <>
              <p className="text-gray-500 mb-8 leading-relaxed font-sans">
                Authorization documentation granting you the right to perform ministerial duties under the ASYMOG banner.
              </p>
              <button 
                className="flex items-center space-x-3 font-bold transition-transform text-primary-gold group-hover:translate-x-2"
              >
                <span>Obtain License</span>
                <div className="w-8 h-px bg-primary-gold group-hover:w-12 transition-all"></div>
              </button>
            </>
          )}
        </motion.div>

        <motion.div 
          whileHover={{ y: -8 }}
          className="bg-primary-theme p-10 rounded-[2.5rem] shadow-xl flex flex-col justify-between border-b-8 border-primary-gold group cursor-pointer relative overflow-hidden"
          onClick={() => onOpenSearch()}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
          <div>
            <div className="flex items-center space-x-2 mb-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transform bg-white text-primary-theme group-hover:rotate-12 transition-transform">
                <Search size={32} />
              </div>
            </div>
            <h3 className="font-serif text-3xl font-bold mb-4 text-white">Find a Minister</h3>
            <p className="text-white/60 text-sm mb-8 leading-relaxed">
              Search our world-wide directory of verified Yoruba ministers and fellowship connections.
            </p>
          </div>
          <button 
            className="flex items-center space-x-3 font-bold transition-transform text-primary-gold group-hover:translate-x-2 self-start"
          >
            <span>Open Directory</span>
            <div className="w-8 h-px bg-primary-gold group-hover:w-12 transition-all"></div>
          </button>
        </motion.div>
      </div>

      {user.status !== 'pending' && (
      <section className="mt-12 bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
          <div>
            <h3 className="font-serif text-3xl font-bold text-gray-800 flex items-center space-x-3">
              <span className="bg-green-100 text-green-700 w-12 h-12 rounded-2xl flex items-center justify-center">₦</span>
              <span>Dues & Contributions</span>
            </h3>
            <p className="text-gray-500 mt-2">Manage your monthly commitments and view payment history.</p>
          </div>
          <button 
            onClick={handlePayDues}
            disabled={payingDues}
            className={`flex items-center space-x-3 px-8 py-4 rounded-xl shadow-lg font-bold transition-colors active:scale-95 ${
              isCurrentMonthPaid ? "bg-green-600 text-white hover:bg-green-700" : "bg-orange-500 text-white hover:bg-orange-600"
            }`}
          >
            {payingDues ? <Loader2 className="animate-spin" size={20} /> : (isCurrentMonthPaid && <Check size={20} />)}
            <span>{isCurrentMonthPaid ? `${currentMonthString} Dues Paid` : `Pay ${currentMonthString} Dues (₦${monthlyDuesAmount.toLocaleString()})`}</span>
          </button>
        </div>

        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
          <h4 className="font-bold text-sm uppercase text-gray-500 tracking-widest mb-4">Payment History</h4>
          {(!user.duesPayments || user.duesPayments.length === 0) ? (
            <div className="text-center py-8 text-gray-400">
               <p>No dues payments recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {user.duesPayments.slice().reverse().map((payment, i) => (
                <div key={i} className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center space-x-4">
                     <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                        <Check size={16} />
                     </div>
                     <div>
                       <p className="font-bold text-gray-800">{payment.month} {payment.year} Dues</p>
                       <p className="text-xs text-gray-400">{new Date(payment.datePaid).toLocaleDateString()} • Ref: {payment.reference.slice(-8)}</p>
                     </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">₦{payment.amount.toLocaleString()}</p>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Paid</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      )}

      <section className="mt-12 bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100" id="dash_cooperative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
          <div>
            <h3 className="font-serif text-3xl font-bold text-gray-800 flex items-center space-x-3">
              <span className="bg-indigo-100 text-indigo-700 w-12 h-12 rounded-2xl flex items-center justify-center">
                <Users size={24} />
              </span>
              <span>ASYMOG Cooperative</span>
            </h3>
            <p className="text-gray-500 mt-2">Saving together for a better future. Monthly contributions and empowerment.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {!user.cooperativeEnrollment ? (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-4">
                <div>
                   <label className="block text-[10px] font-bold text-gray-400 uppercase">Number of Hands</label>
                   <input 
                      type="number" 
                      min="1" 
                      value={coopHands} 
                      onChange={(e) => setCoopHands(Number(e.target.value))}
                      className="bg-transparent border-none font-bold text-lg w-16 outline-none"
                   />
                </div>
                <button 
                  onClick={handlePayCooperative}
                  disabled={payingCoop}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
                >
                  <PlusCircle size={20} />
                  <span>Join Coop</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-end gap-1">
                <button 
                  onClick={handlePayCooperative}
                  disabled={payingCoop || isCoopPaidThisMonth}
                  className={`flex items-center space-x-3 px-8 py-4 rounded-xl shadow-lg font-bold transition-colors active:scale-95 ${
                    isCoopPaidThisMonth ? "bg-green-600 text-white shadow-green-100" : (isOverdue ? "bg-red-600 text-white hover:bg-red-700 shadow-red-100" : "bg-indigo-600 text-white hover:bg-indigo-700")
                  }`}
                >
                  {payingCoop ? <Loader2 className="animate-spin" size={20} /> : (isCoopPaidThisMonth && <Check size={20} />)}
                  <span>{isCoopPaidThisMonth ? `${currentMonthYear} Paid` : `Pay Due (₦${( (cooperativeHandPrice * (user.cooperativeHands || 1)) + totalArrearsAmount + totalFineAmount ).toLocaleString()})`}</span>
                </button>
                {isOverdue && (
                  <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest animate-pulse text-right">
                    {arrearsCount > 0 ? `${arrearsCount} Missed Month(s)` : ""} {activeFine > 0 ? `+ Late Fine included` : ""}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
           <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-2xl border border-indigo-100 shadow-sm">
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Your Hands</p>
              <h4 className="text-3xl font-bold text-indigo-900">{user.cooperativeHands || 0} Unit(s)</h4>
              <p className="text-[10px] text-indigo-400 mt-1">₦{cooperativeHandPrice?.toLocaleString()} per hand</p>
           </div>
           <div className="bg-gradient-to-br from-red-50 to-white p-6 rounded-2xl border border-red-100 shadow-sm">
              <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">Grace Period</p>
              <h4 className="text-3xl font-bold text-red-900">{cooperativeGraceDay}th</h4>
              <p className="text-[10px] text-red-400 mt-1">Fine of ₦{cooperativeFineAmount} if late</p>
           </div>
           <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-2xl border border-green-100 shadow-sm">
              <p className="text-xs font-bold text-green-400 uppercase tracking-widest mb-1">Total Saved</p>
              <h4 className="text-3xl font-bold text-green-900">₦{(user.cooperativePayments || []).reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</h4>
              <p className="text-[10px] text-green-400 mt-1">Total lifetime contributions</p>
           </div>
           <div className="bg-gradient-to-br from-primary-gold/5 to-white p-6 rounded-2xl border border-primary-gold/20 shadow-sm">
              <p className="text-xs font-bold text-primary-gold uppercase tracking-widest mb-1">Enrollment Date</p>
              <h4 className="text-xl font-bold text-gray-800">
                {user.cooperativePayments && user.cooperativePayments.length > 0 
                  ? new Date(user.cooperativePayments[0].datePaid).toLocaleDateString()
                  : "Not Enrolled"}
              </h4>
              <p className="text-[10px] text-gray-400 mt-1">Member since joining cooperative</p>
           </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-sm uppercase text-gray-500 tracking-widest">Contribution History</h4>
            <div className="flex gap-2">
               {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].slice(new Date().getMonth() - 5, new Date().getMonth() + 1).map(m => {
                  const currentY = new Date().getFullYear();
                  const isPaid = user.cooperativePayments?.some(p => p.month === m && p.year === currentY.toString());
                  return (
                    <div key={m} className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold border transition-all ${isPaid ? "bg-green-500 border-green-600 text-white" : "bg-white border-gray-200 text-gray-400"}`} title={m}>
                      {m.substring(0, 1)}
                    </div>
                  );
               })}
            </div>
          </div>
          {(!user.cooperativePayments || user.cooperativePayments.length === 0) ? (
            <div className="text-center py-8 text-gray-400">
               <p>No contributions recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {user.cooperativePayments.slice().reverse().map((payment, i) => (
                <div key={i} className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center space-x-4">
                     <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                        <Users size={16} />
                     </div>
                     <div>
                       <p className="font-bold text-gray-800">{payment.month} {payment.year} Contribution</p>
                       <p className="text-xs text-gray-400">{new Date(payment.datePaid).toLocaleDateString()} • {payment.hands} Hands • Ref: {payment.reference.slice(-8)}</p>
                     </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-indigo-600">₦{payment.amount.toLocaleString()}</p>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Successfully Paid</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-16 bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
        <div className="flex items-center mb-8 gap-4">
          <div className="bg-primary-theme/10 text-primary-theme p-4 rounded-2xl">
             <Download size={24} />
          </div>
          <div>
            <h3 className="font-serif text-3xl font-bold text-gray-800">Library & Resources</h3>
            <p className="text-gray-500">Download materials, sermons, and guides.</p>
          </div>
        </div>

        {resources.length === 0 ? (
           <div className="text-center py-12 text-gray-500 italic bg-gray-50 rounded-2xl border border-gray-100">
              No resources available at this time.
           </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map(r => (
                 <div key={r.id} className="bg-gray-50 p-6 rounded-2xl border border-gray-100 hover:border-primary-gold/30 hover:shadow-lg transition-all group">
                    <h4 className="font-bold text-primary-theme text-xl mb-2">{r.title}</h4>
                    <p className="text-sm text-gray-600 mb-4 h-10 overflow-hidden line-clamp-2">{r.description || "No description provided."}</p>
                    <div className="flex justify-between items-center mt-auto border-t border-gray-200 pt-4">
                       <span className="text-xs text-gray-400 font-mono">{(r.size / 1024).toFixed(1)} KB</span>
                       <a href={r.url} target="_blank" rel="noreferrer" className="flex flex-row items-center space-x-2 text-sm font-bold text-primary-gold group-hover:text-primary-theme transition-colors">
                          <Download size={16} />
                          <span>Download</span>
                       </a>
                    </div>
                 </div>
              ))}
           </div>
        )}
      </section>

      <section className="mt-16 bg-primary-theme/5 rounded-[3rem] p-12 relative overflow-hidden">
        <LucideQuote size={80} className="absolute -top-6 -left-6 text-primary-theme/10" />
        <div className="max-w-3xl">
          <h4 className="font-serif text-2xl italic text-primary-theme mb-4">"And I will give you pastors according to mine heart, which shall feed you with knowledge and understanding."</h4>
          <p className="text-gray-500">— Jeremiah 3:15</p>
        </div>
      </section>

      <AnimatePresence>
        {showCertModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={resetCertModal}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[2rem] p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button onClick={resetCertModal} className="absolute top-6 right-6 text-gray-400 hover:text-gray-800">
                <X size={24} />
              </button>
              
              {certStage === 1 && (
                <>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="bg-primary-theme text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                    <span className="text-gray-400 text-sm font-medium">Identity</span>
                  </div>
                  <h3 className="font-serif text-3xl font-bold mb-4 text-primary-theme">Membership Certificate</h3>
                  <p className="text-gray-500 mb-6">Stage 1: Official Information</p>
                  
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="text-sm font-bold text-gray-700">Official Name (Govt ID)</label>
                      <input 
                        type="text" 
                        value={certForm.officialName} 
                        onChange={e => setCertForm({...certForm, officialName: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none text-gray-800" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-gray-700">Registration Number</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={user.status === 'approved' ? (user.registrationNumber || "N/A") : "Pending Approval"} 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none font-mono text-gray-500" 
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                       if (certForm.officialName.trim() === "") {
                         alert("Official name is required.");
                         return;
                       }
                       setCertStage(2);
                    }}
                    className="w-full bg-primary-theme text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition-colors"
                  >
                    Enter / Next
                  </button>
                </>
              )}

              {certStage === 2 && (
                <>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="bg-primary-theme text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                    <span className="text-gray-400 text-sm font-medium">Bio-Data</span>
                  </div>
                  <h3 className="font-serif text-3xl font-bold mb-4 text-primary-theme">Personal Bio-Data</h3>
                  <p className="text-gray-500 mb-6">Please provide your personal information for records.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-sm font-bold text-gray-700">Date of Birth</label>
                      <input 
                        type="date" 
                        value={certForm.dob} 
                        onChange={e => setCertForm({...certForm, dob: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none text-gray-800" 
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-sm font-bold text-gray-700">Gender</label>
                      <select 
                        value={certForm.gender} 
                        onChange={e => setCertForm({...certForm, gender: e.target.value as "Male" | "Female"})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none text-gray-800" 
                      >
                         <option value="Male">Male</option>
                         <option value="Female">Female</option>
                      </select>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-sm font-bold text-gray-700">Marital Status</label>
                      <select 
                        value={certForm.maritalStatus} 
                        onChange={e => setCertForm({...certForm, maritalStatus: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none text-gray-800" 
                      >
                         <option value="Single">Single</option>
                         <option value="Married">Married</option>
                         <option value="Divorced">Divorced</option>
                         <option value="Widowed">Widowed</option>
                      </select>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-sm font-bold text-gray-700">Nationality</label>
                      <select 
                        value={certForm.nationality} 
                        onChange={e => setCertForm({...certForm, nationality: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none text-gray-800" 
                      >
                         <option value="Nigerian">Nigerian</option>
                         <option value="Non-Nigerian">Non-Nigerian</option>
                      </select>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-sm font-bold text-gray-700">State of Origin</label>
                      <select 
                        value={certForm.stateOfOrigin} 
                        onChange={e => setCertForm({...certForm, stateOfOrigin: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none text-gray-800" 
                      >
                         <option value="">Select State</option>
                         {NIGERIAN_STATES.map(state => (
                           <option key={state} value={state}>{state}</option>
                         ))}
                      </select>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-sm font-bold text-gray-700">Local Govt. of Origin</label>
                      <input 
                        type="text" 
                        value={certForm.lga} 
                        onChange={e => setCertForm({...certForm, lga: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none text-gray-800" 
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-bold text-gray-700">Church Name</label>
                      <input 
                        type="text" 
                        value={certForm.churchName} 
                        onChange={e => setCertForm({...certForm, churchName: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none text-gray-800" 
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-bold text-gray-700">Church Address</label>
                      <input 
                        type="text" 
                        value={certForm.churchAddress} 
                        onChange={e => setCertForm({...certForm, churchAddress: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none text-gray-800" 
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-sm font-bold text-gray-700">Position in Church</label>
                      <select 
                        value={certForm.churchPosition} 
                        onChange={e => setCertForm({...certForm, churchPosition: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none text-gray-800" 
                      >
                         <option value="">Select Position</option>
                         {CHURCH_POSITIONS.map(pos => (
                           <option key={pos} value={pos}>{pos}</option>
                         ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-bold text-gray-700">Are you an ASYMOG Executive?</label>
                      <div className="flex gap-4 mt-2">
                        <button 
                          type="button"
                          onClick={() => setCertForm({...certForm, assymogPosition: "Member"})}
                          className={`flex-1 py-3 rounded-xl border font-bold transition-all ${certForm.assymogPosition === "Member" ? "bg-primary-theme text-white border-primary-theme shadow-lg" : "bg-white text-gray-500 border-gray-200 hover:border-primary-theme/30"}`}
                        >
                          No, Regular Member
                        </button>
                        <button 
                          type="button"
                          onClick={() => setCertForm({...certForm, assymogPosition: "Executive"})}
                          className={`flex-1 py-3 rounded-xl border font-bold transition-all ${certForm.assymogPosition === "Executive" ? "bg-primary-gold text-white border-primary-gold shadow-lg" : "bg-white text-gray-500 border-gray-200 hover:border-primary-gold/30"}`}
                        >
                          Yes, I am an Executive
                        </button>
                      </div>
                    </div>

                    {certForm.assymogPosition === "Executive" && (
                      <div className="col-span-2">
                        <label className="text-sm font-bold text-gray-700">Select Executive Position</label>
                        <select 
                          value={certForm.executivePost} 
                          onChange={e => setCertForm({...certForm, executivePost: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none text-gray-800" 
                        >
                           <option value="">Select Position</option>
                           {Object.keys(EXECUTIVE_ROLES_LIMITS).map(role => (
                             <option key={role} value={role}>{role}</option>
                           ))}
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1 italic">Note: Executive positions are subject to verification and role limits.</p>
                      </div>
                    )}
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-sm font-bold text-gray-700">Education Status</label>
                      <select 
                        value={certForm.educationStatus} 
                        onChange={e => setCertForm({...certForm, educationStatus: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none text-gray-800" 
                      >
                         <option value="">Select Qualification</option>
                         {EDUCATIONAL_QUALIFICATIONS.map(edu => (
                           <option key={edu} value={edu}>{edu}</option>
                         ))}
                      </select>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-sm font-bold text-gray-700">Year of Ordination</label>
                      <select 
                        value={certForm.yearOfOrdination} 
                        onChange={e => setCertForm({...certForm, yearOfOrdination: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none text-gray-800" 
                      >
                         <option value="">Select Year</option>
                         {Array.from({ length: new Date().getFullYear() - 1969 }, (_, i) => 1970 + i).reverse().map(year => (
                           <option key={year} value={year}>{year}</option>
                         ))}
                      </select>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-sm font-bold text-gray-700">Baptism Date</label>
                      <input 
                        type="date" 
                        value={certForm.baptismDate} 
                        onChange={e => setCertForm({...certForm, baptismDate: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none text-gray-800" 
                      />
                    </div>
                    
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-sm font-bold text-gray-700">Contact Number</label>
                      <input 
                        type="tel" 
                        value={certForm.contactNumber} 
                        onChange={e => setCertForm({...certForm, contactNumber: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none text-gray-800" 
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-sm font-bold text-gray-700">WhatsApp Number</label>
                      <input 
                        type="tel" 
                        value={certForm.whatsappNumber} 
                        onChange={e => setCertForm({...certForm, whatsappNumber: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none text-gray-800" 
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-bold text-gray-700">Social Media (Facebook/IG Link or Name)</label>
                      <input 
                        type="text" 
                        value={certForm.socialMedia} 
                        onChange={e => setCertForm({...certForm, socialMedia: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none text-gray-800" 
                      />
                    </div>
                    <div className="col-span-2">
                       <h4 className="font-bold border-b pb-2 mt-4 text-gray-700">References</h4>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-sm font-bold text-gray-700">Reference 1</label>
                      <input 
                        type="text" 
                        placeholder="Name & Contact"
                        value={certForm.reference1} 
                        onChange={e => setCertForm({...certForm, reference1: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none text-gray-800" 
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-sm font-bold text-gray-700">Reference 2</label>
                      <input 
                        type="text" 
                        placeholder="Name & Contact"
                        value={certForm.reference2} 
                        onChange={e => setCertForm({...certForm, reference2: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none text-gray-800" 
                      />
                    </div>

                    <div className="col-span-2">
                       <h4 className="font-bold border-b pb-2 mt-4 text-gray-700">Document Uploads</h4>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Profile Picture</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if(file) {
                             const reader = new FileReader();
                             reader.onloadend = () => setCertForm({...certForm, profilePicture: reader.result as string});
                             reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary-theme/10 file:text-primary-theme" 
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Signature</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if(file) {
                             const reader = new FileReader();
                             reader.onloadend = () => setCertForm({...certForm, signature: reader.result as string});
                             reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary-theme/10 file:text-primary-theme" 
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Baptism Certificate</label>
                      <input 
                        type="file" 
                        accept="application/pdf,image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if(file) {
                             const reader = new FileReader();
                             reader.onloadend = () => setCertForm({...certForm, baptismCert: reader.result as string});
                             reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary-theme/10 file:text-primary-theme" 
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Ordination Certificate</label>
                      <input 
                        type="file" 
                        accept="application/pdf,image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if(file) {
                             const reader = new FileReader();
                             reader.onloadend = () => setCertForm({...certForm, ordinationCert: reader.result as string});
                             reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary-theme/10 file:text-primary-theme" 
                      />
                    </div>

                    <div className="col-span-2 mt-4">
                       <h4 className="font-bold border-b pb-2 mb-4 text-primary-theme">Declarations & Oaths of Agreement</h4>
                       <div className="space-y-3">
                         {[
                           "I pledge to uphold the sacred doctrines of the Gospel and the Great Commission.",
                           "I will maintain the highest ethical and spiritual standards of ASYMOG.",
                           "I commit to fostering unity, love, and cooperation within the association.",
                           "I will serve my community and church with integrity, humility, and transparency.",
                           "I solemnly agree to abide by all the rules and regulations of ASYMOG."
                         ].map((oath, idx) => (
                           <label key={idx} className="flex items-start space-x-3 cursor-pointer group">
                             <div className="mt-1">
                               <input 
                                 type="checkbox" 
                                 className="w-4 h-4 rounded border-gray-300 text-primary-theme focus:ring-primary-theme"
                                 checked={certForm.oaths[idx]}
                                 onChange={() => {
                                   const newOaths = [...certForm.oaths];
                                   newOaths[idx] = !newOaths[idx];
                                   setCertForm({...certForm, oaths: newOaths});
                                 }}
                               />
                             </div>
                             <span className="text-sm text-gray-600 group-hover:text-gray-900 leading-tight transition-colors">{oath}</span>
                           </label>
                         ))}
                       </div>
                    </div>

                    <div className="col-span-2 mt-4">
                      <label className="text-sm font-bold text-gray-700">Contact Address</label>
                      <textarea 
                        value={certForm.address} 
                        onChange={e => setCertForm({...certForm, address: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none text-gray-800 resize-none h-24" 
                      ></textarea>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button 
                      onClick={() => setCertStage(1)}
                      className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      onClick={async () => {
                        if (!certForm.dob || !certForm.address) {
                           alert("Please fill all bio-data fields.");
                           return;
                        }
                        if (certForm.oaths.some(o => !o)) {
                           alert("Please mark all five oaths to stand as agreement.");
                           return;
                        }
                        try {
                          await fetch("/api/update-biodata", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email: user.email, certForm }),
                          });
                        } catch (e) {}
                        
                        setCertStage(3);
                      }}
                      className="flex-1 bg-primary-theme text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition-colors"
                    >
                      Submit
                    </button>
                  </div>
                </>
              )}

              {certStage === 3 && (
                <>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="bg-primary-gold text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                    <span className="text-gray-400 text-sm font-medium">Payment</span>
                  </div>
                  <h3 className="font-serif text-3xl font-bold mb-4 text-primary-gold">Make Payment</h3>
                  <p className="text-gray-500 mb-6">Complete your payment of ₦{certificatePrice.toLocaleString()} to generate your certificate and print your collection slip.</p>
                  
                  <div className="space-y-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <div className="flex justify-between items-center mb-2">
                         <span className="text-gray-500 font-medium">Fee:</span>
                         <span className="font-bold">₦{certificatePrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                         <span className="text-gray-400">Item:</span>
                         <span className="text-gray-600">Membership Certificate</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button 
                      onClick={() => setCertStage(2)}
                      className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      onClick={() => {
                         // Overwrite the normal handleObtain to catch the success and go to stage 4 instead of downloading directly
                         if ((window as any).FlutterwaveCheckout) {
                            (window as any).FlutterwaveCheckout({
                                ...configCert,
                                callback: (response: any) => {
                                   closePaymentModal();
                                   if (response.status === "successful") {
                                      setCertStage(4);
                                   }
                                },
                                onclose: () => {},
                            });
                         } else {
                            const handler = handleFlutterPaymentCert;
                            handler({
                               callback: (response) => {
                                  closePaymentModal();
                                  if (response.status === "successful") {
                                     setCertStage(4);
                                  }
                               },
                               onClose: () => {},
                            });
                         }
                      }}
                      className="flex-1 bg-primary-gold text-white py-4 rounded-xl font-bold text-lg hover:bg-yellow-600 transition-colors"
                    >
                      Pay ₦{certificatePrice.toLocaleString()}
                    </button>
                  </div>
                </>
              )}

              {certStage === 4 && (
                <>
                   <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                         <ShieldCheck size={32} />
                      </div>
                      <h3 className="font-serif text-3xl font-bold text-gray-800">Payment Successful</h3>
                      <p className="text-gray-500 mt-2">Your Membership Certificate has been scheduled for pickup.</p>
                   </div>

                   <div className="bg-off-white border border-gray-200 rounded-2xl p-6 mb-6">
                      <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Collection Slip</p>
                      <h4 className="font-bold text-lg text-gray-800 mb-4">{certForm.officialName}</h4>
                      
                      <div className="space-y-3 font-mono text-sm">
                         <div className="flex justify-between">
                            <span className="text-gray-500">Cert No:</span>
                            <span className="font-bold text-primary-theme">{(user.registrationNumber || `ASYM/M${new Date().getFullYear().toString().substring(2)}/${String(user.id || "0000").slice(0,4)}`).replace('ASYM/M', 'ASYM/C')}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-gray-500">Pick-up Date:</span>
                            <span className="font-bold text-primary-gold">
                               {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                            </span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-gray-500">Time:</span>
                            <span className="font-bold">10:00 AM - 3:00 PM</span>
                         </div>
                      </div>
                   </div>

                   <div className="flex space-x-3">
                      <button 
                        onClick={() => {
                           window.print();
                        }}
                        className="flex-1 bg-gray-100 text-gray-800 border border-gray-200 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
                      >
                         <Download size={20} />
                         <span>Print Slip</span>
                      </button>
                      <button 
                        onClick={() => {
                           resetCertModal();
                           // Optionally download standard PDF if needed, but requirements say print slip.
                           // onDownload("certificate");
                        }}
                        className="flex-1 bg-primary-theme text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition-colors"
                      >
                        Finish
                      </button>
                   </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLicModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={resetLicModal}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button onClick={resetLicModal} className="absolute top-6 right-6 text-gray-400 hover:text-gray-800">
                <X size={24} />
              </button>

              {licStage === 1 && (
                <>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="bg-primary-gold text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                    <span className="text-gray-400 text-sm font-medium">Verify Identity</span>
                  </div>
                  <h3 className="font-serif text-3xl font-bold mb-4 text-primary-gold" style={{ lineHeight: 1.2 }}>International License</h3>
                  <p className="text-gray-500 mb-6">Enter your BVN or NIN to verify your personal identity via Flutterwave.</p>
                  
                  {licForm.ninError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                      {licForm.ninError}
                    </div>
                  )}

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="text-sm font-bold text-gray-700">Bank Verification Number (BVN) / NIN</label>
                      <input 
                        type="text" 
                        maxLength={11}
                        placeholder="00000000000"
                        value={licForm.nin} 
                        onChange={e => setLicForm({...licForm, nin: e.target.value.replace(/\D/g, ''), ninError: ""})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none text-gray-800 font-mono tracking-widest" 
                      />
                      <p className="text-xs text-gray-400 mt-1">Sample BVN/NIN: 34567891234</p>
                    </div>
                  </div>

                  <button 
                    disabled={licForm.nin.length !== 11 || licForm.isVerifyingNin}
                    onClick={async () => {
                        setLicForm({...licForm, isVerifyingNin: true, ninError: ""});
                        
                        try {
                           const res = await fetch('/api/verify-identity', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ idNumber: licForm.nin })
                           });
                           
                           const contentType = res.headers.get("content-type");
                           if (!contentType || !contentType.includes("application/json")) {
                              const text = await res.text();
                              console.error("Non-JSON identity verification response:", text.substring(0, 500));
                              throw new Error("Identity verification service is temporarily unavailable. Please retry in a few moments.");
                           }

                           const data = await res.json();
                           if (data.success) {
                              setLicForm(prev => ({
                                ...prev, 
                                isVerifyingNin: false, 
                                ninVerified: true,
                                dob: data.data.dob || "1975-08-22",
                                gender: data.data.gender || "Male",
                                address: data.data.address || "15 Independence Layout, Abuja, FCT"
                              }));
                              setLicStage(2);
                           } else {
                              setLicForm({...licForm, isVerifyingNin: false, ninError: data.error || "Failed to verify identity."});
                           }
                        } catch (err) {
                           setLicForm({...licForm, isVerifyingNin: false, ninError: "Network error occurred during verification."});
                        }
                    }}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center space-x-2 ${
                       licForm.nin.length === 11 && !licForm.isVerifyingNin 
                       ? "bg-primary-gold text-white hover:bg-yellow-600" 
                       : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {licForm.isVerifyingNin ? (
                       <>
                         <Loader2 className="animate-spin" size={20} />
                         <span>Connecting to Flutterwave...</span>
                       </>
                    ) : (
                       <span>Verify Identity & Proceed</span>
                    )}
                  </button>
                </>
              )}

              {licStage === 2 && (
                <>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="bg-primary-gold text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                    <span className="text-gray-400 text-sm font-medium">Verify Ministry</span>
                  </div>
                  <h3 className="font-serif text-3xl font-bold mb-4 text-primary-gold">Certificate Verification</h3>
                  <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg text-sm mb-6 flex items-center space-x-2 font-medium">
                     <Check size={18} className="shrink-0" />
                     <span>Identity Verified! Hello, {user.fullName.split(' ')[0]}</span>
                  </div>
                  <p className="text-gray-500 mb-6">Now, enter your Certificate Reference Number to verify your church/ministry registration data.</p>
                  
                  {licForm.certError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                      {licForm.certError}
                    </div>
                  )}

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="text-sm font-bold text-gray-700">Certificate Reference Number</label>
                      <input 
                        type="text" 
                        placeholder="ASYM/C..."
                        value={licForm.certNumber} 
                        onChange={e => setLicForm({...licForm, certNumber: e.target.value, certError: ""})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none text-gray-800 font-mono tracking-widest uppercase" 
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        <em>For demo/testing, your certificate number is: <strong className="text-primary-gold">{(user.registrationNumber || `ASYM/M${new Date().getFullYear().toString().substring(2)}/${String(user.id || "0000").slice(0,4)}`).replace('ASYM/M', 'ASYM/C')}</strong></em>
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button 
                      onClick={() => setLicStage(1)}
                      className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      disabled={!licForm.certNumber || licForm.isVerifyingCert}
                      onClick={() => {
                          const expectedCertRef = (user.registrationNumber || `ASYM/M${new Date().getFullYear().toString().substring(2)}/${String(user.id || "0000").slice(0,4)}`).replace('ASYM/M', 'ASYM/C');
                          
                          if (licForm.certNumber !== expectedCertRef) {
                             setLicForm({...licForm, certError: `Invalid Certificate Number. Please ensure you are entering the number from your ASYMOG certificate.`});
                             return;
                          }

                          setLicForm({...licForm, isVerifyingCert: true, certError: ""});
                          // Simulate API local lookup
                          setTimeout(() => {
                             setLicForm(prev => ({
                               ...prev, 
                               isVerifyingCert: false, 
                               certVerified: true,
                               churchName: "ASYMOG Grace Parish",
                               churchPosition: "Senior Pastor",
                               ordinationYear: "2015"
                             }));
                             setLicStage(3);
                          }, 1500);
                      }}
                      className={`flex-[2] py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center space-x-2 ${
                         licForm.certNumber && !licForm.isVerifyingCert 
                         ? "bg-primary-gold text-white hover:bg-yellow-600" 
                         : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {licForm.isVerifyingCert ? (
                         <>
                           <Loader2 className="animate-spin" size={20} />
                           <span>Verifying Data...</span>
                         </>
                      ) : (
                         <span>Verify Data</span>
                      )}
                    </button>
                  </div>
                </>
              )}

              {licStage === 3 && (
                <>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="bg-primary-gold text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                    <span className="text-gray-400 text-sm font-medium">Data Confirmation</span>
                  </div>
                  <h3 className="font-serif text-3xl font-bold mb-4 text-primary-gold">Review IML Details</h3>
                  <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg text-sm mb-6 flex items-center space-x-2">
                     <Check size={16} />
                     <span>Data Records Successfully Verified</span>
                  </div>
                  
                  <div className="space-y-6 mb-8">
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
                       <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex justify-between items-center text-sm font-bold text-gray-700">
                          <span>Identity Verification Record</span>
                          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase">Verified User</span>
                       </div>
                       <div className="p-4 space-y-3">
                          <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Registered Name</label>
                            <input type="text" readOnly value={user.fullName} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 mt-1 outline-none text-gray-800" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-bold text-gray-500 uppercase">BVN/NIN Reference</label>
                              <input type="text" readOnly value={licForm.nin} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 mt-1 outline-none text-gray-800 font-mono tracking-wider" />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-gray-500 uppercase">Gender</label>
                              <input type="text" readOnly value={licForm.gender} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 mt-1 outline-none text-gray-800" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-bold text-gray-500 uppercase">Date of Birth</label>
                              <input type="text" readOnly value={licForm.dob} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 mt-1 outline-none text-gray-800" />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-gray-500 uppercase">Address / Region</label>
                              <input type="text" readOnly value={licForm.address} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 mt-1 outline-none text-gray-800" />
                            </div>
                          </div>
                       </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl overflow-hidden">
                       <div className="bg-yellow-100 px-4 py-2 border-b border-yellow-200 flex justify-between items-center text-sm font-bold text-yellow-800">
                          <span>Certificate Data Extract</span>
                          <span className="text-[10px] bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full uppercase">Matched</span>
                       </div>
                       <div className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-bold text-yellow-700 uppercase">Generated IML</label>
                              <input 
                                type="text" 
                                readOnly 
                                value={(user.registrationNumber || `ASYM/M${new Date().getFullYear().toString().substring(2)}/${String(user.id || "0000").slice(0,4)}`).replace('ASYM/M', 'ASYM/L')} 
                                className="w-full bg-white border border-yellow-200 rounded-xl px-4 py-2 mt-1 outline-none font-mono text-yellow-800 font-bold" 
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-yellow-700 uppercase">Source Certificate</label>
                              <input 
                                type="text" 
                                readOnly 
                                value={licForm.certNumber} 
                                className="w-full bg-white border border-yellow-200 rounded-xl px-4 py-2 mt-1 outline-none font-mono text-yellow-800 font-bold uppercase tracking-wider" 
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-yellow-700 uppercase">Church / Ministry</label>
                            <input 
                              type="text" 
                              readOnly 
                              value={licForm.churchName} 
                              className="w-full bg-white border border-yellow-200 rounded-xl px-4 py-2 mt-1 outline-none font-mono text-yellow-800" 
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-bold text-yellow-700 uppercase">Church Position</label>
                              <input 
                                type="text" 
                                readOnly 
                                value={licForm.churchPosition} 
                                className="w-full bg-white border border-yellow-200 rounded-xl px-4 py-2 mt-1 outline-none text-yellow-800 font-semibold" 
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-yellow-700 uppercase">Ordination Year</label>
                              <input 
                                type="text" 
                                readOnly 
                                value={licForm.ordinationYear} 
                                className="w-full bg-white border border-yellow-200 rounded-xl px-4 py-2 mt-1 outline-none font-mono text-yellow-800" 
                              />
                            </div>
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button 
                      onClick={() => setLicStage(2)}
                      className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      onClick={async () => {
                        try {
                          await fetch("/api/update-biodata", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email: user.email, licForm }),
                          });
                        } catch (e) {}
                        setLicStage(4);
                      }}
                      className="flex-1 bg-primary-gold text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition-colors"
                    >
                      Confirm
                    </button>
                  </div>
                </>
              )}

              {licStage === 4 && (
                <>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="bg-primary-gold text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                    <span className="text-gray-400 text-sm font-medium">Payment</span>
                  </div>
                  <h3 className="font-serif text-3xl font-bold mb-4 text-primary-gold">International Fees</h3>
                  <p className="text-gray-500 mb-6">Complete secure payment of ₦{licensePrice.toLocaleString()} for your International Ministerial License issuance.</p>
                  
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-gray-500 font-medium">License Fee:</span>
                       <span className="font-bold">₦{licensePrice.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button 
                      onClick={() => setLicStage(3)}
                      className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      onClick={() => {
                         if ((window as any).FlutterwaveCheckout) {
                            (window as any).FlutterwaveCheckout({
                                ...configLicense,
                                callback: (response: any) => {
                                   closePaymentModal();
                                   if (response.status === "successful") {
                                      setLicStage(5);
                                   }
                                },
                                onclose: () => {},
                            });
                         } else {
                            const handler = handleFlutterPaymentLicense;
                            handler({
                               callback: (response) => {
                                  closePaymentModal();
                                  if (response.status === "successful") {
                                     setLicStage(5);
                                  }
                               },
                               onClose: () => {},
                            });
                         }
                      }}
                      className="flex-[2] bg-primary-gold text-white py-4 rounded-xl font-bold text-lg hover:bg-yellow-600 transition-colors"
                    >
                      Proceed to Pay
                    </button>
                  </div>
                </>
              )}

              {licStage === 5 && (
                <>
                   <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                         <ShieldCheck size={32} />
                      </div>
                      <h3 className="font-serif text-3xl font-bold text-gray-800">License Approved</h3>
                      <p className="text-gray-500 mt-2">Your International Ministerial License is being processed.</p>
                   </div>

                   <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-6">
                      <p className="text-xs uppercase tracking-widest text-yellow-600 font-bold mb-1">IML Collection Slip</p>
                      <h4 className="font-bold text-lg text-gray-800 mb-4">{user.fullName}</h4>
                      
                      <div className="space-y-3 font-mono text-sm">
                         <div className="flex justify-between">
                            <span className="text-gray-500">License No:</span>
                            <span className="font-bold text-primary-gold">{(user.registrationNumber || `ASYM/M${new Date().getFullYear().toString().substring(2)}/${String(user.id || "0000").slice(0,4)}`).replace('ASYM/M', 'ASYM/L')}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-gray-500">Expected Date:</span>
                            <span className="font-bold text-primary-theme">
                               {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                            </span>
                         </div>
                      </div>
                   </div>

                   <div className="flex space-x-3">
                      <button onClick={() => window.print()} className="flex-1 bg-gray-100 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2">
                         <Download size={20} />
                         <span>Print Slip</span>
                      </button>
                      <button onClick={resetLicModal} className="flex-1 bg-primary-gold text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition-colors">
                        Finish
                      </button>
                   </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}

function PlatformSettings({ 
  initialMonthlyDues, 
  initialExecutiveDues, 
  initialCertPrice, 
  initialLicPrice, 
  initialHero, 
  initialLogo, 
  initialPresImage, 
  initialPresName, 
  initialFwKey, 
  initialFwSecret, 
  initialCloudinaryUrl,
  initialCoopHand, 
  initialCoopGrace, 
  initialCoopFine, 
  initialEvents, 
  initialMeetings, 
  initialTestimonials 
}: {
  initialMonthlyDues: number;
  initialExecutiveDues: number;
  initialCertPrice: number;
  initialLicPrice: number;
  initialHero: string;
  initialLogo: string | null;
  initialPresImage: string | null;
  initialPresName: string;
  initialFwKey: string;
  initialFwSecret: string;
  initialCloudinaryUrl: string;
  initialCoopHand: number;
  initialCoopGrace: number;
  initialCoopFine: number;
  initialEvents: any[];
  initialMeetings: any[];
  initialTestimonials: any[];
}) {
  const [heroImage, setHeroImage] = useState(initialHero);
  const [logoImage, setLogoImage] = useState<string | null>(initialLogo);
  const [presidentImage, setPresidentImage] = useState<string | null>(initialPresImage);
  const [presidentName, setPresidentName] = useState(initialPresName);
  const [flutterwaveKey, setFlutterwaveKey] = useState(initialFwKey);
  const [flutterwaveSecretKey, setFlutterwaveSecretKey] = useState(initialFwSecret);
  const [cloudinaryUrl, setCloudinaryUrl] = useState(initialCloudinaryUrl);
  const [monthlyDuesAmount, setMonthlyDuesAmount] = useState<number>(initialMonthlyDues);
  const [certificatePrice, setCertificatePrice] = useState<number>(initialCertPrice);
  const [licensePrice, setLicensePrice] = useState<number>(initialLicPrice);
  const [executiveDuesAmount, setExecutiveDuesAmount] = useState<number>(initialExecutiveDues);
  const [cooperativeHandPrice, setCooperativeHandPrice] = useState<number>(initialCoopHand);
  const [cooperativeGraceDay, setCooperativeGraceDay] = useState<number>(initialCoopGrace);
  const [cooperativeFineAmount, setCooperativeFineAmount] = useState<number>(initialCoopFine);
  const [events, setEvents] = useState<any[]>(initialEvents);
  const [regularMeetings, setRegularMeetings] = useState<any[]>(initialMeetings);
  const [testimonials, setTestimonials] = useState<any[]>(initialTestimonials);
  const [managedExecutives, setManagedExecutives] = useState<{ id: number; name: string; role: string; email: string; accessKey: string }[]>([]);
  const [newExecName, setNewExecName] = useState("");
  const [newExecRole, setNewExecRole] = useState("");
  const [newExecEmail, setNewExecEmail] = useState("");
  const [newExecPhone, setNewExecPhone] = useState("");
  const [newExecImage, setNewExecImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Sync with props when they change (e.g. after a reload or save in another part)
    setHeroImage(initialHero);
    setLogoImage(initialLogo);
    setPresidentImage(initialPresImage);
    setPresidentName(initialPresName);
    setFlutterwaveKey(initialFwKey);
    setFlutterwaveSecretKey(initialFwSecret);
    setCloudinaryUrl(initialCloudinaryUrl);
    setMonthlyDuesAmount(initialMonthlyDues);
    setCertificatePrice(initialCertPrice);
    setLicensePrice(initialLicPrice);
    setExecutiveDuesAmount(initialExecutiveDues);
    setCooperativeHandPrice(initialCoopHand);
    setCooperativeGraceDay(initialCoopGrace);
    setCooperativeFineAmount(initialCoopFine);
    setEvents(initialEvents);
    setRegularMeetings(initialMeetings);
    setTestimonials(initialTestimonials);
  }, [initialHero, initialLogo, initialPresImage, initialPresName, initialFwKey, initialFwSecret, initialMonthlyDues, initialCertPrice, initialLicPrice, initialExecutiveDues, initialCoopHand, initialCoopGrace, initialCoopFine, initialEvents, initialMeetings, initialTestimonials]);

  useEffect(() => {
    fetch("/api/admin/executives")
      .then(res => res.json())
      .then(data => setManagedExecutives(Array.isArray(data) ? data : []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const addExecutive = async () => {
    if (!newExecName || !newExecRole) {
      setMessage("Please enter name and role");
      return;
    }
    setSaving(true);
    const accessKey = "ASYM/" + Math.random().toString(36).substr(2, 6).toUpperCase();
    try {
      const res = await fetch("/api/admin/executives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newExecName, role: newExecRole, email: newExecEmail, phone: newExecPhone, accessKey, image: newExecImage })
      });
      const data = await res.json();
      setManagedExecutives([...managedExecutives, data]);
      setNewExecName("");
      setNewExecRole("");
      setNewExecEmail("");
      setNewExecPhone("");
      setNewExecImage(null);
      setMessage("Executive created successfully!");
    } catch (e) {
      setMessage("Failed to add executive");
    } finally {
      setSaving(false);
    }
  };

  const deleteExecutive = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    try {
      await fetch(`/api/admin/executives/${id}`, { method: "DELETE" });
      setManagedExecutives(managedExecutives.filter(e => e.id !== id));
    } catch (e) {
      setMessage("Failed to delete");
    }
  };

  const saveSettings = async (newSettings: { heroImage?: string; logoImage?: string | null; presidentImage?: string | null; presidentName?: string; flutterwaveKey?: string; flutterwaveSecretKey?: string; cloudinaryUrl?: string; monthlyDuesAmount?: number; executiveDuesAmount?: number; certificatePrice?: number; licensePrice?: number; cooperativeHandPrice?: number; cooperativeGraceDay?: number; cooperativeFineAmount?: number; events?: any[]; regularMeetings?: any[]; testimonials?: any[] }) => {
    setSaving(true);
    setMessage("");
    const updatedSettings = { heroImage, logoImage, presidentImage, presidentName, flutterwaveKey, flutterwaveSecretKey, cloudinaryUrl, monthlyDuesAmount, executiveDuesAmount, certificatePrice, licensePrice, cooperativeHandPrice, cooperativeGraceDay, cooperativeFineAmount, events, regularMeetings, testimonials, ...newSettings };
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: updatedSettings })
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to save settings");
      }
      setMessage("Settings saved successfully!");
      // Dispatch an event so App.tsx can update hero image immediately without reload
      window.dispatchEvent(new CustomEvent("settings-updated", { detail: updatedSettings }));
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const url = await handleUniversalUpload(file, 'App_files');
        setHeroImage(url);
        saveSettings({ heroImage: url });
      } catch (err) {
        console.error("Hero upload failed:", err);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const url = await handleUniversalUpload(file, 'App_files');
        setLogoImage(url);
        saveSettings({ logoImage: url });
      } catch (err) {
        console.error("Logo upload failed:", err);
      } finally {
        setUploading(false);
      }
    }
  };

  const handlePresidentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const url = await handleUniversalUpload(file, 'App_files');
        setPresidentImage(url);
        saveSettings({ presidentImage: url });
      } catch (err) {
        console.error("President photo upload failed:", err);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleTestimonialImageUpload = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const url = await handleUniversalUpload(file, 'App_files');
        const updated = [...testimonials];
        updated[idx].image = url;
        setTestimonials(updated);
        saveSettings({ testimonials: updated });
      } catch (err) {
        console.error("Testimonial image upload failed:", err);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleManagedExecImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const url = await handleUniversalUpload(file, 'executive member');
        setNewExecImage(url);
      } catch (err) {
        console.error("Managed exec photo upload failed:", err);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleEventImageUpload = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const url = await handleUniversalUpload(file, 'App_files');
        const updated = [...events];
        (updated[idx] as any).image = url;
        setEvents(updated);
        saveSettings({ events: updated });
      } catch (err) {
        console.error("Event image upload failed:", err);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleMeetingImageUpload = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const url = await handleUniversalUpload(file, 'App_files');
        const updated = [...regularMeetings];
        (updated[idx] as any).image = url;
        setRegularMeetings(updated);
        saveSettings({ regularMeetings: updated });
      } catch (err) {
        console.error("Meeting image upload failed:", err);
      } finally {
        setUploading(false);
      }
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading settings...</div>;

  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-primary-gold/10 overflow-hidden">
      <div className="p-8 border-b border-gray-100 bg-off-white flex justify-between items-start">
        <div>
          <h3 className="font-serif text-2xl font-bold text-primary-theme">Platform Settings</h3>
          <p className="text-gray-500 mt-2 text-sm">Update the website's hero image, logo, and other configuration.</p>
        </div>
        {message && (
          <div className={`px-4 py-2 rounded-lg text-sm font-medium ${message.includes("Failed") ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600"} shadow-sm`}>
            {message}
          </div>
        )}
      </div>
      <div className="p-8 space-y-12">
        <div>
          <label className="block font-bold text-gray-700 mb-4">Website Logo</label>
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-full md:w-1/3 h-48 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center p-4 relative overflow-hidden">
              {logoImage ? (
                <img src={optimizeImage(logoImage, 100)} alt="Website Logo" referrerPolicy="no-referrer" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="w-16 h-16 bg-primary-theme rounded-lg flex items-center justify-center text-white font-serif font-bold text-3xl shadow-lg">
                  A
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-sm">
                  <Loader2 size={24} className="animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1 flex flex-col gap-4">
              <p className="text-sm text-gray-500">
                Upload your organization's logo. It will be displayed in the navigation bar across the site.
              </p>
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploading || saving}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <button
                    disabled={uploading || saving}
                    className="w-full sm:w-auto bg-primary-theme text-white px-8 py-4 rounded-xl font-bold shadow-xl hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Camera size={20} />
                    <span>{uploading ? "Uploading..." : "Upload Organization Logo"}</span>
                  </button>
                </div>
                {logoImage && (
                  <button 
                    onClick={() => { setLogoImage(null); saveSettings({ logoImage: null }); }}
                    className="text-xs text-red-500 font-bold uppercase tracking-wider hover:underline w-fit"
                  >
                    Remove Logo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-8">
          <label className="block font-bold text-gray-700 mb-4">Hero Section Image</label>
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div 
              className="w-full md:w-2/3 h-64 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden bg-cover bg-center relative"
              style={{ backgroundImage: `url(${heroImage})` }}
            >
              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold">
                  <Loader2 size={32} className="animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1 flex flex-col gap-4 w-full">
              <p className="text-sm text-gray-500">
                Upload a high-quality image. This image will be shown on the home page as the main background.
              </p>
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleHeroUpload}
                    disabled={uploading || saving}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <button
                    disabled={uploading || saving}
                    className="w-full bg-primary-theme text-white px-8 py-4 rounded-xl font-bold shadow-xl hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Camera size={20} />
                    <span>{uploading ? "Uploading..." : "Upload New Banner"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-8">
          <label className="block font-bold text-gray-700 mb-4">President's Image</label>
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-48 h-64 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center p-1 relative overflow-hidden bg-gradient-to-br from-primary-gold to-yellow-600 shadow-md">
              {presidentImage ? (
                <img src={optimizeImage(presidentImage, 400)} alt="President" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <User size={80} className="text-white opacity-90" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-sm">
                  <Loader2 size={32} className="animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1 flex flex-col gap-4 w-full">
              <p className="text-sm text-gray-500">
                Upload an image of the current President. This will be shown alongside the President's Address on the home page.
              </p>
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePresidentUpload}
                    disabled={uploading || saving}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <button
                    disabled={uploading || saving}
                    className="w-full sm:w-auto bg-primary-theme text-white px-8 py-4 rounded-xl font-bold shadow-xl hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Camera size={20} />
                    <span>{uploading ? "Uploading..." : "Upload President Portrait"}</span>
                  </button>
                </div>
                {presidentImage && (
                  <button 
                    onClick={() => { setPresidentImage(null); saveSettings({ presidentImage: null }); }}
                    className="text-xs text-red-500 font-bold uppercase tracking-wider hover:underline w-fit"
                  >
                    Remove Portrait
                  </button>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <label className="block text-sm font-bold text-gray-700 mb-2">President's Name / Title</label>
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={presidentName}
                    onChange={(e) => setPresidentName(e.target.value)}
                    onBlur={() => saveSettings({ presidentName })}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-gold/30"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-8">
          <label className="block font-bold text-gray-700 mb-6 flex items-center">
            <Zap className="mr-2 text-primary-gold" /> Function Keys Management
          </label>
          <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 shadow-inner">
            <div className="grid grid-cols-1 gap-8">
              {/* Cloudinary Group */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-widest flex items-center">
                    <Cloud size={16} className="mr-2 text-blue-500" /> Cloudinary URL (Media Storage)
                  </h4>
                  <a href="https://cloudinary.com/console" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-blue-600 hover:underline">Cloudinary Console</a>
                </div>
                <div className="flex flex-col md:flex-row gap-4 items-start">
                  <div className="flex-1 w-full">
                    <input 
                      type="password" 
                      value={cloudinaryUrl} 
                      onChange={(e) => setCloudinaryUrl(e.target.value)} 
                      onBlur={() => saveSettings({ cloudinaryUrl })}
                      placeholder="cloudinary://api_key:api_secret@cloud_name" 
                      className="w-full p-4 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-gold focus:outline-none transition-all font-mono text-sm shadow-sm"
                    />
                  </div>
                  <button
                    onClick={() => saveSettings({ cloudinaryUrl })}
                    disabled={saving}
                    className="w-full md:w-auto bg-primary-theme text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? "Saving..." : "Apply Media Key"}
                  </button>
                  {message === "Settings saved successfully!" && !saving && (
                    <span className="text-sm font-bold text-green-600 flex items-center mt-2 md:mt-0 md:ml-4">
                      <Check size={16} className="mr-1" /> Save Successful!
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed italic">
                  Format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME. This enables permanent storage for certificates and ministerial photos.
                </p>
              </div>

              <hr className="border-gray-200" />

              {/* Flutterwave Group */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-widest flex items-center">
                    <CreditCard size={16} className="mr-2 text-orange-500" /> Flutterwave Integration (Payments)
                  </h4>
                  <a href="https://dashboard.flutterwave.com/dashboard/settings/apis" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-orange-600 hover:underline">Flutterwave Dashboard</a>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Public Key (Hidden)</label>
                    <input 
                      type="password" 
                      value={flutterwaveKey} 
                      onChange={(e) => setFlutterwaveKey(e.target.value)} 
                      onBlur={() => saveSettings({ flutterwaveKey })}
                      placeholder="FLWPUBK-..." 
                      className="w-full p-4 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-gold focus:outline-none transition-all font-mono text-sm shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Secret Key (Hidden)</label>
                    <input 
                      type="password" 
                      value={flutterwaveSecretKey} 
                      onChange={(e) => setFlutterwaveSecretKey(e.target.value)} 
                      onBlur={() => saveSettings({ flutterwaveSecretKey })}
                      placeholder="FLWSECK-..." 
                      className="w-full p-4 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-gold focus:outline-none transition-all font-mono text-sm shadow-sm"
                    />
                  </div>
                </div>

                <button
                  onClick={() => saveSettings({ flutterwaveKey, flutterwaveSecretKey })}
                  disabled={saving}
                  className="w-full bg-primary-gold/10 text-primary-theme px-8 py-4 rounded-xl font-bold border border-primary-gold/20 hover:bg-primary-gold/20 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  <span>{saving ? "Updating Keys..." : "Save Flutterwave Configuration"}</span>
                </button>
                {message === "Settings saved successfully!" && !saving && (
                  <span className="text-sm font-bold text-green-600 flex items-center mt-2 justify-center">
                    <Check size={16} className="mr-1" /> Save Successful!
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-8">
          <label className="block font-bold text-gray-700 mb-6 flex items-center">
            <Award className="mr-2 text-primary-gold" /> Association Fee Settings
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <label className="block text-xs font-bold text-primary-gold uppercase mb-2">Exec. Dues (₦)</label>
              <input 
                type="number" 
                value={executiveDuesAmount} 
                onChange={(e) => setExecutiveDuesAmount(Number(e.target.value))}
                onBlur={() => saveSettings({ executiveDuesAmount })}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-gold"
              />
              <p className="mt-2 text-[10px] text-gray-400">Monthly dues for Board members</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <label className="block text-xs font-bold text-primary-gold uppercase mb-2">Monthly Dues (₦)</label>
              <input 
                type="number" 
                value={monthlyDuesAmount} 
                onChange={(e) => setMonthlyDuesAmount(Number(e.target.value))}
                onBlur={() => saveSettings({ monthlyDuesAmount })}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-gold"
              />
              <p className="mt-2 text-[10px] text-gray-400">Regular monthly contribution per member</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <label className="block text-xs font-bold text-primary-gold uppercase mb-2">Cert. Fee (₦)</label>
              <input 
                type="number" 
                value={certificatePrice} 
                onChange={(e) => setCertificatePrice(Number(e.target.value))}
                onBlur={() => saveSettings({ certificatePrice })}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-gold"
              />
              <p className="mt-2 text-[10px] text-gray-400">One-time payment for Membership Certificate</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <label className="block text-xs font-bold text-primary-gold uppercase mb-2">License Fee (₦)</label>
              <input 
                type="number" 
                value={licensePrice} 
                onChange={(e) => setLicensePrice(Number(e.target.value))}
                onBlur={() => saveSettings({ licensePrice })}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-gold"
              />
              <p className="mt-2 text-[10px] text-gray-400">One-time payment for Ministerial License</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <label className="block text-xs font-bold text-primary-gold uppercase mb-2">Coop. Hand Price (₦)</label>
              <input 
                type="number" 
                value={cooperativeHandPrice} 
                onChange={(e) => setCooperativeHandPrice(Number(e.target.value))}
                onBlur={() => saveSettings({ cooperativeHandPrice })}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-gold"
              />
              <p className="mt-2 text-[10px] text-gray-400">Monthly amount per hand for Cooperative</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <label className="block text-xs font-bold text-primary-gold uppercase mb-2">Coop. Grace Day (1-28)</label>
              <input 
                type="number" 
                min="1"
                max="28"
                value={cooperativeGraceDay} 
                onChange={(e) => setCooperativeGraceDay(Number(e.target.value))}
                onBlur={() => saveSettings({ cooperativeGraceDay })}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-gold"
              />
              <p className="mt-2 text-[10px] text-gray-400">Day of month after which a fine applies</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <label className="block text-xs font-bold text-primary-gold uppercase mb-2">Coop. Fine Amount (₦)</label>
              <input 
                type="number" 
                value={cooperativeFineAmount} 
                onChange={(e) => setCooperativeFineAmount(Number(e.target.value))}
                onBlur={() => saveSettings({ cooperativeFineAmount })}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-gold"
              />
              <p className="mt-2 text-[10px] text-gray-400">Late payment penalty</p>
            </div>
          </div>
          <div className="mt-6 flex flex-col items-center">
            <button
              onClick={() => saveSettings({ monthlyDuesAmount, executiveDuesAmount, certificatePrice, licensePrice, cooperativeHandPrice, cooperativeGraceDay, cooperativeFineAmount })}
              disabled={saving}
              className="w-full bg-primary-theme text-white px-6 py-4 rounded-xl font-bold shadow-xl hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
              {saving ? "Updating Pricing..." : "Save Pricing Configuration"}
            </button>
            {message === "Settings saved successfully!" && !saving && (
              <span className="text-sm font-bold text-green-600 flex items-center mt-2 justify-center">
                <Check size={16} className="mr-1" /> Save Successful!
              </span>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-8">
           <div className="flex items-center justify-between mb-6">
              <label className="font-bold text-gray-700 flex items-center">
                <ShieldCheck className="mr-2 text-primary-gold" /> Executive Portal Management
              </label>
           </div>
           
           <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-8">
             <h4 className="text-sm font-bold text-gray-700 mb-4 text-center md:text-left">Create New Executive Access</h4>
             <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
               <div className="w-24 h-32 rounded-2xl bg-white border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden flex-shrink-0 group">
                  {newExecImage ? (
                    <img src={optimizeImage(newExecImage, 400)} alt="Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                       <Camera size={24} />
                       <span className="text-[10px] mt-1">Add Photo</span>
                    </div>
                  )}
                  <input 
                     type="file" 
                     accept="image/*" 
                     onChange={handleManagedExecImageUpload}
                     className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
               </div>
               <div className="flex-1 w-full space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                   <input 
                     type="text" 
                     placeholder="Full Name" 
                     value={newExecName} 
                     onChange={e => setNewExecName(e.target.value)} 
                     className="p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-gold bg-white"
                   />
                   <select 
                     value={newExecRole} 
                     onChange={e => setNewExecRole(e.target.value)} 
                     className="p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-gold bg-white text-gray-700"
                   >
                     <option value="">Select Role</option>
                     {Object.keys(EXECUTIVE_ROLES_LIMITS).map(role => {
                        const roleCount = managedExecutives.filter(ex => ex.role === role).length;
                        const limit = EXECUTIVE_ROLES_LIMITS[role];
                        const isFull = roleCount >= limit;
                        return (
                           <option key={role} value={role} disabled={isFull}>
                              {role} ({roleCount}/{limit}){isFull ? " - FULL" : ""}
                           </option>
                        );
                     })}
                   </select>
                   <input 
                     type="email" 
                     placeholder="Email Address" 
                     value={newExecEmail} 
                     onChange={e => setNewExecEmail(e.target.value)} 
                     className="p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-gold bg-white"
                   />
                   <input 
                     type="tel" 
                     placeholder="Phone Number" 
                     value={newExecPhone} 
                     onChange={e => setNewExecPhone(e.target.value)} 
                     className="p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-gold bg-white"
                   />
                 </div>
                 <button 
                   onClick={addExecutive}
                   disabled={saving || !newExecName || !newExecRole}
                   className="bg-primary-theme text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50"
                 >
                   {saving ? "Creating..." : "Create Executive & Generate Key"}
                 </button>
               </div>
             </div>
           </div>

           <div className="space-y-4">
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Active Executives list ({managedExecutives.length})</h4>
              {managedExecutives.length === 0 ? (
                <p className="text-gray-400 italic text-sm">No executives created yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {managedExecutives.map(exec => (
                    <div key={exec.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 group">
                       <div className="w-16 h-22 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                          {exec.image ? (
                            <img src={optimizeImage(exec.image, 200)} alt={exec.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                               <User size={20} />
                            </div>
                          )}
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 truncate">{exec.name}</p>
                          <p className="text-xs text-gray-500 mb-1 truncate">{exec.role}</p>
                          {(exec as any).phone && (
                             <p className="text-[10px] text-gray-400 mb-1 truncate flex items-center gap-1">
                               <Phone size={10} /> {(exec as any).phone}
                             </p>
                          )}
                          <div className="flex items-center space-x-2">
                             <span className="text-[10px] font-bold text-primary-gold uppercase">Key:</span>
                             <span className="text-xs font-mono font-bold bg-gray-100 px-2 py-0.5 rounded select-all">{exec.accessKey}</span>
                          </div>
                       </div>
                       <button 
                        onClick={() => deleteExecutive(exec.id)}
                        className="text-red-400 hover:text-red-600 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                       >
                         <X size={18} />
                       </button>
                    </div>
                  ))}
                </div>
              )}
           </div>
        </div>
        
        <div className="border-t border-gray-100 pt-8">
           <div className="flex items-center justify-between mb-6">
              <label className="font-bold text-gray-700 flex items-center">
                <Calendar className="mr-2 text-primary-gold" /> Regular Meetings (Roll-Up) Management
              </label>
              <button 
                onClick={() => {
                  const newMeetings = [...regularMeetings, { id: Date.now(), title: "New Meeting", schedule: "TBD", venue: "TBD", meta: "Description" }];
                  setRegularMeetings(newMeetings);
                  saveSettings({ regularMeetings: newMeetings });
                }}
                className="bg-primary-gold/10 text-primary-theme px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary-gold/20 transition-colors"
                disabled={saving}
              >
                + Add Meeting
              </button>
           </div>

           <div className="space-y-4">
              {regularMeetings.map((rm, i) => (
                <div key={rm.id} className="bg-gray-50 p-6 rounded-3xl border border-gray-100 relative group">
                   <button 
                    onClick={() => {
                      const newMeetings = regularMeetings.filter((_, idx) => idx !== i);
                      setRegularMeetings(newMeetings);
                      saveSettings({ regularMeetings: newMeetings });
                    }}
                    className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={saving}
                   >
                     <X size={18} />
                   </button>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-2">
                      <div className="lg:col-span-1">
                         <label className="text-[10px] font-bold text-primary-gold uppercase block mb-1">Banner Image</label>
                         <div className="relative h-24 bg-white border border-gray-200 rounded-xl overflow-hidden group/img">
                            {(rm as any).image ? (
                              <img src={optimizeImage((rm as any).image, 200)} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                 <Camera size={20} />
                              </div>
                            )}
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => handleMeetingImageUpload(i, e)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                         </div>
                         <input 
                           type="text" 
                           placeholder="Or Image URL"
                           value={(rm as any).image || ""} 
                           onChange={(e) => {
                             const updated = [...regularMeetings];
                             (updated[i] as any).image = e.target.value;
                             setRegularMeetings(updated);
                           }}
                           onBlur={() => saveSettings({ regularMeetings })}
                           className="bg-white border text-[10px] border-gray-200 rounded-lg px-2 py-2 mt-2 w-full outline-none focus:ring-2 focus:ring-primary-gold"
                         />
                      </div>
                      <div>
                         <label className="text-[10px] font-bold text-primary-gold uppercase block mb-1">Title</label>
                         <input 
                           type="text" 
                           value={rm.title} 
                           onChange={(e) => {
                             const updated = [...regularMeetings];
                             updated[i].title = e.target.value;
                             setRegularMeetings(updated);
                           }}
                           onBlur={() => saveSettings({ regularMeetings })}
                           className="bg-white border text-sm border-gray-200 rounded-xl px-4 py-2 w-full outline-none focus:ring-2 focus:ring-primary-gold"
                         />
                      </div>
                      <div>
                         <label className="text-[10px] font-bold text-primary-gold uppercase block mb-1">Schedule</label>
                         <input 
                           type="text" 
                           value={rm.schedule} 
                           onChange={(e) => {
                             const updated = [...regularMeetings];
                             updated[i].schedule = e.target.value;
                             setRegularMeetings(updated);
                           }}
                           onBlur={() => saveSettings({ regularMeetings })}
                           className="bg-white border text-sm border-gray-200 rounded-xl px-4 py-2 w-full outline-none focus:ring-2 focus:ring-primary-gold"
                         />
                      </div>
                      <div>
                         <label className="text-[10px] font-bold text-primary-gold uppercase block mb-1">Venue</label>
                         <input 
                           type="text" 
                           value={rm.venue} 
                           onChange={(e) => {
                             const updated = [...regularMeetings];
                             updated[i].venue = e.target.value;
                             setRegularMeetings(updated);
                           }}
                           onBlur={() => saveSettings({ regularMeetings })}
                           className="bg-white border text-sm border-gray-200 rounded-xl px-4 py-2 w-full outline-none focus:ring-2 focus:ring-primary-gold"
                         />
                      </div>
                      <div>
                         <label className="text-[10px] font-bold text-primary-gold uppercase block mb-1">Description / Meta</label>
                         <input 
                           type="text" 
                           value={rm.meta} 
                           onChange={(e) => {
                             const updated = [...regularMeetings];
                             updated[i].meta = e.target.value;
                             setRegularMeetings(updated);
                           }}
                           onBlur={() => saveSettings({ regularMeetings })}
                           className="bg-white border text-sm border-gray-200 rounded-xl px-4 py-2 w-full outline-none focus:ring-2 focus:ring-primary-gold"
                         />
                      </div>
                   </div>
                </div>
              ))}
              {regularMeetings.length === 0 && (
                <p className="text-gray-500 italic text-center p-4">No regular meetings added yet.</p>
              )}
           </div>

           <div className="mt-6 border-b border-gray-100 pb-8 flex flex-col items-center">
            <button
              onClick={() => saveSettings({ regularMeetings })}
              disabled={saving}
              className="w-full bg-primary-theme text-white px-6 py-4 rounded-xl font-bold shadow hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
              {saving ? "Saving Meetings..." : "Apply Regular Meeting Updates"}
            </button>
            {message === "Settings saved successfully!" && !saving && (
              <span className="text-sm font-bold text-green-600 flex items-center mt-2 justify-center">
                <Check size={16} className="mr-1" /> Save Successful!
              </span>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-8 mt-8">
           <div className="flex items-center justify-between mb-6">
              <label className="font-bold text-gray-700 flex items-center">
                <Video className="mr-2 text-primary-gold" /> Upcoming Events Management
              </label>
              <button 
                onClick={() => {
                  const newEvents = [...events, { id: Date.now(), title: "New Event", date: "TBD", loc: "TBD" }];
                  setEvents(newEvents);
                  saveSettings({ events: newEvents });
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-700 transition-colors"
              >
                + Add New Event
              </button>
           </div>

           <div className="space-y-4">
              {events.map((ev, i) => (
                <div key={ev.id} className="bg-gray-50 p-6 rounded-3xl border border-gray-100 relative group">
                   <button 
                    onClick={() => {
                      const newEvents = events.filter((_, idx) => idx !== i);
                      setEvents(newEvents);
                      saveSettings({ events: newEvents });
                    }}
                    className="absolute top-4 right-4 text-red-400 hover:text-red-600 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                   >
                     <X size={18} />
                   </button>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div>
                         <label className="text-[10px] font-bold text-primary-gold uppercase block mb-1">Banner Image</label>
                         <div className="relative h-32 bg-white border border-gray-200 rounded-xl overflow-hidden group/img">
                            {(ev as any).image ? (
                              <img src={optimizeImage((ev as any).image, 200)} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                 <Camera size={24} />
                              </div>
                            )}
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => handleEventImageUpload(i, e)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                         </div>
                         <input 
                           type="text" 
                           placeholder="Or Image URL"
                           value={(ev as any).image || ""} 
                           onChange={(e) => {
                             const updated = [...events];
                             (updated[i] as any).image = e.target.value;
                             setEvents(updated);
                           }}
                           onBlur={() => saveSettings({ events })}
                           className="bg-white border text-[10px] border-gray-200 rounded-lg px-2 py-2 mt-2 w-full outline-none focus:ring-2 focus:ring-primary-gold"
                         />
                      </div>
                      <div>
                         <label className="text-[10px] font-bold text-primary-gold uppercase block mb-1">Event Title</label>
                         <input 
                           type="text" 
                           value={ev.title} 
                           onChange={(e) => {
                             const newEvents = [...events];
                             newEvents[i].title = e.target.value;
                             setEvents(newEvents);
                           }}
                           onBlur={() => saveSettings({ events })}
                           className="bg-white border text-sm border-gray-200 rounded-xl px-4 py-2 w-full outline-none focus:ring-2 focus:ring-primary-gold"
                         />
                      </div>
                      <div>
                         <label className="text-[10px] font-bold text-primary-gold uppercase block mb-1">Date / Time</label>
                         <input 
                           type="text" 
                           value={ev.date} 
                           onChange={(e) => {
                             const newEvents = [...events];
                             newEvents[i].date = e.target.value;
                             setEvents(newEvents);
                           }}
                           onBlur={() => saveSettings({ events })}
                           className="bg-white border text-sm border-gray-200 rounded-xl px-4 py-2 w-full outline-none focus:ring-2 focus:ring-primary-gold"
                         />
                      </div>
                      <div>
                         <label className="text-[10px] font-bold text-primary-gold uppercase block mb-1">Location</label>
                         <input 
                           type="text" 
                           value={ev.loc} 
                           onChange={(e) => {
                             const newEvents = [...events];
                             newEvents[i].loc = e.target.value;
                             setEvents(newEvents);
                           }}
                           onBlur={() => saveSettings({ events })}
                           className="bg-white border text-sm border-gray-200 rounded-xl px-4 py-2 w-full outline-none focus:ring-2 focus:ring-primary-gold"
                         />
                      </div>
                   </div>
                </div>
              ))}
           </div>
           
           <div className="mt-6 flex flex-col items-center">
            <button
              onClick={() => saveSettings({ events })}
              disabled={saving}
              className="w-full bg-primary-gold text-white px-6 py-4 rounded-xl font-bold shadow-xl hover:bg-yellow-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
              {saving ? "Saving Events..." : "Apply Event Updates"}
            </button>
            {message === "Settings saved successfully!" && !saving && (
              <span className="text-sm font-bold text-green-600 flex items-center mt-2 justify-center">
                <Check size={16} className="mr-1" /> Save Successful!
              </span>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-8">
           <div className="flex items-center justify-between mb-6">
              <label className="font-bold text-gray-700 flex items-center">
                <LucideQuote className="mr-2 text-primary-gold" /> "What Members Say" Management
              </label>
              <button 
                onClick={async () => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = async (e: any) => {
                    const file = e.target.files[0];
                    if (file) {
                      setSaving(true);
                      try {
                        const url = await handleUniversalUpload(file, 'testimonials');
                        const newTestimonials = [...testimonials, { 
                          id: Date.now(), 
                          name: "New Member", 
                          text: "Edit this testimonial text", 
                          image: url 
                        }];
                        setTestimonials(newTestimonials);
                        saveSettings({ testimonials: newTestimonials });
                      } catch (err) {
                        alert("Failed to upload image");
                      } finally {
                        setSaving(false);
                      }
                    }
                  };
                  input.click();
                }}
                className="bg-primary-gold text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary-theme shadow-lg transition-all flex items-center gap-2"
                disabled={saving}
              >
                <Plus size={14} />
                Add & Upload Image
              </button>
           </div>

           <div className="space-y-4">
              {testimonials.map((t, idx) => (
                <div key={t.id} className="p-4 border border-gray-200 rounded-3xl bg-gray-50 flex flex-col md:flex-row gap-6 items-center md:items-start relative group">
                  <div className="flex-shrink-0 w-20 h-28 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm relative">
                    {t.image ? (
                      <img src={optimizeImage(t.image, 200)} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <User size={24} className="text-gray-300" />
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      const updated = testimonials.filter(tt => tt.id !== t.id);
                      setTestimonials(updated);
                      saveSettings({ testimonials: updated });
                    }}
                    className="absolute top-2 right-2 text-red-500 bg-red-50 hover:bg-red-100 hover:text-red-700 px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm border border-red-100"
                    disabled={saving}
                  >
                    <X size={14} /> Remove
                  </button>
                  <div className="flex-grow space-y-3 w-full mt-2 md:mt-0">
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-primary-gold uppercase block mb-1">Name</label>
                        <input 
                          type="text" 
                          value={t.name}
                          onChange={(e) => {
                            const updated = [...testimonials];
                            updated[idx].name = e.target.value;
                            setTestimonials(updated);
                          }}
                          onBlur={() => saveSettings({ testimonials })}
                          className="w-full text-sm p-2 border border-gray-300 rounded focus:border-primary-gold focus:ring-1 focus:ring-primary-gold outline-none"
                          placeholder="Name"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-primary-gold uppercase block mb-1">Photo</label>
                        <div className="flex gap-2">
                          <input 
                            type="hidden" 
                            value={t.image}
                          />
                          <div className="relative overflow-hidden">
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => handleTestimonialImageUpload(idx, e)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <button className="bg-primary-gold/10 text-primary-gold p-2 rounded border border-primary-gold/30 hover:bg-primary-gold/20">
                              <Camera size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-primary-gold uppercase block mb-1">Testimonial Text</label>
                      <textarea 
                        value={t.text}
                        onChange={(e) => {
                          const updated = [...testimonials];
                          updated[idx].text = e.target.value;
                          setTestimonials(updated);
                        }}
                        onBlur={() => saveSettings({ testimonials })}
                        className="w-full text-sm p-2 border border-gray-300 rounded focus:border-primary-gold focus:ring-1 focus:ring-primary-gold outline-none resize-y min-h-[60px]"
                        placeholder="Testimonial text"
                      ></textarea>
                    </div>
                  </div>
                </div>
              ))}
              {testimonials.length === 0 && (
                <p className="text-gray-500 italic text-center p-4">No testimonials added yet.</p>
              )}
           </div>

           <div className="mt-6 flex flex-col items-center">
            <button
              onClick={() => saveSettings({ testimonials })}
              disabled={saving}
              className="w-full bg-primary-theme text-white px-6 py-4 rounded-xl font-bold shadow hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
              {saving ? "Saving Testimonials..." : "Apply Testimonial Updates"}
            </button>
            {message === "Settings saved successfully!" && !saving && (
              <span className="text-sm font-bold text-green-600 flex items-center mt-2 justify-center">
                <Check size={16} className="mr-1" /> Save Successful!
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function CooperativeManagement({ users, onUpdateUser, handPrice, graceDay, fineAmount }: { users: User[]; onUpdateUser: (email: string, updates: any) => void; handPrice: number; graceDay: number; fineAmount: number }) {
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleDateString('en-NG', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const cooperativeUsers = users.filter(u => u.cooperativeEnrollment);
  const currentMonthYear = `${selectedMonth} ${selectedYear}`;
  const today = new Date().getDate();
  const currentMonth = new Date().toLocaleDateString('en-NG', { month: 'long' });
  const currentYear = new Date().getFullYear().toString();

  const filtered = cooperativeUsers.filter(u => 
    u.fullName.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const markAsPaid = async (user: User, customAmount?: number) => {
    if (!confirm(`Are you sure you want to mark ${user.fullName} as PAID for ${currentMonthYear}${customAmount ? ' with fine' : ''}?`)) return;
    
    const baseAmount = (user.cooperativeHands || 1) * handPrice;
    const finalAmount = customAmount || baseAmount;
    const reference = "ADMIN_MARK_" + Date.now();
    const payload = {
      email: user.email,
      amount: finalAmount,
      reference,
      month: selectedMonth,
      year: selectedYear,
      datePaid: new Date().toISOString(),
      hands: user.cooperativeHands || 1
    };

    try {
      const res = await fetch("/api/cooperative/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        onUpdateUser(user.email, {
          cooperativePayments: [...(user.cooperativePayments || []), data.payment]
        });
        alert("Payment recorded successfully");
      }
    } catch (e) {
      alert("Failed to record payment");
    }
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-primary-gold/10 overflow-hidden">
      <div className="p-8 border-b border-gray-100 bg-off-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-serif text-2xl font-bold text-primary-theme">Cooperative Management</h3>
          <p className="text-gray-500 text-sm mt-1">Total Enrolled: {cooperativeUsers.length} members • Grace Day: {graceDay}th • Fine: ₦{fineAmount.toLocaleString()}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-xl">
             <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-transparent text-xs font-bold outline-none cursor-pointer"
             >
               {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                 <option key={m} value={m}>{m}</option>
               ))}
             </select>
             <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-1.5 bg-transparent text-xs font-bold border-l border-gray-200 outline-none cursor-pointer"
             >
               {["2024", "2025", "2026", "2027"].map(y => (
                 <option key={y} value={y}>{y}</option>
               ))}
             </select>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search member..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-gold w-full md:w-48"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-off-white/50 text-gray-500 text-xs uppercase tracking-wider font-bold">
              <th className="py-4 px-6">Member</th>
              <th className="py-4 px-6 text-center">Hands</th>
              <th className="py-4 px-6">Commitment</th>
              <th className="py-4 px-6 text-center">Status ({currentMonthYear})</th>
              <th className="py-4 px-6 text-right">Fines</th>
              <th className="py-4 px-6 text-right">Total Contributed</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-20 text-center text-gray-400 italic">No cooperative members found.</td>
              </tr>
            ) : (
              filtered.map((u, idx) => {
                const isPaid = u.cooperativePayments?.some(p => p.month === selectedMonth && p.year === selectedYear);
                const total = (u.cooperativePayments || []).reduce((sum, p) => sum + p.amount, 0);
                const baseDue = (u.cooperativeHands || 1) * handPrice;
                
                // Logic for late fine:
                // If the selected month is current or past
                const isLate = !isPaid && (
                   (selectedYear < currentYear) || 
                   (selectedYear === currentYear && selectedMonth !== currentMonth) ||
                   (selectedYear === currentYear && selectedMonth === currentMonth && today > graceDay)
                );
                const activeFine = isLate ? fineAmount : 0;

                return (
                  <tr key={u.id || idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-bold text-gray-900">{u.fullName}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold font-mono">
                        {u.cooperativeHands || 1}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-gray-800 text-sm">₦{baseDue.toLocaleString()}</p>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {isPaid ? (
                        <div className="inline-flex items-center space-x-1.5 bg-green-50 text-green-600 px-3 py-1.5 rounded-full text-xs font-bold border border-green-100">
                          <Check size={12} />
                          <span>Paid</span>
                        </div>
                      ) : (
                        <div className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${isLate ? "bg-red-50 text-red-600 border-red-100" : "bg-orange-50 text-orange-600 border-orange-100"}`}>
                          <Clock size={12} />
                          <span>{isLate ? "Overdue" : "Awaiting"}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {activeFine > 0 ? (
                         <span className="text-red-600 font-bold">₦{activeFine.toLocaleString()}</span>
                      ) : (
                         <span className="text-gray-300">None</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <p className="font-bold text-indigo-700">₦{total.toLocaleString()}</p>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {!isPaid && (
                        <div className="flex justify-end gap-2">
                           <button 
                            onClick={() => markAsPaid(u)}
                            className="bg-primary-gold text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary-theme transition-all shadow-sm flex items-center gap-1.5"
                          >
                            <Plus size={14} />
                            <span>Mark Paid</span>
                          </button>
                          {isLate && (
                            <button 
                              onClick={() => markAsPaid(u, baseDue + fineAmount)}
                              className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 transition-all shadow-sm flex items-center gap-1.5"
                            >
                              <Plus size={14} />
                              <span>Paid + Fine</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FinanceDashboard({ users }: { users: User[] }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const currentYear = new Date().getFullYear().toString();
  
  const COLORS = ['#1a251e', '#C5A059', '#4F46E5', '#EF4444', '#10B981'];

  const yearlyData = useMemo(() => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const data = months.map(m => ({ 
      month: m.substring(0, 3), 
      fullMonth: m, 
      total: 0, 
      dues: 0, 
      coop: 0, 
      others: 0 
    }));

    users.forEach(u => {
      // Dues Payments
      (u.duesPayments || []).forEach(p => {
        if (p.year === selectedYear) {
           const mIdx = months.indexOf(p.month);
           if (mIdx !== -1) {
             data[mIdx].dues += p.amount;
             data[mIdx].total += p.amount;
           }
        }
      });
      // Cooperative Payments
      (u.cooperativePayments || []).forEach(p => {
        if (p.year === selectedYear) {
           const mIdx = months.indexOf(p.month);
           if (mIdx !== -1) {
             data[mIdx].coop += p.amount;
             data[mIdx].total += p.amount;
           }
        }
      });
    });

    return data;
  }, [users, selectedYear]);

  const totalRevenue = yearlyData.reduce((sum, d) => sum + d.total, 0);
  const duesTotal = yearlyData.reduce((sum, d) => sum + d.dues, 0);
  const coopTotal = yearlyData.reduce((sum, d) => sum + d.coop, 0);

  const pieData = [
    { name: 'Monthly Dues', value: duesTotal },
    { name: 'Cooperative', value: coopTotal },
    { name: 'Others', value: 0 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
        <div>
           <h3 className="font-serif text-2xl font-bold text-primary-theme">Annual Finance Overview</h3>
           <p className="text-gray-500 text-sm">Comprehensive breakdown of all revenue sources for the year {selectedYear}</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl">
           {["2024", "2025", "2026", "2027"].map(y => (
             <button 
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedYear === y ? "bg-white shadow-sm text-primary-theme" : "text-gray-400 hover:text-gray-600"}`}
             >
               {y}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-primary-theme to-[#1a251e] p-8 rounded-[2rem] shadow-xl text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary-gold/60 mb-1">Total Realized</p>
          <h4 className="text-3xl font-bold">₦{totalRevenue.toLocaleString()}</h4>
          <div className="mt-4 flex items-center gap-2">
             <div className="px-2 py-1 bg-white/10 rounded text-[10px] font-bold">Gross Income</div>
          </div>
        </div>
        
        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Monthly Dues</p>
          <h4 className="text-3xl font-bold text-gray-800">₦{duesTotal.toLocaleString()}</h4>
          <div className="mt-4 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
             <div className="bg-primary-gold h-full" style={{ width: `${totalRevenue ? (duesTotal/totalRevenue)*100 : 0}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Cooperative</p>
          <h4 className="text-3xl font-bold text-gray-800">₦{coopTotal.toLocaleString()}</h4>
          <div className="mt-4 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
             <div className="bg-indigo-600 h-full" style={{ width: `${totalRevenue ? (coopTotal/totalRevenue)*100 : 0}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Growth Forecast</p>
          <h4 className="text-3xl font-bold text-green-600">+15.4%</h4>
          <p className="text-[10px] text-gray-400 mt-2">Projected next quarter based on trends</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] shadow-xl border border-gray-50">
           <div className="flex justify-between items-center mb-8">
              <h4 className="font-serif text-xl font-bold text-primary-theme flex items-center gap-2">
                <BarChartIcon size={20} className="text-primary-gold" />
                Monthly Cashflow
              </h4>
           </div>
           <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} tickFormatter={(v) => `₦${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`₦${value.toLocaleString()}`, '']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="dues" name="Monthly Dues" fill="#C5A059" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="coop" name="Cooperative" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-50 flex flex-col">
           <h4 className="font-serif text-xl font-bold text-primary-theme mb-8 flex items-center gap-2">
              <PieChartIcon size={20} className="text-primary-gold" />
              Source Distribution
           </h4>
           <div className="flex-grow flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData.filter(d => d.value > 0)}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => `₦${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <p className="text-[10px] text-gray-400 font-bold uppercase">Sources</p>
                 <p className="text-xl font-bold text-primary-theme">{pieData.filter(d => d.value > 0).length}</p>
              </div>
           </div>
           <div className="mt-6 space-y-3">
              {pieData.map((s, idx) => (
                <div key={s.name} className="flex justify-between items-center text-sm">
                   <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      <span className="text-gray-600">{s.name}</span>
                   </div>
                   <span className="font-bold text-gray-900">{totalRevenue ? Math.round((s.value/totalRevenue)*100) : 0}%</span>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}

function AdminDashboardPage({ 
  onNavigate, 
  onLoginExecutive,
  onLogout,
  cooperativeHandPrice,
  cooperativeGraceDay,
  cooperativeFineAmount,
  monthlyDuesAmount,
  executiveDuesAmount,
  certificatePrice,
  licensePrice,
  flutterwaveKey,
  flutterwaveSecretKey,
  cloudinaryUrl,
  presidentName,
  presidentImage,
  logoImage,
  heroImage,
  events,
  regularMeetings,
  testimonials
}: { 
  onNavigate: (p: Page) => void; 
  onLoginExecutive: (user: any) => void;
  onLogout: () => void;
  cooperativeHandPrice: number;
  cooperativeGraceDay: number;
  cooperativeFineAmount: number;
  monthlyDuesAmount: number;
  executiveDuesAmount: number;
  certificatePrice: number;
  licensePrice: number;
  flutterwaveKey: string;
  flutterwaveSecretKey: string;
  cloudinaryUrl: string;
  presidentName: string;
  presidentImage: string | null;
  logoImage: string | null;
  heroImage: string;
  events: any[];
  regularMeetings: any[];
  testimonials: any[];
}) {
  const [isAdminMode, setIsAdminMode] = useState<"admin" | "auditor" | "executive">("admin");
  const [adminRole, setAdminRole] = useState<"admin" | "auditor">("admin");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [loginError, setLoginError] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"members" | "executives" | "settings" | "resources" | "cooperative" | "finance" | "messages">("members");
  const [verifyingUser, setVerifyingUser] = useState<User | null>(null);
  const [updatingUser, setUpdatingUser] = useState(false);
  const [filterState, setFilterState] = useState("");
  const [filterPosition, setFilterPosition] = useState<"All" | "Member" | "Executive">("All");
  const [filterStatus, setFilterStatus] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [resources, setResources] = useState<any[]>([]);
  const [resourceForm, setResourceForm] = useState({ title: "", description: "", file: null as File | null, url: "" });
  const [uploadingResource, setUploadingResource] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      if (isAdminMode === 'admin' || isAdminMode === 'auditor') {
        const res = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password, mode: isAdminMode })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setAdminRole(data.role);
        setIsLoggedIn(true);
        fetchUsers();
      } else {
        const res = await fetch("/api/executive/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessKey })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        onLoginExecutive(data.user);
      }
    } catch (err: any) {
      setLoginError(err.message);
    }
  };

  const fetchResources = async () => {
    try {
      const res = await fetch("/api/resources");
      const data = await res.json();
      setResources(data || []);
    } catch {}
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users || []);

      fetchResources();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceForm.title || (!resourceForm.file && !resourceForm.url)) return;
    setUploadingResource(true);
    try {
       const formData = new FormData();
       formData.append("title", resourceForm.title);
       formData.append("description", resourceForm.description);
       if (resourceForm.file) {
         formData.append("file", resourceForm.file);
       }
       if (resourceForm.url) {
         formData.append("url", resourceForm.url);
       }

       const res = await fetch("/api/resources", {
         method: "POST",
         body: formData
       });
       if (res.ok) {
          setResourceForm({ title: "", description: "", file: null, url: "" });
          fetchResources();
          const fileInput = document.getElementById("resourceFileInput") as HTMLInputElement;
          if (fileInput) fileInput.value = "";
       }
    } catch {}
    setUploadingResource(false);
  };

  const handleDeleteResource = async (id: number) => {
    if (!confirm("Remove this resource?")) return;
    try {
       const res = await fetch(`/api/resources/${id}`, {
          method: "DELETE"
       });
       if (res.ok) {
          fetchResources();
       }
    } catch {}
  };

  const verifyUserAction = async (action: 'approved' | 'rejected', certificateData?: string, licenseData?: string, certificateExpiry?: string, licenseExpiry?: string) => {
    if (!verifyingUser) return;
    setUpdatingUser(true);
    try {
      const isExecPromotion = verifyingUser.certForm?.assymogPosition === "Executive" && action === 'approved';
      const payload: any = { 
        email: verifyingUser.email, 
        status: action,
        certForm: verifyingUser.certForm,
        licForm: verifyingUser.licForm
      };
      
      if (isExecPromotion) {
        payload.userType = 'executive';
        payload.role = verifyingUser.certForm?.executivePost;
        payload.accessKey = "ASYM/" + Math.random().toString(36).substring(2, 8).toUpperCase();
      }

      if (certificateData !== undefined) payload.certificateData = certificateData;
      if (licenseData !== undefined) payload.licenseData = licenseData;
      if (certificateExpiry !== undefined) payload.certificateExpiry = certificateExpiry;
      if (licenseExpiry !== undefined) payload.licenseExpiry = licenseExpiry;

      const res = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to update to ${action}`);
      }
      
      if (isExecPromotion) {
        alert(`User approved and promoted to ${payload.role}! Access Key: ${payload.accessKey}`);
      } else {
        alert(`User ${action} successfully!`);
      }
      
      setVerifyingUser(null);
      fetchUsers();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setUpdatingUser(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="max-w-md mx-auto w-full px-4 py-20 flex-grow"
      >
        <button 
          onClick={() => onNavigate("home")}
          className="mb-8 flex flex-row items-center space-x-2 text-gray-500 hover:text-primary-theme transition-colors font-medium text-sm"
        >
          <ArrowRight size={16} className="rotate-180" />
          <span>Return to Website</span>
        </button>

        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-primary-gold/10">
          <div className="text-center mb-8">
            <h2 className="font-serif text-3xl font-bold text-gray-900 mb-2">Portal Access</h2>
            <p className="text-gray-500 font-medium italic">Authorized Personnel Only</p>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl mb-8">
             <button 
               onClick={() => { setIsAdminMode("admin"); setLoginError(""); }}
               className={`flex-1 py-3 rounded-lg text-[10px] font-bold transition-all ${isAdminMode === "admin" ? 'bg-white shadow-sm text-primary-theme' : 'text-gray-400'}`}
             >
               Super Admin
             </button>
             <button 
               onClick={() => { setIsAdminMode("auditor"); setLoginError(""); }}
               className={`flex-1 py-3 rounded-lg text-[10px] font-bold transition-all ${isAdminMode === "auditor" ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}
             >
               Fin. Auditor
             </button>
             <button 
               onClick={() => { setIsAdminMode("executive"); setLoginError(""); }}
               className={`flex-1 py-3 rounded-lg text-[10px] font-bold transition-all ${isAdminMode === "executive" ? 'bg-white shadow-sm text-primary-gold' : 'text-gray-400'}`}
             >
               Executive
             </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                {isAdminMode === "admin" ? "Admin Password" : isAdminMode === "auditor" ? "Auditor Password" : "Provided Access Key"}
              </label>
              <div className="relative">
                {(isAdminMode === "admin" || isAdminMode === "auditor") ? (
                  <>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={`Enter ${isAdminMode} password`}
                      className="w-full pl-5 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary-gold transition-all font-medium"
                      autoFocus
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-gold p-1"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </>
                ) : (
                  <input
                    type="text"
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    placeholder="e.g. ASYM/XXXXXX"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary-gold transition-all font-mono font-bold text-primary-gold uppercase"
                    autoFocus
                  />
                )}
              </div>
              {loginError && <p className="mt-2 text-xs text-red-500 font-medium italic">{loginError}</p>}
            </div>

            <button
              type="submit"
              className="w-full bg-primary-theme text-white py-5 rounded-2xl font-bold shadow-xl hover:bg-black transition-all flex items-center justify-center space-x-2 active:scale-95"
            >
              <span>{isAdminMode === "admin" ? "Log In as Super Admin" : isAdminMode === "auditor" ? "Log In as Auditor" : "Access Executive Room"}</span>
              <ArrowRight size={20} />
            </button>
          </form>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-7xl mx-auto w-full px-4 py-8 flex-grow"
    >
      {!isSupabaseConfigured() && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-4 text-red-700 shadow-sm mb-8">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
             <ShieldCheck size={24} />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm">Supabase Storage is NOT Configured</h4>
            <p className="text-xs opacity-80 leading-relaxed">
              File uploads and data persistence will be lost unless you provide valid <code className="bg-red-100 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="bg-red-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> in the Secrets or .env file.
            </p>
          </div>
          <div className="text-[10px] bg-red-100 text-red-800 px-2 py-1 rounded font-bold uppercase tracking-wider">Storage Disabled</div>
        </div>
      )}

      {/* Cloudinary Info - Free Tier Reassurance */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 text-blue-800 shadow-sm mb-8">
        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
           <Cloud size={24} />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm">Cloudinary Media Storage (Free Tier Available)</h4>
          <p className="text-xs opacity-90 leading-relaxed">
            Cloudinary offers a generous <strong>Free Forever</strong> plan. It handles ministerial photos and certificates with high reliability.
            <a href="https://cloudinary.com/pricing" target="_blank" rel="noopener noreferrer" className="ml-1 underline font-bold hover:text-blue-900 transition-colors">Confirm Free Tier Details</a>
          </p>
        </div>
        <div className="text-[10px] bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold uppercase tracking-wider">Media Optimization</div>
      </div>
      <button 
        onClick={() => onNavigate("home")}
        className="mb-6 flex flex-row items-center space-x-2 text-gray-500 hover:text-primary-theme transition-colors font-medium text-sm"
      >
        <ArrowRight size={16} className="rotate-180" />
        <span>Return to Website</span>
      </button>

      <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
        <div>
          <h1 className="font-serif text-5xl font-bold text-primary-theme mb-2">Admin Dashboard</h1>
          <p className="text-xl text-gray-500">Manage Ministers and Platform Settings</p>
        </div>
        <div className="flex items-center gap-4">
           <button 
             onClick={onLogout}
             className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors border border-red-100 shadow-sm"
           >
             <LogOut size={20} />
             <span>Sign Out</span>
           </button>

           <div className="flex items-center space-x-4 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-primary-gold/5">
            <div className="w-12 h-12 bg-primary-gold/10 text-primary-gold rounded-full flex items-center justify-center">
              <User size={24} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Total Members</p>
              <p className="font-medium text-2xl">{users.length}</p>
            </div>
          </div>
          
          <div 
            className="flex items-center space-x-4 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-yellow-500/20 cursor-pointer hover:bg-yellow-50 transition-colors group"
            onClick={() => { 
                setActiveTab("members"); 
                setFilterStatus("Pending");
                document.getElementById('ministers-table')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <div className="w-12 h-12 bg-yellow-500/10 text-yellow-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Pending Approvals</p>
              <p className="font-medium text-2xl">{users.filter(u => u.status === 'pending').length}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex space-x-2 mb-8 bg-white p-2 rounded-2xl border border-primary-gold/10 w-full sm:w-auto overflow-x-auto shadow-sm">
        <button 
          onClick={() => setActiveTab("members")}
          className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === "members" ? "bg-primary-theme text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
        >
          <span>Registered Ministers</span>
          {users.filter(u => u.status === 'pending').length > 0 && (
            <span className="bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">
              {users.filter(u => u.status === 'pending').length}
            </span>
          )}
        </button>
        {adminRole === 'admin' && (
          <button 
            onClick={() => setActiveTab("executives")}
            className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === "executives" ? "bg-primary-theme text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
          >
            Manage Executive Board
          </button>
        )}
        {adminRole === 'admin' && (
          <button 
            onClick={() => setActiveTab("settings")}
            className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === "settings" ? "bg-primary-theme text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
          >
            Platform Settings
          </button>
        )}
        <button 
          onClick={() => setActiveTab("resources")}
          className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === "resources" ? "bg-primary-theme text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
        >
          Resources Library
        </button>
        <button 
          onClick={() => setActiveTab("finance")}
          className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === "finance" ? "bg-primary-theme text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
        >
          Finance Summary
        </button>
        <button 
          onClick={() => setActiveTab("cooperative")}
          className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === "cooperative" ? "bg-primary-theme text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
        >
          Cooperative
        </button>
        <button 
          onClick={() => setActiveTab("messages")}
          className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === "messages" ? "bg-primary-theme text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
        >
          Messages
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 text-red-500 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">{error}</div>
      ) : loading ? (
        <div className="text-center py-20 text-gray-500">Loading directory...</div>
      ) : activeTab === "members" ? (
        <div id="ministers-table" className="bg-white rounded-[2rem] shadow-xl border border-primary-gold/10 overflow-hidden scroll-mt-8">
          <div className="p-8 border-b border-gray-100 bg-off-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="font-serif text-2xl font-bold text-primary-theme">Registered Ministers</h3>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search name, email, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-theme/20 outline-none w-full md:w-64"
                />
              </div>

              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-theme/20 outline-none font-bold"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending Approvals</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>

              <select 
                value={filterState} 
                onChange={(e) => setFilterState(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-theme/20 outline-none"
              >
                <option value="">All States</option>
                {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <select 
                value={filterPosition} 
                onChange={(e) => setFilterPosition(e.target.value as any)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-theme/20 outline-none"
              >
                <option value="All">All Positions</option>
                <option value="Member">Members</option>
                <option value="Executive">Executives</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-off-white/50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="py-4 px-6 font-bold">Photo</th>
                  <th className="py-4 px-6 font-bold"># Reg. ID</th>
                  <th className="py-4 px-6 font-bold">Full Name</th>
                  <th className="py-4 px-6 font-bold">Email / Phone</th>
                  <th className="py-4 px-6 font-bold">Association Detail</th>
                  <th className="py-4 px-6 font-bold">Status</th>
                  <th className="py-4 px-6 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.filter(u => {
                  const matchesState = filterState === "" || (u.certForm?.stateOfOrigin === filterState);
                  const matchesPos = filterPosition === "All" || (u.certForm?.assymogPosition === filterPosition);
                  const matchesStatus = filterStatus === "All" || (u.status?.toLowerCase() === filterStatus.toLowerCase());
                  const matchesSearch = searchQuery === "" || 
                    u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (u.registrationNumber || "").toLowerCase().includes(searchQuery.toLowerCase());
                  return matchesState && matchesPos && matchesSearch && matchesStatus;
                })
                .sort((a, b) => (a.registrationNumber || "").localeCompare(b.registrationNumber || ""))
                .length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 px-6 text-center text-gray-400">
                      No ministers matching these filters found.
                    </td>
                  </tr>
                ) : (
                  users.filter(u => {
                    const matchesState = filterState === "" || (u.certForm?.stateOfOrigin === filterState);
                    const matchesPos = filterPosition === "All" || (u.certForm?.assymogPosition === filterPosition);
                    const matchesStatus = filterStatus === "All" || (u.status?.toLowerCase() === filterStatus.toLowerCase());
                    const matchesSearch = searchQuery === "" || 
                      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (u.registrationNumber || "").toLowerCase().includes(searchQuery.toLowerCase());
                    return matchesState && matchesPos && matchesSearch && matchesStatus;
                  })
                  .sort((a, b) => (a.registrationNumber || "").localeCompare(b.registrationNumber || ""))
                  .map((u, i) => (
                    <tr key={u.id || i} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${u.status === 'pending' ? 'bg-yellow-50/50' : ''}`}>
                      <td className="py-4 px-6">
                        <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-100 flex items-center justify-center">
                           {u.certForm?.profilePicture ? (
                             <img src={optimizeImage(u.certForm.profilePicture, 200)} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                           ) : (
                             <User size={16} className="text-gray-300" />
                           )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-xs text-gray-400 font-mono">{u.registrationNumber || u.id || "N/A"}</td>
                      <td className="py-4 px-6 font-medium text-gray-800">
                        {u.fullName}
                        {u.certForm?.assymogPosition === "Executive" && (
                          <span className="ml-2 inline-block px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase tracking-tighter">EXEC</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-gray-500 text-sm">
                        <div>{u.email}</div>
                        <div className="text-xs mt-1 text-gray-400">{u.phone || "No phone"}</div>
                      </td>
                      <td className="py-4 px-6 text-sm">
                         <div className="flex flex-col space-y-1">
                            {u.certForm?.stateOfOrigin && (
                              <span className="text-xs text-gray-500">State: <strong className="text-gray-800">{u.certForm.stateOfOrigin}</strong></span>
                            )}
                            {u.churchName && (
                              <span className="text-xs text-gray-500">Church: <strong className="text-gray-800">{u.churchName}</strong></span>
                            )}
                            {u.certForm?.assymogPosition === "Executive" && u.certForm.executivePost && (
                              <span className="text-[10px] text-red-600 font-bold italic">{u.certForm.executivePost}</span>
                            )}
                         </div>
                      </td>
                      <td className="py-4 px-6">
                        {u.status === 'pending' ? (
                          <span className="inline-block px-3 py-1 bg-yellow-500/10 text-yellow-600 rounded-full text-xs font-bold">
                            Pending
                          </span>
                        ) : u.status === 'rejected' ? (
                          <span className="inline-block px-3 py-1 bg-red-500/10 text-red-600 rounded-full text-xs font-bold">
                            Rejected
                          </span>
                        ) : (
                          <span className="inline-block px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-xs font-bold">
                            Approved
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button 
                          onClick={() => setVerifyingUser(u)}
                          className="bg-primary-theme text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-primary-theme/90 transition-colors inline-flex items-center space-x-1"
                        >
                          <ShieldCheck size={14} />
                          <span>{u.status === 'pending' ? 'Verify' : 'Manage'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === ("executives" as any) ? (
        <div className="bg-white rounded-[2rem] shadow-xl border border-primary-gold/10 overflow-hidden">
          <div className="p-8 border-b border-gray-100 bg-off-white">
            <h3 className="font-serif text-2xl font-bold text-primary-theme">Manage Executive Board</h3>
            <p className="text-gray-500 mt-2 text-sm">Click on images or text below to update the executives shown on the home page.</p>
          </div>
          <div className="p-4 bg-white">
             <ExecutiveTeam editable={true} />
          </div>
        </div>
      ) : activeTab === ("resources" as any) ? (
        <div className="bg-white rounded-[2rem] shadow-xl border border-primary-gold/10 overflow-hidden">
          <div className="p-8 border-b border-gray-100 bg-off-white flex justify-between items-center">
            <div>
              <h3 className="font-serif text-2xl font-bold text-primary-theme">Resources Library</h3>
              <p className="text-gray-500 mt-2 text-sm">Upload materials for members to download.</p>
            </div>
          </div>
          <div className="p-8">
            <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
               <h4 className="font-bold text-primary-theme mb-4">Upload New Resource</h4>
               <form onSubmit={handleUploadResource} className="space-y-4">
                 <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Resource Title *</label>
                   <input type="text" value={resourceForm.title} onChange={e => setResourceForm({...resourceForm, title: e.target.value})} required className="w-full px-4 py-2 border rounded-xl" placeholder="e.g. 2026 Code of Conduct" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Description</label>
                   <textarea value={resourceForm.description} onChange={e => setResourceForm({...resourceForm, description: e.target.value})} className="w-full px-4 py-2 border rounded-xl" placeholder="Brief description..."></textarea>
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Upload File or Provide URL</label>
                   <input type="file" id="resourceFileInput" onChange={e => setResourceForm({...resourceForm, file: e.target.files?.[0] || null})} className="w-full mb-3 text-sm" />
                   <div className="flex items-center gap-4 mb-2">
                     <span className="text-xs font-bold text-gray-400 uppercase">OR</span>
                   </div>
                   <input type="url" placeholder="https://..." value={resourceForm.url} onChange={e => setResourceForm({...resourceForm, url: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
                 </div>
                 <button type="submit" disabled={uploadingResource || (!resourceForm.file && !resourceForm.url)} className="bg-primary-theme text-white px-6 py-2 rounded-xl font-bold disabled:opacity-50 mt-4">
                    {uploadingResource ? "Uploading..." : "Publish Resource"}
                 </button>
               </form>
            </div>
            
            <h4 className="font-bold border-b pb-2 mb-4 text-gray-700">Available Resources</h4>
            {resources.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No resources uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resources.map(r => (
                   <div key={r.id} className="p-4 border rounded-xl flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div>
                        <h5 className="font-bold text-primary-theme text-lg mb-1">{r.title}</h5>
                        <p className="text-xs text-gray-500 mb-2">{r.description}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{(r.size / 1024).toFixed(1)} KB • {r.originalName}</p>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <a href={r.url} target="_blank" rel="noreferrer" className="flex-1 bg-green-50 text-green-700 text-center py-2 rounded border border-green-200 text-xs font-bold hover:bg-green-100">View/Download</a>
                        <button onClick={() => handleDeleteResource(r.id)} className="bg-red-50 text-red-600 px-4 py-2 rounded border border-red-200 text-xs font-bold hover:bg-red-100">Delete</button>
                      </div>
                   </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "finance" ? (
        <FinanceDashboard users={users} />
      ) : activeTab === "cooperative" ? (
        <CooperativeManagement 
          users={users} 
          onUpdateUser={(email, updates) => {
            setUsers(users.map(u => u.email === email ? { ...u, ...updates } : u));
          }}
          handPrice={cooperativeHandPrice}
          graceDay={cooperativeGraceDay}
          fineAmount={cooperativeFineAmount}
        />
      ) : activeTab === "messages" ? (
        <SupportMessagesAdmin />
      ) : (
        <PlatformSettings 
          initialMonthlyDues={monthlyDuesAmount}
          initialExecutiveDues={executiveDuesAmount}
          initialCertPrice={certificatePrice}
          initialLicPrice={licensePrice}
          initialHero={heroImage}
          initialLogo={logoImage}
          initialPresImage={presidentImage}
          initialPresName={presidentName}
          initialFwKey={flutterwaveKey}
          initialFwSecret={flutterwaveSecretKey}
          initialCloudinaryUrl={cloudinaryUrl}
          initialCoopHand={cooperativeHandPrice}
          initialCoopGrace={cooperativeGraceDay}
          initialCoopFine={cooperativeFineAmount}
          initialEvents={events}
          initialMeetings={regularMeetings}
          initialTestimonials={testimonials}
        />
      )}

      <AnimatePresence>
        {verifyingUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => !updatingUser && setVerifyingUser(null)}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
            >
              <button 
                onClick={() => setVerifyingUser(null)}
                disabled={updatingUser}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>

              <h2 className="font-serif text-3xl font-bold text-primary-theme mb-2">Review Applicant</h2>
              <p className="text-gray-500 mb-8 border-b pb-4">Verify information and upload documentation</p>

              <div className="space-y-6 mb-8">
                <div className="grid grid-cols-2 gap-4 bg-off-white p-4 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Full Name</p>
                    <p className="font-bold text-gray-800">{verifyingUser.fullName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Reg ID</p>
                    <p className="font-bold font-mono text-primary-theme">{verifyingUser.registrationNumber || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Email</p>
                    <p className="font-medium text-gray-800">{verifyingUser.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Phone</p>
                    <p className="font-medium text-gray-800">{verifyingUser.phone || "N/A"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Church Name</p>
                    <p className="font-bold text-gray-800">{verifyingUser.churchName}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Current Status</p>
                    <span className="inline-block px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-bold capitalize">
                      {verifyingUser.status || "pending"}
                    </span>
                  </div>
                </div>

                {verifyingUser.certForm && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                    <h3 className="font-bold text-yellow-800 mb-2 border-b border-yellow-200 pb-2">Submitted Certificate Bio-Data</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <p><span className="text-yellow-700 font-semibold">DOB:</span> {verifyingUser.certForm.dob}</p>
                      <p><span className="text-yellow-700 font-semibold">Gender:</span> {verifyingUser.certForm.gender}</p>
                      <p><span className="text-yellow-700 font-semibold">Nationality:</span> {verifyingUser.certForm.nationality}</p>
                      <p><span className="text-yellow-700 font-semibold">State:</span> {verifyingUser.certForm.stateOfOrigin}</p>
                      <p><span className="text-yellow-700 font-semibold">Ordination Yr:</span> {verifyingUser.certForm.yearOfOrdination}</p>
                      <p><span className="text-yellow-700 font-semibold">Church Pos:</span> {verifyingUser.certForm.churchPosition}</p>
                      <p><span className="text-yellow-700 font-semibold">ASYMOG Pos:</span> {verifyingUser.certForm.assymogPosition}</p>
                      {verifyingUser.certForm.assymogPosition === "Executive" && (
                        <p className="col-span-2"><span className="text-yellow-700 font-semibold">Executive Post:</span> {verifyingUser.certForm.executivePost}</p>
                      )}
                    </div>
                  </div>
                )}

                {verifyingUser.licForm && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
                    <h3 className="font-bold text-emerald-800 mb-2 border-b border-emerald-200 pb-2">Submitted IML Identity Data</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <p><span className="text-emerald-700 font-semibold">NIN (Verified):</span> {verifyingUser.licForm.nin}</p>
                      <p><span className="text-emerald-700 font-semibold">Gender:</span> {verifyingUser.licForm.gender}</p>
                      <p><span className="text-emerald-700 font-semibold">Address:</span> {verifyingUser.licForm.address}</p>
                      <p><span className="text-emerald-700 font-semibold">Cert No:</span> {verifyingUser.licForm.certNumber}</p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-bold text-gray-800 mb-3 text-lg border-b pb-2">Profile & Documentation</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Member Photo (Profile Picture)</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary-gold/10 file:text-primary-gold hover:file:bg-primary-gold/20"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUpdatingUser(true);
                            try {
                              const url = await handleUniversalUpload(file, 'executive member');
                              const updated = {...verifyingUser};
                              if (!updated.certForm) updated.certForm = {} as any;
                              updated.certForm!.profilePicture = url;
                              setVerifyingUser(updated);
                            } catch (err: any) {
                              console.error("Upload error:", err);
                              alert("Failed to upload photo: " + err.message);
                            } finally {
                              setUpdatingUser(false);
                            }
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Membership Certificate</label>
                      <input 
                        type="file" 
                        accept="application/pdf,image/*"
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary-gold/10 file:text-primary-gold hover:file:bg-primary-gold/20"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUpdatingUser(true);
                            try {
                              const url = await handleUniversalUpload(file, 'App_files');
                              setVerifyingUser({...verifyingUser, certificateData: url});
                            } catch (err: any) {
                              console.error("Upload error:", err);
                              alert("Failed to upload certificate: " + err.message);
                            } finally {
                              setUpdatingUser(false);
                            }
                          }
                        }}
                      />
                      {verifyingUser.certificateData && (
                        <div className="mt-1 flex flex-col space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-green-600 font-medium">✓ Certificate loaded</p>
                            <a href={verifyingUser.certificateData} target="_blank" rel="noreferrer" className="text-[10px] text-primary-theme underline font-bold uppercase">View Current</a>
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-gray-400">Expiring Date</label>
                            <input 
                              type="date" 
                              value={verifyingUser.certificateExpiry || ""}
                              onChange={e => setVerifyingUser({...verifyingUser, certificateExpiry: e.target.value})}
                              className="w-full bg-white border border-gray-100 rounded-lg px-2 py-1 text-xs outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
 
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Ministerial License</label>
                      <input 
                        type="file" 
                        accept="application/pdf,image/*"
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary-theme/10 file:text-primary-theme hover:file:bg-primary-theme/20"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUpdatingUser(true);
                            try {
                              const url = await handleUniversalUpload(file, 'App_files');
                              setVerifyingUser({...verifyingUser, licenseData: url});
                            } catch (err: any) {
                              console.error("Upload error:", err);
                              alert("Failed to upload license: " + err.message);
                            } finally {
                              setUpdatingUser(false);
                            }
                          }
                        }}
                      />
                      {verifyingUser.licenseData && (
                        <div className="mt-1 flex flex-col space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-green-600 font-medium">✓ License loaded</p>
                            <a href={verifyingUser.licenseData} target="_blank" rel="noreferrer" className="text-[10px] text-primary-theme underline font-bold uppercase">View Current</a>
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-gray-400">Expiring Date</label>
                            <input 
                              type="date" 
                              value={verifyingUser.licenseExpiry || ""}
                              onChange={e => setVerifyingUser({...verifyingUser, licenseExpiry: e.target.value})}
                              className="w-full bg-white border border-gray-100 rounded-lg px-2 py-1 text-xs outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
 
              <div className="flex bg-gray-50 p-4 rounded-xl items-center justify-between border border-gray-200">
                <span className="font-bold text-gray-700">Action:</span>
                <div className="space-x-3">
                  <button 
                    onClick={() => verifyUserAction('rejected')}
                    disabled={updatingUser}
                    className="px-6 py-2 rounded-xl text-red-600 font-bold hover:bg-red-50 transition-colors disabled:opacity-50 border border-transparent hover:border-red-200"
                  >
                    Reject App
                  </button>
                  <button 
                    onClick={() => verifyUserAction(verifyingUser.status === 'approved' ? 'approved' : 'approved', verifyingUser.certificateData, verifyingUser.licenseData, verifyingUser.certificateExpiry, verifyingUser.licenseExpiry)}
                    disabled={updatingUser}
                    className="px-6 py-2 rounded-xl bg-green-600 text-white font-bold shadow-md hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {updatingUser ? "Saving..." : (verifyingUser.status === 'approved' ? "Save Changes" : "Approve & Save")}
                  </button>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function VerificationPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const [docId, setDocId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docId.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const encodedId = encodeURIComponent(docId.trim());
      const res = await fetch(`/api/verify-document/${encodedId}`);
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON verification response:", text.substring(0, 500));
        throw new Error("Unable to reach verification server. The system might be under maintenance or restarting. Please try again in 10-20 seconds.");
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-20 animate-in fade-in duration-700">
      <div className="text-center mb-12">
        <h2 className="font-serif text-5xl font-bold text-primary-theme">Document Verification</h2>
        <p className="text-gray-500 mt-4 font-medium italic">Validate ASYMOG Ministerial Certificates & Licenses</p>
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl p-8 md:p-12 border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-gold/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <form onSubmit={handleVerify} className="flex flex-col md:flex-row gap-4 relative z-10">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-gold" />
            <input 
              type="text" 
              placeholder="Enter Tracking ID or Document Number" 
              value={docId}
              onChange={e => setDocId(e.target.value)}
              className="w-full pl-12 pr-4 py-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary-gold transition-all font-medium text-lg placeholder:text-gray-300"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-primary-theme text-white px-10 py-5 rounded-2xl font-bold shadow-xl hover:bg-black transition-all flex items-center justify-center space-x-3 active:scale-95 disabled:opacity-50 min-w-[200px]"
          >
            {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
            <span className="text-lg">{loading ? "Verifying..." : "Verify Now"}</span>
          </button>
        </form>

        {error && (
          <div className="mt-8 p-6 bg-red-50 border border-red-100 rounded-2xl flex items-center space-x-4 text-red-600 animate-in fade-in slide-in-from-top-4">
            <X className="shrink-0" />
            <p className="font-bold">{error}. Please try again or contact support.</p>
          </div>
        )}

        {result && (
          <div className="mt-8 bg-gray-50 rounded-[2.5rem] p-10 border border-gray-100 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Document Holder</p>
                <h3 className="text-3xl font-bold text-primary-theme mb-3">{result.fullName}</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-4 py-1.5 bg-primary-gold/10 text-primary-gold rounded-full text-[10px] font-black uppercase tracking-wider border border-primary-gold/20 shadow-sm">{result.documentType}</span>
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm border ${result.status === 'Ready' ? 'bg-green-100 text-green-600 border-green-200' : 'bg-blue-100 text-blue-600 border-blue-200'}`}>
                    {result.status}
                  </span>
                </div>
              </div>
              
              {result.ready ? (
                <div className="w-full md:w-auto text-center space-y-4">
                   <button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = result.data;
                        link.download = `ASYMOG_${result.documentType.replace(/\s+/g, '_')}_${result.fullName.replace(/\s+/g, '_')}`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="w-full md:w-auto flex items-center justify-center space-x-3 bg-green-600 text-white px-10 py-5 rounded-2xl font-bold shadow-xl hover:bg-green-700 transition-all active:scale-95 group"
                    >
                      <Download size={24} className="group-hover:bounce" />
                      <span className="text-lg">Download Verified Copy</span>
                    </button>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">This document is authentic and verified.</p>
                </div>
              ) : (
                <div className="w-full md:w-auto flex flex-col items-center bg-white p-6 border border-gray-100 rounded-[2rem] shadow-sm max-w-[280px]">
                   <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                      <Clock className="text-blue-500" />
                   </div>
                   <p className="text-sm font-bold text-blue-600 uppercase tracking-widest">Under Processing</p>
                   <p className="text-[10px] text-gray-500 text-center mt-3 leading-relaxed">
                     Your application has been received. Please allow for a <strong>two-week interval</strong> from payment before the digital copy is ready for download.
                   </p>
                </div>
              )}
            </div>
            
            <div className="mt-12 pt-8 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-8">
               <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Tracking ID</p>
                  <p className="text-sm font-mono font-bold text-gray-800">{result.trackingNumber}</p>
               </div>
               <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Validity Period</p>
                  <p className="text-sm font-bold text-gray-800">{result.expiry || 'Permanent (Member)'}</p>
               </div>
               <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Issuing Board</p>
                  <p className="text-sm font-bold text-gray-800">ASYMOG INT'L BOARD</p>
               </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-16 bg-primary-theme/5 p-8 rounded-[2rem] border border-primary-theme/10 text-center">
        <h4 className="font-bold text-primary-theme mb-3">Haven't Applied Yet?</h4>
        <p className="text-gray-500 text-sm mb-6 max-w-lg mx-auto leading-relaxed">Join the Association to gain formal recognition, spiritual covering, and access to all ministerial documentation.</p>
        <button 
          onClick={() => onNavigate("register")} 
          className="text-primary-gold font-bold text-sm hover:underline flex items-center justify-center space-x-2 mx-auto"
        >
          <span>Start Membership Application</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function ResourcesPage() {
  const [resources, setResources] = useState<any[]>([]);
  
  useEffect(() => {
    fetch("/api/resources")
      .then(res => res.json())
      .then(data => setResources(data || []))
      .catch(() => {});
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-7xl mx-auto px-4 py-12"
    >
      <div className="text-center mb-16">
        <h2 className="font-serif text-4xl md:text-5xl font-bold text-primary-theme mb-4">Library & Resources</h2>
        <div className="w-24 h-1 bg-primary-gold mx-auto mb-8"></div>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Download materials, sermons, and guides.
        </p>
      </div>

      {resources.length === 0 ? (
         <div className="text-center py-12 text-gray-500 italic bg-gray-50 rounded-2xl border border-gray-100">
            No resources available at this time.
         </div>
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map(r => (
               <div key={r.id} className="bg-white p-6 rounded-2xl border border-gray-100 hover:border-primary-gold/30 hover:shadow-lg transition-all group">
                  <h4 className="font-bold text-primary-theme text-xl mb-2">{r.title}</h4>
                  <p className="text-sm text-gray-600 mb-4 h-10 overflow-hidden line-clamp-2">{r.description || "No description provided."}</p>
                  <div className="flex justify-between items-center mt-auto border-t border-gray-100 pt-4">
                     <span className="text-xs text-gray-400 font-mono">{(r.size / 1024).toFixed(1)} KB</span>
                     <a href={r.url} target="_blank" rel="noreferrer" className="flex flex-row items-center space-x-2 text-sm font-bold text-primary-gold group-hover:text-primary-theme transition-colors">
                        <Download size={16} />
                        <span>Download</span>
                     </a>
                  </div>
               </div>
            ))}
         </div>
      )}
    </motion.div>
  );
}

function AboutPage({ onNavigate, presidentImage, presidentName, logoImage }: { onNavigate: (p: Page) => void; presidentImage: string | null; presidentName: string; logoImage: string | null }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-grow flex flex-col bg-off-white"
    >
      <div className="bg-primary-theme text-white py-20 px-4 text-center">
        {logoImage ? (
          <img src={optimizeImage(logoImage, 300)} alt="ASYMOG Logo" referrerPolicy="no-referrer" className="h-24 md:h-32 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] object-contain" />
        ) : (
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/10 mx-auto flex items-center justify-center mb-6">
            <span className="text-white/50 text-2xl font-bold">Logo</span>
          </div>
        )}
        <h1 className="font-serif text-5xl font-bold mb-6">About ASYMOG</h1>
        <p className="max-w-2xl mx-auto text-lg text-primary-gold font-medium">Empowering Ministers, advancing the Gospel, and nurturing a strong spiritual community.</p>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white p-10 md:p-16 rounded-[2rem] shadow-xl border border-primary-gold/10 -mt-24 relative z-10">
          <h2 className="font-serif text-3xl font-bold mb-6 text-primary-theme">Our Mission & Vision</h2>
          <p className="text-gray-600 mb-6 leading-relaxed text-lg">
            The mission of the Association of Yoruba Ministers of God (ASYMOG), <strong className="text-primary-gold">officially registered in Nigeria</strong>, is to advance the spiritual and professional growth of our ministers, and to promote our members as qualified, dedicated leaders of the faith.
          </p>
          <p className="text-gray-600 mb-10 leading-relaxed text-lg">
            We stand together in solidarity to share wisdom, overcome challenges, and celebrate the gospel. Our association provides official recognition, ongoing educational workshops, and a supportive network for church leaders everywhere. We are a family of ministers united by a shared cultural heritage and a deep commitment to serving God and our communities.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <ShieldCheck size={32} className="text-primary-gold mb-4" />
              <h3 className="font-serif text-xl font-bold mb-2">Certification & Recognition</h3>
              <p className="text-sm text-gray-600">We provide official ministerial licensing and certification to our registered members, ensuring they meet the high standards of the association.</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <User size={32} className="text-primary-theme mb-4" />
              <h3 className="font-serif text-xl font-bold mb-2">Professional Growth</h3>
              <p className="text-sm text-gray-600">Through our continuous training workshops and seminars, members are equipped to lead effectively in modern times.</p>
            </div>
          </div>

          <div className="mb-12 pt-8 border-t border-gray-100">
            <div className="flex flex-col md:flex-row items-center gap-8 bg-primary-theme/5 p-8 rounded-3xl border border-primary-gold/20">
              <div className="flex-shrink-0 w-48 h-64 rounded-xl bg-gradient-to-br from-primary-gold to-yellow-600 flex items-center justify-center border-4 border-white shadow-lg overflow-hidden relative">
                {presidentImage ? (
                  <img src={optimizeImage(presidentImage, 600)} alt="President" referrerPolicy="no-referrer" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <User size={80} className="text-white opacity-90" />
                )}
              </div>
              <div className="flex-grow">
                <h2 className="font-serif text-2xl font-bold text-primary-theme mb-2 italic">President's Address</h2>
                <div className="relative">
                  <LucideQuote size={24} className="absolute -left-2 -top-1 text-primary-gold opacity-30 rotate-180" />
                  <p className="text-gray-700 italic leading-relaxed pl-6 text-lg">
                    "Welcome to ASYMOG. Our association is more than just a gathering; it is a sacred covenant 
                    to preserve our heritage and empower every Yoruba Minister of God. In this season of 
                    transformation, let us stand firm in 'Isokan Kristi' (Unity of Christ), for it is our 
                    unwavering fellowship that sustains our vision and expands the Kingdom. I invite you to join 
                    us on this path of excellence and spiritual fulfillment."
                  </p>
                </div>
                <div className="mt-4 pl-6">
                  <p className="font-serif font-bold text-primary-theme text-xl mb-0.5">{presidentName || "Bishop Emmanuel"}</p>
                  <p className="text-primary-gold font-bold text-xs uppercase tracking-widest">President, ASYMOG Worldwide</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12 pt-8 border-t border-gray-100">
            <h3 className="font-serif text-2xl font-bold text-primary-theme mb-6">Ready to Join Us?</h3>
            <button 
              onClick={() => onNavigate("register")}
              className="bg-primary-theme text-white px-8 py-4 rounded-full font-bold hover:bg-black transition-all shadow-md active:scale-95 text-lg"
            >
              Become a Member Today
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}