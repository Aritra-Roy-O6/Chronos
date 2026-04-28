import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CommandCenter from './pages/CommandCenter';
import ReportForm from './pages/ReportForm';
import TrackingPage from './pages/TrackingPage';
import NewShipment from './pages/NewShipment'; // 🌟 NEW: Import the Shipment Component

export default function App() {
  return (
    <BrowserRouter>
      <div className="w-screen h-screen overflow-hidden bg-black text-white font-sans">
        <Routes>
          {/* The Desktop 3D Dashboard */}
          <Route path="/" element={<CommandCenter />} />
          
          {/* 🌟 NEW: The Autonomous User Shipment Lifecycle Form */}
          <Route path="/create" element={<NewShipment />} />
          
          {/* The Mobile Public Ingestion Form */}
          <Route path="/report" element={<ReportForm />} />
          
          {/* The Live Status Tracker */}
          <Route path="/track/:id" element={<TrackingPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}