import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Search, Library, Play, Pause, 
  SkipBack, SkipForward, Music, 
  Heart, User, ArrowLeft, Menu, 
  ListMusic, Volume2, Mic2, MoreHorizontal,
  Flame, Disc, Radio, Repeat, LogOut, Settings,
  AlertCircle, CheckCircle2, XCircle, Loader2, X,
  Shuffle, Lock, Maximize2, Minimize2, Volume1, VolumeX
} from 'lucide-react';
import { 
  initializeApp 
} from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.VITE_FIREBASE_MEASUREMENT_ID
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Assets ---
const CUSTOM_LOGO_URL = null; 

// --- Utils ---
const formatTime = (millis) => {
  if (!millis && millis !== 0) return "0:00";
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(0);
  return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
};

const mapItunesTrack = (track) => ({
  id: track.trackId,
  title: track.trackName,
  artist: track.artistName,
  album: track.collectionName,
  cover: track.artworkUrl100 ? track.artworkUrl100.replace('100x100', '600x600') : null,
  duration: formatTime(track.trackTimeMillis), 
  previewUrl: track.previewUrl, 
  releaseDate: track.releaseDate
});

// --- Constants ---
const ACCENT_COLOR = "text-[#fa233b]"; 
const ACCENT_BG = "bg-[#fa233b]";

// --- Components ---

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const bg = type === 'error' ? 'bg-red-500/95' : 'bg-green-500/95';
  const icon = type === 'error' ? <XCircle size={20} /> : <CheckCircle2 size={20} />;

  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 ${bg} backdrop-blur-md text-white px-4 py-3 rounded-full shadow-2xl flex items-center gap-3 z-[100] animate-in slide-in-from-top-4 fade-in duration-300 border border-white/10`}>
      {icon}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

const BrandLogo = () => {
  if (CUSTOM_LOGO_URL) {
    return (
      <div className="flex items-center gap-2">
        <img src={CUSTOM_LOGO_URL} alt="Music App" className="w-8 h-8 object-contain" />
        <span className="font-bold text-xl tracking-tight text-white">Music App</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-white">
        <div className="w-8 h-8 bg-gradient-to-br from-[#fa233b] to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-900/20">
            <Music size={18} className="text-white" fill="white" />
        </div>
        <span className="font-bold text-xl tracking-tight">Music App</span>
    </div>
  );
};

const BottomNav = ({ currentView, setView, openProfile }) => {
  const NavItem = ({ view, icon: Icon, label }) => (
    <button 
      onClick={() => setView(view)}
      className={`flex flex-col items-center justify-center gap-1 flex-1 h-full ${currentView === view ? 'text-[#fa233b]' : 'text-gray-500 hover:text-gray-300'}`}
    >
      <Icon size={24} className={currentView === view ? "fill-current" : ""} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#1c1c1e]/95 backdrop-blur-xl border-t border-[#2c2c2e] flex items-center justify-around z-50 pb-safe">
      <NavItem view="home" icon={Home} label="Home" />
      <NavItem view="search" icon={Search} label="Search" />
      <NavItem view="library" icon={Library} label="Library" />
      <button 
        onClick={openProfile}
        className={`flex flex-col items-center justify-center gap-1 flex-1 h-full text-gray-500 hover:text-gray-300`}
      >
        <User size={24} />
        <span className="text-[10px] font-medium">Profile</span>
      </button>
    </div>
  );
};

const ProfileModal = ({ isOpen, onClose, user, onAuth, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-[#1c1c1e] w-full max-w-sm rounded-2xl border border-[#2c2c2e] p-6 relative shadow-2xl">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                <X size={20} />
            </button>
            
            <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-[#2c2c2e] mx-auto mb-4 flex items-center justify-center overflow-hidden border-2 border-[#2c2c2e]">
                    {user && !user.isAnonymous && user.photoURL ? (
                        <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <User size={32} className="text-gray-400" />
                    )}
                </div>
                {user && !user.isAnonymous ? (
                    <>
                        <h3 className="text-xl font-bold text-white">{user.displayName}</h3>
                        <p className="text-sm text-gray-400">{user.email}</p>
                    </>
                ) : (
                    <>
                        <h3 className="text-xl font-bold text-white">Guest User</h3>
                        <p className="text-sm text-gray-400">Sign in to sync your music.</p>
                    </>
                )}
            </div>

            <div className="space-y-3">
                {user && !user.isAnonymous ? (
                    <button 
                        onClick={() => { onAuth(); onClose(); }}
                        className="w-full py-3 bg-[#fa233b]/10 text-[#fa233b] rounded-xl font-semibold text-sm hover:bg-[#fa233b]/20 transition flex items-center justify-center gap-2"
                    >
                        <LogOut size={18} /> Sign Out
                    </button>
                ) : (
                    <button 
                        onClick={() => { onAuth(); onClose(); }}
                        className="w-full py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-gray-200 transition flex items-center justify-center gap-2"
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="" />}
                        Sign In with Google
                    </button>
                )}
            </div>
        </div>
    </div>
  );
};

const ProfileButton = ({ user, onAuth, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAuthAction = () => {
    setIsOpen(false);
    onAuth();
  };

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full bg-[#2c2c2e] flex items-center justify-center hover:bg-[#3a3a3c] transition-colors border border-white/5 shadow-sm overflow-hidden"
      >
        {isLoading ? (
            <Loader2 size={18} className="text-[#fa233b] animate-spin" />
        ) : user && !user.isAnonymous && user.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
        ) : (
            <User size={18} className="text-[#fa233b]" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-64 bg-[#1c1c1e]/95 backdrop-blur-xl border border-[#2c2c2e] rounded-xl shadow-2xl p-1.5 flex flex-col animate-in fade-in zoom-in-95 duration-200 origin-top-right">
            {user && !user.isAnonymous ? (
                <>
                    <div className="px-3 py-3 mb-1 bg-[#2c2c2e]/50 rounded-lg border border-white/5">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Signed in as</span>
                        <span className="text-white font-semibold truncate block text-sm">{user.displayName || "User"}</span>
                        <span className="text-xs text-gray-400 truncate block">{user.email}</span>
                    </div>
                    
                    <div className="h-[1px] bg-[#2c2c2e] my-1 mx-2"></div>

                    <button onClick={handleAuthAction} className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#fa233b] hover:bg-[#fa233b]/10 rounded-lg transition-colors text-left w-full font-medium">
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </>
            ) : (
                <>
                    <div className="px-4 py-4 text-center">
                        <h3 className="text-white font-bold text-base">Profile</h3>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">Sign in to sync your library across devices.</p>
                    </div>
                    <button onClick={handleAuthAction} className="flex items-center justify-center gap-3 px-4 py-3 text-sm bg-white text-black font-bold hover:bg-gray-200 rounded-lg transition-colors w-full mb-1">
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
                        Sign In with Google
                    </button>
                </>
            )}
        </div>
      )}
    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, active, onClick, locked }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sm font-medium ${active ? 'bg-[#2c2c2e] text-white' : 'text-gray-400 hover:text-white hover:bg-[#1c1c1e]'}`}
  >
    <div className="flex items-center gap-3">
        <Icon size={20} className={active ? ACCENT_COLOR : ""} />
        <span>{label}</span>
    </div>
    {locked && <Lock size={12} className="text-gray-600" />}
  </button>
);

