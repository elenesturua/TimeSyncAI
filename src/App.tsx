import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import LandingPage from "@/routes/LandingPage";
import CreateMeeting from "@/routes/CreateMeeting";
import MeetingSent from "@/routes/MeetingSent";
import MeetingRoom from "@/routes/MeetingRoom";
import Success from "@/routes/Success";
import Groups from "@/routes/Groups";
import Profile from "@/routes/Profile";
import Navbar from "@/components/Navbar";
import "@/styles/tailwind.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <div className="min-h-screen">
            <Navbar />
            <main>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/create-meeting" element={<div className="bg-gray-50 min-h-screen"><CreateMeeting /></div>} />
                <Route path="/meeting-sent" element={<div className="bg-gray-50 min-h-screen"><MeetingSent /></div>} />
                <Route path="/meeting/:id" element={<div className="bg-gray-50 min-h-screen"><MeetingRoom /></div>} />
                <Route path="/meeting/:id/success" element={<div className="bg-gray-50 min-h-screen"><Success /></div>} />
                <Route path="/groups" element={<div className="bg-gray-50 min-h-screen"><Groups /></div>} />
                <Route path="/profile" element={<div className="bg-gray-50 min-h-screen"><Profile /></div>} />
              </Routes>
            </main>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
