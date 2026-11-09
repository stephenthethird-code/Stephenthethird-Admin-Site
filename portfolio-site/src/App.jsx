import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider }     from "./context/ThemeContext";
import { AuthProvider  }     from "./context/AuthContext";
import { AdminDataProvider } from "./context/AdminDataContext";
import ProtectedRoute        from "./components/auth/ProtectedRoute";
import { useTheme }          from "./context/ThemeContext";

// Public layouts
import Nav      from "./components/Nav";
import Hero     from "./components/Hero";
import Explorer from "./components/Explorer";
import Credits  from "./components/Credits";
import Contact  from "./components/Contact";
import Footer   from "./components/Footer";
import LayoutEditorial from "./layouts/LayoutEditorial";
import LayoutPortfolio from "./layouts/LayoutPortfolio";

// Auth
import Login from "./components/auth/Login";

// Admin pages
import AdminDashboard  from "./pages/AdminDashboard";
import AdminTracks     from "./pages/AdminTracks";
import AdminCredits    from "./pages/AdminCredits";
import AdminContacts   from "./pages/AdminContacts";
import AdminMap        from "./pages/AdminMap";
import AdminWhiteboard from "./pages/AdminWhiteboard";
import AdminGmail      from "./pages/AdminGmail";
import AdminWebInbox   from "./pages/AdminWebInbox";
import AdminInbox      from "./pages/AdminInbox";
import AdminDesign     from "./pages/AdminDesign";
import AdminReview     from "./pages/AdminReview";
import AdminFollowUps  from "./pages/AdminFollowUps";
import AdminAnalytics  from "./pages/AdminAnalytics";
import AdminCalendar   from "./pages/AdminCalendar";
import AdminBeats      from "./pages/AdminBeats";
import AdminIncome     from "./pages/AdminIncome";
import AdminDispatch   from "./pages/AdminDispatch";

function LayoutUntitled() {
  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">
      <Nav /><main><Hero /><Explorer /><Credits /><Contact /></main><Footer />
    </div>
  );
}

function PublicSite() {
  const { theme } = useTheme();
  if (theme.layout === "editorial") return <LayoutEditorial />;
  if (theme.layout === "portfolio") return <LayoutPortfolio />;
  return <LayoutUntitled />;
}

const Emp = ({ children }) => <ProtectedRoute require="employee">{children}</ProtectedRoute>;
const SA  = ({ children }) => <ProtectedRoute require="superadmin">{children}</ProtectedRoute>;

// Wrap all admin pages in a single AdminDataProvider so they share
// contacts + projects + auto-sync state for the entire session.
function AdminSection({ children }) {
  return <AdminDataProvider>{children}</AdminDataProvider>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Root → Studio OS */}
            <Route path="/"      element={<Navigate to="/admin" replace />} />
            <Route path="/login" element={<Login />} />

            {/* Public portfolio (future standalone site) */}
            <Route path="/site"  element={<PublicSite />} />

            {/* Admin — all employee+ */}
            <Route path="/admin"            element={<Emp><AdminSection><AdminDashboard  /></AdminSection></Emp>} />
            <Route path="/admin/tracks"     element={<Emp><AdminSection><AdminTracks     /></AdminSection></Emp>} />
            <Route path="/admin/credits"    element={<Emp><AdminSection><AdminCredits    /></AdminSection></Emp>} />
            <Route path="/admin/contacts"   element={<Emp><AdminSection><AdminContacts   /></AdminSection></Emp>} />
            <Route path="/admin/map"        element={<Emp><AdminSection><AdminMap        /></AdminSection></Emp>} />
            <Route path="/admin/whiteboard" element={<Emp><AdminSection><AdminWhiteboard /></AdminSection></Emp>} />
            <Route path="/admin/followups"  element={<Emp><AdminSection><AdminFollowUps  /></AdminSection></Emp>} />
            <Route path="/admin/gmail"      element={<Emp><AdminSection><AdminGmail      /></AdminSection></Emp>} />
            <Route path="/admin/web-inbox"  element={<Emp><AdminSection><AdminWebInbox   /></AdminSection></Emp>} />
            <Route path="/admin/inbox"      element={<Emp><AdminSection><AdminInbox      /></AdminSection></Emp>} />
            <Route path="/admin/review"     element={<Emp><AdminSection><AdminReview     /></AdminSection></Emp>} />
            <Route path="/admin/analytics" element={<Emp><AdminSection><AdminAnalytics  /></AdminSection></Emp>} />
            <Route path="/admin/calendar"  element={<Emp><AdminSection><AdminCalendar   /></AdminSection></Emp>} />
            <Route path="/admin/beats"     element={<Emp><AdminSection><AdminBeats      /></AdminSection></Emp>} />
            <Route path="/admin/income"    element={<Emp><AdminSection><AdminIncome     /></AdminSection></Emp>} />
            <Route path="/admin/dispatch"  element={<Emp><AdminSection><AdminDispatch   /></AdminSection></Emp>} />

            {/* Design Engine — superadmin only */}
            <Route path="/admin/design"     element={<SA><AdminSection><AdminDesign /></AdminSection></SA>} />

            {/* Fallback */}
            <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
