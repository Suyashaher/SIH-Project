import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AuthProvider } from './contexts/AuthContext';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';
import AdminDashboard from './pages/admin/Dashboard';
import SchemeList from './pages/admin/SchemeList';
import SchemeConfig from './pages/admin/SchemeConfig';
import AdminApplicationList from './pages/admin/AdminApplicationList';
import OfficerManagement from './pages/admin/OfficerManagement';
import AiInsights from './pages/admin/AiInsights';
import ProcessingAnalytics from './pages/admin/ProcessingAnalytics';
import SelectionManagement from './pages/admin/SelectionManagement';
import OfficerDashboard from './pages/officer/Dashboard';
import ApplicationQueue from './pages/officer/ApplicationQueue';
import ApplicationReview from './pages/officer/ApplicationReview';
import MySchemes from './pages/officer/MySchemes';
import ApplicantDashboard from './pages/applicant/Dashboard';
import BrowseSchemes from './pages/applicant/BrowseSchemes';
import MyApplications from './pages/applicant/MyApplications';
import ApplicationForm from './pages/applicant/ApplicationForm';
import FellowshipList from './pages/admin/FellowshipList';
import FellowshipDetail from './pages/admin/FellowshipDetail';
import MyFellowship from './pages/applicant/MyFellowship';
import VerificationAnalytics from './pages/admin/VerificationAnalytics';
import SelectionAnalytics from './pages/admin/SelectionAnalytics';
import OfficerPerformance from './pages/admin/OfficerPerformance';
import OfficerLeaderboard from './pages/admin/OfficerLeaderboard';
import FellowshipAnalytics from './pages/admin/FellowshipAnalytics';
import ExportReports from './pages/admin/ExportReports';
import Notifications from './pages/Notifications';
import NotificationSettings from './pages/NotificationSettings';

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
        },
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<MainLayout />}>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<About />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Notification routes */}
              <Route path="/notifications" element={<ProtectedRoute allowedRoles={['ADMIN', 'OFFICER', 'APPLICANT']}><Notifications /></ProtectedRoute>} />
              <Route path="/settings/notifications" element={<ProtectedRoute allowedRoles={['ADMIN', 'OFFICER', 'APPLICANT']}><NotificationSettings /></ProtectedRoute>} />

              {/* Admin routes */}
              <Route
                path="/admin/dashboard"
                element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>}
              />
              <Route
                path="/admin/schemes"
                element={<ProtectedRoute allowedRoles={['ADMIN']}><SchemeList /></ProtectedRoute>}
              />
              <Route
                path="/admin/schemes/:id"
                element={<ProtectedRoute allowedRoles={['ADMIN']}><SchemeConfig /></ProtectedRoute>}
              />
              <Route
                path="/admin/schemes/:schemeId/applications"
                element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminApplicationList /></ProtectedRoute>}
              />
              <Route
                path="/admin/officers"
                element={<ProtectedRoute allowedRoles={['ADMIN']}><OfficerManagement /></ProtectedRoute>}
              />
              <Route
                path="/admin/ai-insights"
                element={<ProtectedRoute allowedRoles={['ADMIN']}><AiInsights /></ProtectedRoute>}
              />
              <Route
                path="/admin/processing-analytics"
                element={<ProtectedRoute allowedRoles={['ADMIN']}><ProcessingAnalytics /></ProtectedRoute>}
              />
              <Route
                path="/admin/schemes/:id/selection"
                element={<ProtectedRoute allowedRoles={['ADMIN', 'OFFICER']}><SelectionManagement /></ProtectedRoute>}
              />
              <Route
                path="/admin/fellowships"
                element={<ProtectedRoute allowedRoles={['ADMIN']}><FellowshipList /></ProtectedRoute>}
              />
              <Route
                path="/admin/fellowships/:id"
                element={<ProtectedRoute allowedRoles={['ADMIN']}><FellowshipDetail /></ProtectedRoute>}
              />
              <Route
                path="/admin/analytics/verification"
                element={<ProtectedRoute allowedRoles={['ADMIN']}><VerificationAnalytics /></ProtectedRoute>}
              />
              <Route
                path="/admin/analytics/selection"
                element={<ProtectedRoute allowedRoles={['ADMIN']}><SelectionAnalytics /></ProtectedRoute>}
              />
              <Route
                path="/admin/analytics/officers"
                element={<ProtectedRoute allowedRoles={['ADMIN']}><OfficerPerformance /></ProtectedRoute>}
              />
              <Route
                path="/admin/analytics/leaderboard"
                element={<ProtectedRoute allowedRoles={['ADMIN']}><OfficerLeaderboard /></ProtectedRoute>}
              />
              <Route
                path="/admin/analytics/fellowships"
                element={<ProtectedRoute allowedRoles={['ADMIN']}><FellowshipAnalytics /></ProtectedRoute>}
              />
              <Route
                path="/admin/reports"
                element={<ProtectedRoute allowedRoles={['ADMIN']}><ExportReports /></ProtectedRoute>}
              />
              <Route
                path="/officer/schemes/:id/selection"
                element={<ProtectedRoute allowedRoles={['ADMIN', 'OFFICER']}><SelectionManagement /></ProtectedRoute>}
              />
              <Route
                path="/officer/schemes"
                element={<ProtectedRoute allowedRoles={['OFFICER']}><MySchemes /></ProtectedRoute>}
              />

              {/* Officer routes */}
              <Route
                path="/officer/dashboard"
                element={<ProtectedRoute allowedRoles={['OFFICER']}><OfficerDashboard /></ProtectedRoute>}
              />
              <Route
                path="/officer/applications"
                element={<ProtectedRoute allowedRoles={['OFFICER']}><ApplicationQueue /></ProtectedRoute>}
              />
              <Route
                path="/officer/applications/:id"
                element={<ProtectedRoute allowedRoles={['OFFICER']}><ApplicationReview /></ProtectedRoute>}
              />

              {/* Applicant routes */}
              <Route
                path="/applicant/dashboard"
                element={<ProtectedRoute allowedRoles={['APPLICANT']}><ApplicantDashboard /></ProtectedRoute>}
              />
              <Route
                path="/applicant/schemes"
                element={<ProtectedRoute allowedRoles={['APPLICANT']}><BrowseSchemes /></ProtectedRoute>}
              />
              <Route
                path="/applicant/applications"
                element={<ProtectedRoute allowedRoles={['APPLICANT']}><MyApplications /></ProtectedRoute>}
              />
              <Route
                path="/applicant/applications/:id"
                element={<ProtectedRoute allowedRoles={['APPLICANT']}><ApplicationForm /></ProtectedRoute>}
              />
              <Route
                path="/applicant/fellowship"
                element={<ProtectedRoute allowedRoles={['APPLICANT']}><MyFellowship /></ProtectedRoute>}
              />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