const Sidebar = ({ currentView, setView, isGuest, requestLogin }) => (
  <div className="hidden md:flex flex-col w-64 bg-[#121212] border-r border-[#2c2c2e] p-4 pt-8 h-full z-30">
    <div className="mb-8 px-3">
        <BrandLogo />
    </div>
    
    <div className="space-y-1">
      <div className="px-3 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Discover</div>
      <SidebarItem icon={Home} label="Home" active={currentView === 'home'} onClick={() => setView('home')} />
      <SidebarItem icon={Search} label="Search" active={currentView === 'search'} onClick={() => setView('search')} />
      <SidebarItem icon={Radio} label="Radio" active={currentView === 'radio'} onClick={() => setView('radio')} />
    </div>

    <div className="mt-8 space-y-1">
      <div className="px-3 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Library</div>
      <SidebarItem 
        icon={Library} 
        label="Liked Songs" 
        active={currentView === 'library'} 
        onClick={() => isGuest ? requestLogin() : setView('library')} 
        locked={isGuest}
      />
      <SidebarItem 
        icon={Mic2} 
        label="Artists" 
        active={currentView === 'artists'} 
        onClick={() => isGuest ? requestLogin() : setView('artists')} 
        locked={isGuest}
      />
    </div>
  </div>
);

const QueueOverlay = ({ isOpen, currentTrack, queue, onClose, onPlayTrack }) => {
    if (!isOpen) return null;
    return (
        <div className="absolute bottom-[90px] md:bottom-[96px] right-4 left-4 md:left-auto md:w-80 bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl shadow-2xl p-4 flex flex-col gap-2 max-h-[50vh] md:max-h-[400px] z-[60] animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-[#2c2c2e]">
                <span className="font-bold text-white text-sm">Up Next</span>
                <button onClick={onClose}><X size={16} className="text-gray-400 hover:text-white"/></button>
            </div>
            <div className="overflow-y-auto custom-scrollbar flex-1">
                {queue && queue.length > 0 ? queue.map((song, i) => (
                    <div key={song.id + i} onClick={() => onPlayTrack(song)} className={`flex items-center gap-3 p-2 rounded-lg hover:bg-[#2c2c2e] cursor-pointer group ${currentTrack?.id === song.id ? 'bg-[#2c2c2e]' : ''}`}>
                        <img src={song.cover} className="w-8 h-8 rounded bg-gray-800" alt=""/>
                        <div className="flex-1 overflow-hidden">
                            <div className={`text-xs font-bold truncate ${currentTrack?.id === song.id ? 'text-[#fa233b]' : 'text-white'}`}>{song.title}</div>
                            <div className="text-[10px] text-gray-400 truncate">{song.artist}</div>
                        </div>
                        {currentTrack?.id === song.id && <Volume2 size={12} className="text-[#fa233b]"/>}
                    </div>
                )) : (
                    <div className="text-xs text-gray-500 text-center py-4">Queue is empty</div>
                )}
            </div>
        </div>
    );
};

