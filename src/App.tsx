import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MsalProvider } from '@azure/msal-react';
import LandingPage from "@/routes/LandingPage";
import GroupManagement from "@/routes/GroupManagement";
import PlanMeeting from "@/routes/PlanMeeting";
import Dashboard from "@/routes/Dashboard";
import CreateMeeting from "@/routes/CreateMeeting";
import MeetingSent from "@/routes/MeetingSent";
import MeetingRoom from "@/routes/MeetingRoom";
import Success from "@/routes/Success";
import Groups from "@/routes/Groups";
import Profile from "@/routes/Profile";
import TestEmail from "@/routes/TestEmail";
import CalendarDebug from "@/routes/CalendarDebug";
import InviteAcceptance from "@/routes/InviteAcceptance";
import { PageLayout } from "@/components/PageLayout";
import "@/styles/tailwind.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * msal-react is built on the React context API and all parts of your app that require authentication must be 
 * wrapped in the MsalProvider component. You will first need to initialize an instance of PublicClientApplication 
 * then pass this to MsalProvider as a prop. All components underneath MsalProvider will have access to the 
 * PublicClientApplication instance via context as well as all hooks and components provided by msal-react. For more, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-react/docs/getting-started.md
 */
const App = ({ instance }: { instance: any }) => {
  return (
    <MsalProvider instance={instance}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div className="min-h-screen">
            <PageLayout>
              <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/groups" element={<div className="bg-gray-50 min-h-screen"><GroupManagement /></div>} />
                        <Route path="/plan" element={<div className="bg-gray-50 min-h-screen"><PlanMeeting /></div>} />
                        <Route path="/dashboard" element={<div className="bg-gray-50 min-h-screen"><Dashboard /></div>} />
                        <Route path="/create-meeting" element={<div className="bg-gray-50 min-h-screen"><CreateMeeting /></div>} />
                        <Route path="/meeting-sent" element={<div className="bg-gray-50 min-h-screen"><MeetingSent /></div>} />
                        <Route path="/meeting/:id" element={<div className="bg-gray-50 min-h-screen"><MeetingRoom /></div>} />
                        <Route path="/meeting/:id/success" element={<div className="bg-gray-50 min-h-screen"><Success /></div>} />
                        <Route path="/groups-old" element={<div className="bg-gray-50 min-h-screen"><Groups /></div>} />
                        <Route path="/profile" element={<div className="bg-gray-50 min-h-screen"><Profile /></div>} />
                        <Route path="/test-email" element={<div className="bg-gray-50 min-h-screen"><TestEmail /></div>} />
                        <Route path="/calendar-debug" element={<div className="bg-gray-50 min-h-screen"><CalendarDebug /></div>} />
                        <Route path="/invite/:token" element={<InviteAcceptance />} />
              </Routes>
            </PageLayout>
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    </MsalProvider>
  );
};

export default App;
