import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import CommandCenter from './pages/CommandCenter';
import ReportForm from './pages/ReportForm';
import TrackingPage from './pages/TrackingPage';
import NewShipment from './pages/NewShipment';
import LandingPage from './pages/LandingPage';

const LAST_ROUTE_COOKIE = 'chronos_last_route';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

function readCookie(name) {
  const prefix = `${name}=`;
  return document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix))
    ?.slice(prefix.length) || '';
}

function writeCookie(name, value) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function RoutePersistence() {
  const location = useLocation();
  const navigate = useNavigate();
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const savedRoute = decodeURIComponent(readCookie(LAST_ROUTE_COOKIE) || '');
    const isAtLanding = location.pathname === '/';
    const navigationEntry = window.performance?.getEntriesByType?.('navigation')?.[0];
    const isReload = navigationEntry?.type === 'reload';

    if (isAtLanding && isReload && savedRoute && savedRoute !== '/') {
      navigate(savedRoute, { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const currentPath = `${location.pathname}${location.search}${location.hash}`;
    if (location.pathname !== '/') {
      writeCookie(LAST_ROUTE_COOKIE, currentPath);
    }
  }, [location.hash, location.pathname, location.search]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <RoutePersistence />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/command" element={<CommandCenter />} />
        <Route path="/create" element={<NewShipment />} />
        <Route path="/report" element={<ReportForm />} />
        <Route path="/track/:id" element={<TrackingPage />} />
      </Routes>
    </BrowserRouter>
  );
}