// Fullscreen Player Component
const FullscreenPlayer = ({ 
  isOpen, onClose, currentTrack, isPlaying, 
  onPlayPause, onNext, onPrev, progress, 
  currentTime, duration, onLike, isLiked, 
  volume, setVolume, isRepeat, toggleRepeat,
  isShuffle, toggleShuffle, queue, onPlayTrack
}) => {
    const [showQueue, setShowQueue] = useState(false);

    if (!isOpen || !currentTrack) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-[#000000]/95 backdrop-blur-3xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
            {/* Background Blur */}
            <div className="absolute inset-0 z-0">
                <img src={currentTrack.cover} className="w-full h-full object-cover opacity-30 blur-3xl scale-125" alt="" />
                <div className="absolute inset-0 bg-black/60"></div>
            </div>

            {/* Header */}
            <div className="relative z-10 flex justify-between items-center p-6 md:p-8">
                <button onClick={onClose} className="text-gray-400 hover:text-white transition p-2 bg-white/5 rounded-full backdrop-blur-md">
                    <Minimize2 size={24} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Now Playing</span>
                    <span className="text-sm font-bold text-white">{currentTrack.album || "Unknown Album"}</span>
                </div>
                <button 
                    onClick={() => setShowQueue(!showQueue)}
                    className={`transition p-2 rounded-full ${showQueue ? 'bg-[#fa233b] text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    <ListMusic size={24} />
                </button>
            </div>

            {/* Middle Content Area (Swappable) */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 md:px-20 overflow-hidden mb-6">
                {showQueue ? (
                    // QUEUE VIEW
                    <div className="w-full h-full max-w-xl mx-auto bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-4 border-b border-white/10 sticky top-0 bg-black/20 backdrop-blur-sm z-10">
                            <h3 className="text-lg font-bold text-white">Up Next</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                             {queue && queue.length > 0 ? queue.map((song, i) => (
                                <div key={song.id + i} onClick={() => onPlayTrack(song)} className={`flex items-center gap-4 p-3 rounded-xl hover:bg-white/10 cursor-pointer group ${currentTrack?.id === song.id ? 'bg-white/10' : ''}`}>
                                    <span className="text-gray-500 w-6 text-center text-sm font-mono">{i + 1}</span>
                                    <img src={song.cover} className="w-10 h-10 rounded-lg bg-gray-800" alt=""/>
                                    <div className="flex-1 overflow-hidden">
                                        <div className={`text-sm font-bold truncate ${currentTrack?.id === song.id ? 'text-[#fa233b]' : 'text-white'}`}>{song.title}</div>
                                        <div className="text-xs text-gray-400 truncate">{song.artist}</div>
                                    </div>
                                    {currentTrack?.id === song.id && <Volume2 size={16} className="text-[#fa233b]"/>}
                                </div>
                            )) : (
                                <div className="text-gray-500 text-center py-10">Queue is empty</div>
                            )}
                        </div>
                    </div>
                ) : (
                    // ARTWORK VIEW
                    <div className="w-full max-w-sm aspect-square rounded-2xl shadow-2xl overflow-hidden border border-white/10 relative group animate-in fade-in duration-500">
                        <img src={currentTrack.cover} className="w-full h-full object-cover" alt={currentTrack.title} />
                    </div>
                )}
            </div>

            {/* Bottom Controls Container (Fixed & Always Visible) */}
            <div className="relative z-10 w-full max-w-xl mx-auto px-8 md:px-20 pb-10 flex flex-col gap-6">
                {/* Track Info & Like */}
                <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 line-clamp-1">{currentTrack.title}</h2>
                        <h3 className="text-lg md:text-xl text-[#fa233b] font-medium line-clamp-1">{currentTrack.artist}</h3>
                    </div>
                    <button onClick={() => onLike(currentTrack)} className="mb-1 focus:outline-none">
                        <Heart size={28} className={`transition cursor-pointer ${isLiked ? "text-[#fa233b] fill-[#fa233b]" : "text-gray-400 hover:text-white"}`} />
                    </button>
                </div>

                {/* Progress */}
                <div className="w-full group">
                    <div className="relative h-1.5 bg-white/20 rounded-full cursor-pointer overflow-hidden">
                        <div className="absolute top-0 left-0 h-full bg-[#fa233b]" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs font-medium text-gray-400 mt-2 font-mono">
                        <span>{currentTime}</span>
                        <span>{duration}</span>
                    </div>
                </div>

                {/* Main Controls Row */}
                <div className="flex items-center justify-between mt-2">
                    <button onClick={toggleShuffle} className={`transition p-2 rounded-full hover:bg-white/10 ${isShuffle ? 'text-[#fa233b]' : 'text-gray-400 hover:text-white'}`}>
                        <Shuffle size={24} />
                    </button>
                    
                    <div className="flex items-center gap-6 md:gap-10">
                        <button onClick={onPrev} className="text-white hover:text-[#fa233b] transition">
                            <SkipBack size={36} fill="currentColor" />
                        </button>
                        <button onClick={onPlayPause} className="text-white hover:scale-110 transition p-2">
                            {isPlaying ? <Pause size={48} fill="currentColor" /> : <Play size={48} fill="currentColor" />}
                        </button>
                        <button onClick={onNext} className="text-white hover:text-[#fa233b] transition">
                            <SkipForward size={36} fill="currentColor" />
                        </button>
                    </div>
                    
                    <button onClick={toggleRepeat} className={`transition p-2 rounded-full hover:bg-white/10 ${isRepeat ? 'text-[#fa233b]' : 'text-gray-400 hover:text-white'}`}>
                        <Repeat size={24} />
                    </button>
                </div>

                {/* Volume Slider */}
                <div className="flex items-center gap-4 px-2">
                    <Volume2 size={20} className="text-gray-400" />
                    <input 
                        type="range" 
                        min="0" 
                        max="100"
                        value={volume}
                        onChange={(e) => setVolume(e.target.value)}
                        className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-[#fa233b]"
                    />
                </div>
            </div>
        </div>
    );
};

const PlayerBar = ({ 
    currentTrack, isPlaying, onPlayPause, onNext, onPrev, onLike, 
    isLiked, queue, onPlayTrack, isShuffle, toggleShuffle, isRepeat, toggleRepeat 
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [showQueue, setShowQueue] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current) audioRef.current = new Audio();
  }, []);

  // Sync state with browser fullscreen changes (e.g. user presses Esc)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setShowFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleEnterFullscreen = () => {
    // Attempt to enter browser fullscreen
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
        // Fallback: just show the overlay if API fails
        setShowFullscreen(true);
      });
    } else {
      setShowFullscreen(true);
    }
  };

  const handleExitFullscreen = () => {
    // Attempt to exit browser fullscreen
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch((err) => console.error("Error attempting to exit fullscreen:", err));
    } else {
      setShowFullscreen(false);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!currentTrack || !audio) return;

    if (audio.src !== currentTrack.previewUrl) {
      audio.src = currentTrack.previewUrl;
      audio.load();
      if (isPlaying) audio.play().catch(e => console.error(e));
    } else {
      isPlaying ? audio.play() : audio.pause();
    }

    const updateTime = () => setCurrentTime(audio.currentTime * 1000);
    const updateDuration = () => setDuration(audio.duration * 1000);
    const handleEnded = () => {
        if (isRepeat) {
            audio.currentTime = 0;
            audio.play();
        } else {
            onNext();
        }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack, isPlaying, onNext, isRepeat]);

  useEffect(() => {
      if(audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume])

  if (!currentTrack) return null;

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <>
        <FullscreenPlayer 
            isOpen={showFullscreen} 
            onClose={handleExitFullscreen}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onPlayPause={onPlayPause}
            onNext={onNext}
            onPrev={onPrev}
            progress={progress}
            currentTime={formatTime(currentTime)}
            duration={formatTime(duration)}
            onLike={onLike}
            isLiked={isLiked}
            volume={volume}
            setVolume={setVolume}
            isRepeat={isRepeat}
            toggleRepeat={toggleRepeat}
            isShuffle={isShuffle}
            toggleShuffle={toggleShuffle}
            queue={queue}
            onPlayTrack={onPlayTrack}
        />

        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 h-16 md:h-[88px] bg-[#1c1c1e]/95 backdrop-blur-md border-t border-[#2c2c2e] flex items-center px-4 md:px-6 z-50 shadow-2xl transition-all">
        <QueueOverlay isOpen={showQueue} currentTrack={currentTrack} queue={queue} onClose={() => setShowQueue(false)} onPlayTrack={onPlayTrack} />
        
        {/* Track Info */}
        <div className="flex items-center gap-3 md:gap-4 flex-1 md:w-[30%] md:flex-none min-w-0 mr-4 md:mr-0">
            <div className="relative group cursor-pointer" onClick={handleEnterFullscreen}>
                <img 
                src={currentTrack.cover} 
                alt="cover" 
                className="h-10 w-10 md:h-12 md:w-12 rounded-[4px] shadow-sm object-cover bg-gray-800 border border-white/5" 
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-[4px] transition-opacity">
                    <Maximize2 size={16} className="text-white" />
                </div>
            </div>
            
            <div className="flex flex-col justify-center overflow-hidden min-w-0">
            <span className="text-white text-sm font-medium truncate cursor-default">{currentTrack.title}</span>
            <span className="text-gray-400 text-xs truncate cursor-default hover:underline">{currentTrack.artist}</span>
            </div>
            <button onClick={() => onLike(currentTrack)} className="ml-2 focus:outline-none hidden md:block">
                <Heart size={18} className={isLiked ? "text-[#fa233b] fill-[#fa233b]" : "text-gray-400 hover:text-white"} />
            </button>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center md:flex-1 max-w-2xl px-0 md:px-4 gap-1 flex-none">
            <div className="flex items-center gap-4 md:gap-8">
                <button 
                    onClick={toggleRepeat} 
                    className={`transition hidden md:block ${isRepeat ? 'text-[#fa233b]' : 'text-gray-400 hover:text-white'}`}
                    title="Repeat"
                >
                    <Repeat size={18} />
                </button>
                
                <button onClick={onPrev} className="text-gray-400 hover:text-white transition hidden md:block"><SkipBack size={24} fill="currentColor" /></button>
                
                <button 
                onClick={onPlayPause}
                className="text-white hover:scale-105 transition"
                >
                {isPlaying ? <Pause size={28} fill="white" className="md:w-9 md:h-9" /> : <Play size={28} fill="white" className="md:w-9 md:h-9" />}
                </button>
                
                <button onClick={onNext} className="text-gray-400 hover:text-white transition hidden md:block"><SkipForward size={24} fill="currentColor" /></button>
                
                <button 
                    onClick={toggleShuffle}
                    className={`transition hidden md:block ${isShuffle ? 'text-[#fa233b]' : 'text-gray-400 hover:text-white'}`}
                >
                    <Shuffle size={18} />
                </button>
            </div>
            
            <div className="w-full flex items-center gap-3 text-[10px] text-gray-500 font-medium hidden md:flex">
                <span className="w-8 text-right">{formatTime(currentTime)}</span>
                <div className="relative flex-1 h-[3px] bg-[#3a3a3c] rounded-full overflow-hidden group cursor-pointer">
                    <div 
                        className="absolute top-0 left-0 h-full bg-gray-400 group-hover:bg-[#fa233b] transition-colors"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                <span className="w-8">{formatTime(duration)}</span>
            </div>
        </div>

        {/* Volume & Extras */}
        <div className="hidden md:flex w-[30%] justify-end items-center gap-4">
            <button onClick={() => setShowQueue(!showQueue)} className={`transition ${showQueue ? 'text-[#fa233b]' : 'text-gray-400 hover:text-white'}`}>
                <ListMusic size={18} />
            </button>
            <div className="flex items-center gap-2 group">
                <Volume2 size={18} className="text-gray-400" />
                <input 
                    type="range" 
                    min="0" 
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    className="w-20 h-1 bg-[#3a3a3c] rounded-full appearance-none cursor-pointer accent-gray-400 hover:accent-[#fa233b]"
                />
            </div>
        </div>
        </div>
    </>
  );
};

// ... AlbumCard, RadioView, LibraryView, ArtistsView, DetailView, HomeView, SearchView ...
// (These components remain unchanged but included for completeness in compilation)

const AlbumCard = ({ playlist, onClick }) => (
  <div onClick={() => onClick(playlist.id)} className="group cursor-pointer flex flex-col gap-2">
    <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-[#2c2c2e] shadow-sm">
      <img src={playlist.cover || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop"} alt={playlist.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100" />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="w-12 h-12 bg-[#fa233b] rounded-full flex items-center justify-center shadow-lg text-white">
            <Play size={20} fill="white" className="ml-1" />
        </div>
      </div>
    </div>
    <div>
        <h3 className="text-white text-[15px] font-medium leading-tight truncate">{playlist.title}</h3>
        <p className="text-gray-500 text-[13px] truncate">Mix • {playlist.category || "General"}</p>
    </div>
  </div>
);

const RadioView = ({ onPlayTrack, currentTrack, user, onAuth, isLoading }) => {
    const stations = [
        { id: 'lofi', title: 'Lo-Fi Station', query: 'lofi study', color: 'from-purple-500 to-indigo-600' },
        { id: 'pop', title: 'Pop Hits Radio', query: 'top pop hits', color: 'from-pink-500 to-rose-600' },
        { id: 'rock', title: 'Classic Rock', query: 'classic rock', color: 'from-red-600 to-orange-600' },
        { id: 'jazz', title: 'Jazz Lounge', query: 'jazz instrumental', color: 'from-amber-500 to-yellow-600' },
        { id: 'workout', title: 'Workout Energy', query: 'workout gym', color: 'from-green-500 to-emerald-600' },
        { id: 'sleep', title: 'Sleep & Relax', query: 'ambient sleep', color: 'from-blue-500 to-cyan-600' },
    ];

    const playStation = async (station) => {
        try {
            const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(station.query)}&media=music&entity=song&limit=20`);
            const data = await res.json();
            const tracks = data.results.map(mapItunesTrack);
            if(tracks.length > 0) {
                const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
                onPlayTrack(randomTrack, tracks);
            }
        } catch(e) {
            console.error("Error playing radio", e);
        }
    };

    return (
        <div className="pb-40 md:pb-32 px-6 md:px-10 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-[#2c2c2e] pb-4">
                <h1 className="text-3xl md:text-4xl font-bold text-white">Radio</h1>
                <div className="hidden md:block">
                    <ProfileButton user={user} onAuth={onAuth} isLoading={isLoading} />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stations.map(station => (
                    <div key={station.id} onClick={() => playStation(station)} className={`group relative h-40 rounded-xl bg-gradient-to-br ${station.color} overflow-hidden cursor-pointer shadow-lg hover:scale-[1.02] transition-transform`}>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                            <h3 className="text-2xl font-bold text-white drop-shadow-md z-10">{station.title}</h3>
                            <Radio className="absolute bottom-[-20px] right-[-20px] w-32 h-32 text-white/10 rotate-12" />
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center absolute opacity-0 group-hover:opacity-100 transition-opacity shadow-xl transform translate-y-2 group-hover:translate-y-0">
                                <Play size={20} fill="black" className="ml-1" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const LibraryView = ({ likedSongs, onPlayTrack, currentTrack, user, onAuth, isLoading }) => {
    return (
        <div className="pb-40 md:pb-32 px-6 md:px-10 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-[#2c2c2e] pb-4">
                <h1 className="text-3xl md:text-4xl font-bold text-white">Liked Songs</h1>
                <div className="hidden md:block">
                    <ProfileButton user={user} onAuth={onAuth} isLoading={isLoading} />
                </div>
            </div>
            
            {likedSongs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Heart size={48} className="mb-4 opacity-50" />
                    <p className="text-lg">No liked songs yet.</p>
                    <p className="text-sm">Tap the heart icon on any track to save it here.</p>
                </div>
            ) : (
                <div className="w-full">
                    <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-2 border-b border-[#2c2c2e] text-xs font-medium text-gray-500 uppercase tracking-wide">
                        <span className="w-8 text-center">#</span>
                        <span>Title</span>
                        <span className="hidden md:block">Album</span>
                        <span className="w-12 text-right">Time</span>
                    </div>
                    
                    <div className="mt-2">
                        {likedSongs.map((song, i) => (
                            <div 
                                key={song.id} 
                                onClick={() => onPlayTrack(song, likedSongs)}
                                className={`group grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-4 py-3 rounded-md cursor-pointer transition-colors ${currentTrack?.id === song.id ? 'bg-[#2c2c2e]' : 'hover:bg-[#1c1c1e]'}`}
                            >
                                <span className="w-8 text-center text-sm text-gray-500 font-medium group-hover:hidden">{i + 1}</span>
                                <span className="w-8 text-center hidden group-hover:flex items-center justify-center text-gray-300">
                                    <Play size={14} fill="currentColor"/>
                                </span>
                                
                                <div className="flex items-center gap-3 min-w-0">
                                    <img src={song.cover} className="w-10 h-10 rounded shadow-sm object-cover bg-[#2c2c2e]" alt="" />
                                    <div className="flex flex-col min-w-0">
                                        <span className={`text-[15px] truncate font-medium ${currentTrack?.id === song.id ? 'text-[#fa233b]' : 'text-white'}`}>{song.title}</span>
                                        <span className="text-xs text-gray-400 truncate">{song.artist}</span>
                                    </div>
                                </div>
                                <span className="hidden md:block text-sm text-gray-400 truncate max-w-[200px]">{song.album}</span>
                                <span className="w-12 text-right text-xs text-gray-500 font-medium">{song.duration}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const ArtistsView = ({ playlists, user, onAuth, isLoading }) => {
    // Aggregate unique artists from playlists
    const allArtists = new Set();
    const artistData = [];

    playlists.forEach(pl => {
        if(pl.songs) {
            pl.songs.forEach(song => {
                if(!allArtists.has(song.artist)) {
                    allArtists.add(song.artist);
                    artistData.push({ name: song.artist, cover: song.cover });
                }
            });
        }
    });

    return (
        <div className="pb-40 md:pb-32 px-6 md:px-10 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-[#2c2c2e] pb-4">
                <h1 className="text-3xl md:text-4xl font-bold text-white">Artists</h1>
                <div className="hidden md:block">
                    <ProfileButton user={user} onAuth={onAuth} isLoading={isLoading} />
                </div>
            </div>
            
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-8">
                {artistData.slice(0, 15).map((artist, i) => (
                    <div key={i} className="flex flex-col items-center group cursor-pointer p-4 rounded-xl hover:bg-white/5 transition-colors">
                        <div className="w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden shadow-lg mb-4 bg-[#2c2c2e] border-2 border-transparent group-hover:border-[#fa233b] transition-all">
                            <img src={artist.cover} alt={artist.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <h3 className="text-white font-medium text-center truncate w-full px-2">{artist.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">Artist</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DetailView = ({ playlist, onPlayTrack, currentTrack, isPlaying, onBack, user, onAuth, isLoading, onLike, likedSongs }) => {
    return (
        <div className="pb-40 md:pb-32 px-6 md:px-10 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center mb-6">
                 <button onClick={onBack} className="flex items-center gap-1 text-[#fa233b] font-medium hover:underline transition-all">
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>
                <div className="hidden md:block">
                    <ProfileButton user={user} onAuth={onAuth} isLoading={isLoading} />
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8 mb-10">
                <div className="shrink-0 shadow-2xl rounded-lg overflow-hidden w-64 h-64 md:w-72 md:h-72 bg-[#2c2c2e] mx-auto md:mx-0">
                     <img src={playlist.cover} className="w-full h-full object-cover" alt={playlist.title} />
                </div>
                <div className="flex flex-col justify-end pb-2 text-center md:text-left">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">{playlist.title}</h1>
                    <h2 className="text-xl text-[#fa233b] font-medium mb-4">{playlist.author}</h2>
                    <p className="text-gray-400 text-sm max-w-xl leading-relaxed mb-6 line-clamp-2">{playlist.description}</p>
                    <div className="flex items-center justify-center md:justify-start gap-3">
                        <button onClick={() => playlist.songs && playlist.songs.length > 0 && onPlayTrack(playlist.songs[0], playlist.songs)} className="bg-[#fa233b] text-white px-8 py-3 rounded-md font-semibold text-sm hover:bg-[#d41e32] transition flex items-center gap-2">
                            <Play size={18} fill="white" /> Play
                        </button>
                        <button className="bg-[#2c2c2e] text-[#fa233b] px-8 py-3 rounded-md font-semibold text-sm hover:bg-[#3a3a3c] transition flex items-center gap-2">
                            <ArrowLeft size={18} className="rotate-180" /> Shuffle
                        </button>
                    </div>
                </div>
            </div>

            <div className="w-full">
                <div className="mt-2">
                    {!playlist.songs || playlist.songs.length === 0 ? (
                        <div className="p-10 text-center text-gray-500">No songs available.</div>
                    ) : (
                        playlist.songs.map((song, i) => (
                            <div key={song.id} onClick={() => onPlayTrack(song, playlist.songs)} className={`group flex items-center gap-4 px-4 py-3 rounded-md cursor-pointer transition-colors ${currentTrack?.id === song.id ? 'bg-[#2c2c2e]' : 'hover:bg-[#1c1c1e]'}`}>
                                <span className="w-6 text-center text-sm text-gray-500 font-medium group-hover:hidden">{i + 1}</span>
                                <span className="w-6 text-center hidden group-hover:flex items-center justify-center text-gray-300"><Play size={14} fill="currentColor"/></span>
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <img src={song.cover} className="w-10 h-10 rounded shadow-sm object-cover bg-[#2c2c2e]" alt="" />
                                    <div className="flex flex-col min-w-0">
                                        <span className={`text-[15px] truncate font-medium ${currentTrack?.id === song.id ? 'text-[#fa233b]' : 'text-white'}`}>{song.title}</span>
                                        <span className="text-xs text-gray-400 truncate">{song.artist}</span>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500 font-medium">{song.duration}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

const HomeView = ({ onPlaylistClick, playlists, onPlayTrack, currentTrack, user, onAuth, isLoading }) => {
    const [trending, setTrending] = useState([]);

    useEffect(() => {
        const fetchTrending = async () => {
            try {
                const res = await fetch(`https://itunes.apple.com/search?term=top+hits&media=music&entity=song&limit=8`);
                const data = await res.json();
                setTrending(data.results.map(mapItunesTrack));
            } catch (e) {
                console.error("Failed to fetch trending", e);
            }
        };
        fetchTrending();
    }, []);

    const genres = [
        { name: "Pop", color: "from-pink-500 to-rose-500" },
        { name: "Hip-Hop", color: "from-orange-500 to-red-500" },
        { name: "Alternative", color: "from-cyan-500 to-blue-500" },
        { name: "Rock", color: "from-purple-500 to-indigo-500" },
        { name: "Electronic", color: "from-emerald-500 to-teal-500" },
        { name: "R&B", color: "from-indigo-500 to-violet-500" }
    ];

    return (
        <div className="pb-40 md:pb-32 px-6 md:px-10 pt-4 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-6 border-b border-[#2c2c2e] pb-4">
                <h1 className="text-3xl md:text-4xl font-bold text-white pr-12">Home</h1>
                <div className="hidden md:block">
                    <ProfileButton user={user} onAuth={onAuth} isLoading={isLoading} />
                </div>
            </div>

            <section className="mb-10">
                 <div className="flex justify-between items-end mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Flame size={20} className="text-[#fa233b]" fill="#fa233b" /> Trending Now</h2>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {trending.map(song => (
                        <div key={song.id} onClick={() => onPlayTrack(song, trending)} className={`flex items-center gap-3 p-3 rounded-lg bg-[#1c1c1e] hover:bg-[#2c2c2e] cursor-pointer transition-colors group border border-transparent hover:border-[#fa233b]/30 ${currentTrack?.id === song.id ? 'border-[#fa233b]' : ''}`}>
                            <div className="relative w-12 h-12 shrink-0">
                                <img src={song.cover} className="w-full h-full rounded-md object-cover" alt={song.title} />
                                <div className={`absolute inset-0 bg-black/40 flex items-center justify-center ${currentTrack?.id === song.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}><Play size={16} fill="white" className="text-white" /></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className={`text-sm font-semibold truncate ${currentTrack?.id === song.id ? 'text-[#fa233b]' : 'text-white'}`}>{song.title}</h4>
                                <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                            </div>
                        </div>
                    ))}
                 </div>
            </section>

            <section className="mb-10">
                 <div className="flex justify-between items-end mb-4"><h2 className="text-xl font-bold text-white">Featured Mixes</h2></div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {playlists.slice(0, 3).map(pl => (
                        <div key={pl.id} onClick={() => onPlaylistClick(pl.id)} className="group cursor-pointer relative rounded-xl overflow-hidden aspect-[2/1] bg-[#2c2c2e] shadow-lg">
                            <img src={pl.cover} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" alt={pl.title} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 flex flex-col justify-end">
                                <span className="text-[10px] font-bold text-[#fa233b] uppercase tracking-wider mb-1 px-2 py-1 bg-white/10 w-fit rounded backdrop-blur-sm">Exclusive</span>
                                <h3 className="text-2xl font-bold text-white">{pl.title}</h3>
                                <p className="text-gray-300 text-sm mt-1 line-clamp-1 opacity-90">{pl.description}</p>
                            </div>
                        </div>
                    ))}
                 </div>
            </section>

            <section className="mb-10">
                <div className="flex justify-between items-end mb-4"><h2 className="text-xl font-bold text-white">Browse Genres</h2></div>
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {genres.map(g => (
                        <div key={g.name} className={`h-24 rounded-lg bg-gradient-to-br ${g.color} p-4 relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform`}>
                            <span className="font-bold text-white relative z-10">{g.name}</span>
                            <Disc className="absolute -bottom-4 -right-4 text-white/20 w-16 h-16 rotate-12" />
                        </div>
                    ))}
                 </div>
            </section>

            <section>
                <div className="flex justify-between items-end mb-4">
                    <h2 className="text-xl font-bold text-white">Made For You</h2>
                    <button className="text-[#fa233b] text-sm font-medium hover:underline">See All</button>
                 </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-8">
                    {playlists.slice(3).map(pl => (
                        <AlbumCard key={pl.id} playlist={pl} onClick={onPlaylistClick} />
                    ))}
                </div>
            </section>
        </div>
    );
};

const SearchView = ({ onPlayTrack, currentTrack, user, onAuth, isLoading }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if(!query) return;
        setSearching(true);
        try {
            const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=15`);
            const data = await res.json();
            setResults(data.results.map(mapItunesTrack));
        } catch (err) {
            console.error(err);
        }
        setSearching(false);
    };

    return (
        <div className="pb-40 md:pb-32 px-6 md:px-10 pt-4">
            <div className="flex justify-between items-center mb-6 border-b border-[#2c2c2e] pb-4">
                 <h1 className="text-3xl md:text-4xl font-bold text-white pr-12">Search</h1>
                 <div className="hidden md:block">
                    <ProfileButton user={user} onAuth={onAuth} isLoading={isLoading} />
                 </div>
            </div>
            
            <form onSubmit={handleSearch} className="mb-8">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search for Songs, Artists, or Albums..." className="w-full bg-[#1c1c1e] text-white rounded-[6px] py-2 pl-10 pr-4 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#fa233b] transition-all text-[15px]" />
                </div>
            </form>

            {searching ? (
                <div className="text-gray-500 py-10">Searching Music...</div>
            ) : (
                <>
                    <h2 className="text-xl font-bold text-white mb-4">{results.length > 0 ? "Top Results" : "Browse Categories"}</h2>
                    {results.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {results.map((song) => (
                                <div key={song.id} onClick={() => onPlayTrack(song, results)} className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${currentTrack?.id === song.id ? 'bg-[#2c2c2e]' : 'hover:bg-[#1c1c1e]'}`}>
                                    <div className="relative w-12 h-12 rounded-[4px] overflow-hidden shrink-0">
                                        <img src={song.cover} className="w-full h-full object-cover" alt="" />
                                        {currentTrack?.id === song.id && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Volume2 size={16} className="text-[#fa233b]" /></div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`text-[15px] font-medium truncate ${currentTrack?.id === song.id ? 'text-[#fa233b]' : 'text-white'}`}>{song.title}</h4>
                                        <p className="text-[13px] text-gray-400 truncate">{song.artist} • {song.duration}</p>
                                    </div>
                                    <MoreHorizontal size={18} className="text-gray-500" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             {['Pop', 'Hip-Hop', 'Dance', 'Country', 'Rock', 'R&B'].map(genre => (
                                 <div key={genre} className="bg-[#2c2c2e] rounded-lg p-4 h-24 flex items-end font-bold text-lg text-white hover:bg-[#3a3a3c] transition cursor-pointer">
                                     {genre}
                                 </div>
                             ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [view, setView] = useState('home'); 
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [likedSongs, setLikedSongs] = useState([]);
  const [queue, setQueue] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  // New Global State for Player
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  useEffect(() => {
    // Listen for auth state changes (persisted session or new login)
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthInitialized(true); // Mark initial check as done
    });

    // Handle environment specific token if present (overrides persistence)
    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
       signInWithCustomToken(auth, __initial_auth_token);
    }

    return () => unsubscribe();
  }, []);

  const showToast = (message, type = 'success') => {
      setToast({ message, type });
  };

  const handleAuth = async () => {
      setAuthLoading(true);
      try {
          if (user && !user.isAnonymous) {
              await signOut(auth);
              await signInAnonymously(auth);
              showToast("Signed out successfully");
          } else {
              const provider = new GoogleAuthProvider();
              const result = await signInWithPopup(auth, provider);
              showToast(`Welcome, ${result.user.displayName}!`);
          }
      } catch (e) {
          console.error("Auth Error:", e);
          showToast("Authentication failed.", 'error');
      } finally {
          setAuthLoading(false);
      }
  };

  const handleGuest = async () => {
      setAuthLoading(true);
      try {
          await signInAnonymously(auth);
      } catch (e) {
          console.error(e);
          showToast("Guest login failed", 'error');
      } finally {
          setAuthLoading(false);
      }
  };

  // Handle Likes - Firestore Integration
  const handleLike = async (song) => {
      if (!user || user.isAnonymous) {
          showToast("Please sign in to like songs", "error");
          setShowProfileModal(true); // Open modal if not logged in
          return;
      }

      const songRef = doc(db, 'artifacts', appId, 'users', user.uid, 'likedSongs', song.id.toString());
      const isLiked = likedSongs.some(s => s.id === song.id);

      try {
          if (isLiked) {
              await deleteDoc(songRef);
              showToast("Removed from Library");
          } else {
              await setDoc(songRef, { ...song, likedAt: serverTimestamp() });
              showToast("Added to Library");
          }
      } catch (e) {
          console.error("Error updating like:", e);
          showToast("Failed to update library", "error");
      }
  };

  // Sync Liked Songs
  useEffect(() => {
      if (!user || user.isAnonymous) {
          setLikedSongs([]);
          return;
      }

      const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'likedSongs'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
          const songs = snapshot.docs.map(doc => doc.data());
          setLikedSongs(songs);
      }, (error) => {
          console.error("Error fetching liked songs:", error);
      });

      return () => unsubscribe();
  }, [user]);

  // Data
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'playlists'));
    const unsub = onSnapshot(q, async (snap) => {
        if (snap.empty) {
             const animeRes = await fetch('https://itunes.apple.com/search?term=anime%20opening&media=music&entity=song&limit=6');
             const animeData = await animeRes.json();
             const lofiRes = await fetch('https://itunes.apple.com/search?term=ghibli%20jazz&media=music&entity=song&limit=6');
             const lofiData = await lofiRes.json();
             
             await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'playlists'), {
                title: "Anime Hits",
                description: "Top openings and endings.",
                cover: animeData.results[0]?.artworkUrl100?.replace('100x100','600x600'),
                author: "Music App",
                category: "J-Pop",
                songs: animeData.results.map(mapItunesTrack),
                createdAt: serverTimestamp()
             });
             await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'playlists'), {
                title: "Lofi Beats",
                description: "Chill vibes for studying.",
                cover: lofiData.results[0]?.artworkUrl100?.replace('100x100','600x600'),
                author: "Music App",
                category: "Chill",
                songs: lofiData.results.map(mapItunesTrack),
                createdAt: serverTimestamp()
             });
        } else {
            setPlaylists(snap.docs.map(d => ({id: d.id, ...d.data()})));
        }
    });
    return () => unsub();
  }, [user]);

  const handlePlaylistClick = (id) => setView({ type: 'playlist', id });
  
  const handlePlayTrack = (track, newQueue) => {
    if (currentTrack?.id === track.id) {
        setIsPlaying(!isPlaying);
    } else {
        setCurrentTrack(track);
        setIsPlaying(true);
        if(newQueue) setQueue(newQueue);
    }
  };

  const handleNext = () => {
      // Prioritize Queue
      if (queue.length > 0) {
          if (isShuffle) {
              // SHUFFLE LOGIC
              const randomIndex = Math.floor(Math.random() * queue.length);
              handlePlayTrack(queue[randomIndex]);
          } else {
              // LINEAR LOGIC
              const currentIndex = queue.findIndex(s => s.id === currentTrack?.id);
              const nextTrack = queue[(currentIndex + 1) % queue.length]; // Loop
              if(nextTrack) handlePlayTrack(nextTrack);
          }
      } else if (playlists.length) {
          // Fallback to random playlist track if no specific queue
          const pl = playlists[Math.floor(Math.random() * playlists.length)];
          if (pl.songs?.length) handlePlayTrack(pl.songs[Math.floor(Math.random() * pl.songs.length)]);
      }
  };

  const handlePrev = () => {
      if(queue.length > 0) {
          const currentIndex = queue.findIndex(s => s.id === currentTrack?.id);
          const prevTrack = queue[(currentIndex - 1 + queue.length) % queue.length];
          if(prevTrack) handlePlayTrack(prevTrack);
          else {
              const t = currentTrack;
              setCurrentTrack(null);
              setTimeout(() => { setCurrentTrack(t); setIsPlaying(true); }, 50);
          }
      }
  };

  // --- Render Logic ---
  
  if (!authInitialized) {
      return (
          <div className="fixed inset-0 bg-black flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#fa233b] to-purple-600 rounded-2xl flex items-center justify-center animate-pulse">
                      <Music size={32} className="text-white" fill="white" />
                  </div>
                  <Loader2 size={24} className="text-[#fa233b] animate-spin" />
              </div>
          </div>
      );
  }

  let content;
  if (view === 'home') content = <HomeView onPlaylistClick={handlePlaylistClick} playlists={playlists} onPlayTrack={handlePlayTrack} currentTrack={currentTrack} user={user} onAuth={handleAuth} isLoading={authLoading} />;
  else if (view === 'search') content = <SearchView onPlayTrack={handlePlayTrack} currentTrack={currentTrack} user={user} onAuth={handleAuth} isLoading={authLoading} />;
  else if (view === 'radio') content = <RadioView onPlayTrack={handlePlayTrack} currentTrack={currentTrack} user={user} onAuth={handleAuth} isLoading={authLoading} />;
  else if (view === 'library') content = <LibraryView likedSongs={likedSongs} onPlayTrack={handlePlayTrack} currentTrack={currentTrack} user={user} onAuth={handleAuth} isLoading={authLoading} />;
  else if (view === 'artists') content = <ArtistsView playlists={playlists} user={user} onAuth={handleAuth} isLoading={authLoading} />;
  else if (view.type === 'playlist') {
      const pl = playlists.find(p => p.id === view.id);
      content = pl ? <DetailView playlist={pl} onPlayTrack={handlePlayTrack} currentTrack={currentTrack} isPlaying={isPlaying} onBack={() => setView('home')} user={user} onAuth={handleAuth} isLoading={authLoading} onLike={handleLike} likedSongs={likedSongs} /> : null;
  }

  return (
    <div className="fixed inset-0 bg-[#000000] text-white font-sans overflow-hidden">
      <div className="flex h-full">
        {/* Desktop Sidebar */}
        <Sidebar 
            currentView={view} 
            setView={setView} 
            isGuest={user?.isAnonymous} 
            requestLogin={() => setShowProfileModal(true)} 
        />
        
        {/* Main Content */}
        <main className="flex-1 h-full overflow-y-auto bg-[#000000]">
            <div className="max-w-7xl mx-auto h-full">
                {content}
            </div>
        </main>
      </div>

      {/* Bottom Player */}
      <PlayerBar 
        currentTrack={currentTrack} 
        isPlaying={isPlaying} 
        onPlayPause={() => setIsPlaying(!isPlaying)} 
        onNext={handleNext} 
        onPrev={handlePrev}
        onLike={handleLike}
        isLiked={currentTrack ? likedSongs.some(s => s.id === currentTrack.id) : false}
        queue={queue}
        onPlayTrack={handlePlayTrack}
        isShuffle={isShuffle}
        toggleShuffle={() => setIsShuffle(!isShuffle)}
        isRepeat={isRepeat}
        toggleRepeat={() => setIsRepeat(!isRepeat)}
      />
      
      {/* Toast Notification */}
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
      
      {/* Mobile Bottom Navigation */}
      <BottomNav 
        currentView={view} 
        setView={setView} 
        openProfile={() => setShowProfileModal(true)} 
      />
      
      {/* Profile Modal (Used on Mobile & Desktop Trigger) */}
      <ProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
        user={user} 
        onAuth={handleAuth} 
        isLoading={authLoading} 
      />

      <style>{`
        ::-webkit-scrollbar { width: 10px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 5px; border: 2px solid #000; }
        ::-webkit-scrollbar-thumb:hover { background: #555; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
      `}</style>
    </div>
  );
};

export default App;