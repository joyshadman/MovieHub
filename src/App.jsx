import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { auth } from './components/firebase';
import { writePresence, markOffline, activityFor, getDeviceModel, getBrowser, getIpAddress, HEARTBEAT_MS } from './services/presence';
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { Toaster } from 'react-hot-toast';

import LoadingScreen from './components/LoadingScreen';
import Navbar from './components/Navbar';
import DeviceModal from './components/DeviceModal';
import Footer from './components/Footer';
import { WatchlistProvider } from './context/WatchlistContext';
import { Spinner } from './components/ui/feedback';

const Home = lazy(() => import('./Pages/Home'));
const SearchPage = lazy(() => import('./Pages/Search'));
const MyList = lazy(() => import('./Pages/MyList'));
const Categories = lazy(() => import('./Pages/Categories'));
const CategoryPage = lazy(() => import('./Pages/CategoryPage'));
const CollectionPage = lazy(() => import('./Pages/CollectionPage'));
const BrowsePage = lazy(() => import('./Pages/BrowsePage'));
const MovieDetails = lazy(() => import('./Pages/MovieDetails'));
const About = lazy(() => import('./Pages/About'));
const Login = lazy(() => import('./Pages/auth/Login'));
const Signup = lazy(() => import('./Pages/auth/Signup'));
const ForgotPassword = lazy(() => import('./Pages/auth/ForgotPassword'));
const NotFound = lazy(() => import('./Pages/NotFound'));

const AUTH_PATHS = ['/login', '/signup', '/forgot-password'];

// Signed in visitors have no reason to see the auth pages.
const GuestOnly = ({ user, children }) => (user ? <Navigate to="/" replace /> : children);

const RouteFallback = () => (
  <div className="font-body min-h-[70vh] flex flex-col items-center justify-center bg-canvas text-white gap-4 px-6">
    <Spinner size={36} />
    <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-muted">Loading</p>
  </div>
);

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const AppContent = ({ user, isAppReady }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Visitor tracker (src/services/presence.js): the current page on every route change,
  // a heartbeat while the tab is visible, and offline when the tab is hidden or closed.
  useEffect(() => {
    if (!user || !isAppReady) return;
    writePresence(user, {
      isOnline: true,
      deviceModel: getDeviceModel(),
      browser: getBrowser(),
      currentPage: location.pathname,
      watching: activityFor(location.pathname),
    });
  }, [user, location.pathname, isAppReady]);

  // IP address for the owner's tracker: once per sign in and tab session.
  useEffect(() => {
    if (!user || !isAppReady) return undefined;
    let cancelled = false;
    getIpAddress().then((ip) => { if (ip && !cancelled) writePresence(user, { ip }); });
    return () => { cancelled = true; };
  }, [user, isAppReady]);

  useEffect(() => {
    if (!user || !isAppReady) return undefined;
    const beat = () => { if (!document.hidden) writePresence(user, { isOnline: true }); };
    const timer = setInterval(beat, HEARTBEAT_MS);
    const onVisibility = () => writePresence(user, { isOnline: !document.hidden });
    const onPageHide = () => markOffline(user);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [user, isAppReady]);

  const handleMovieClick = (movie) => {
    if (!movie || !movie.id) return;
    const type = movie.type || movie.media_type || (movie.first_air_date ? 'tv' : 'movie');
    navigate(`/details/${type}/${movie.id}`);
  };

  const isAuthPage = AUTH_PATHS.includes(location.pathname);

  // Keyed by path so every route change replays a soft fade in.
  const routes = (
    <div key={location.pathname} className="motion-safe:animate-page">
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movies" element={<BrowsePage key="movie" type="movie" />} />
        <Route path="/tv" element={<BrowsePage key="tv" type="tv" />} />
        <Route path="/search" element={<SearchPage onMovieClick={handleMovieClick} />} />
        <Route path="/mylist" element={<MyList user={user} onMovieClick={handleMovieClick} />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/categories/:genreId" element={<CategoryPage />} />
        <Route path="/collection/:slug" element={<CollectionPage />} />
        <Route path="/about" element={<About user={user} />} />
        <Route path="/details/:type/:id" element={<MovieDetails />} />
        <Route path="/movie/:id" element={<MovieDetails />} />
        <Route path="/tv/:id" element={<MovieDetails />} />
        <Route path="/login" element={<GuestOnly user={user}><Login /></GuestOnly>} />
        <Route path="/signup" element={<GuestOnly user={user}><Signup /></GuestOnly>} />
        <Route path="/forgot-password" element={<GuestOnly user={user}><ForgotPassword /></GuestOnly>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas text-white font-body">
      <ScrollToTop />
      {isAuthPage ? (
        routes
      ) : (
        <>
          <Navbar user={user} />
          <main id="main" className="pb-20 md:pb-0">
            {routes}
            <Footer />
          </main>
        </>
      )}
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [showLoading, setShowLoading] = useState(() => {
    return !sessionStorage.getItem('hasLoadedBefore');
  });
  const [isAppReady, setIsAppReady] = useState(() => {
    return !!sessionStorage.getItem('hasLoadedBefore');
  });

  useEffect(() => {
    getRedirectResult(auth).catch((err) => console.error('Redirect sign-in:', err));
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (showLoading) {
      const timer = setTimeout(() => {
        sessionStorage.setItem('hasLoadedBefore', 'true');
        setShowLoading(false);
        setIsAppReady(true);
      }, 2800);
      return () => clearTimeout(timer);
    }
  }, [showLoading]);

  return (
    <Router>
      {showLoading && (
        <LoadingScreen
          minDuration={2800}
          logoText="MovieHub"
          tagline="Stream Everything"
          loadingLabel="Loading"
        />
      )}

      <DeviceModal isAppReady={isAppReady} />

      <Toaster
        position="bottom-center"
        containerStyle={{ bottom: 88 }}
        toastOptions={{
          style: {
            background: 'var(--color-sheet)',
            color: '#fff',
            border: '1px solid var(--color-line-strong)',
            borderRadius: '12px',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            padding: '10px 14px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: 'var(--color-accent)', secondary: '#fff' } },
        }}
      />
      <WatchlistProvider user={user}>
        <AppContent user={user} isAppReady={isAppReady} />
      </WatchlistProvider>
    </Router>
  );
};

export default App;