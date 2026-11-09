import React from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./features/authentication/pages/Login";
import Register from "./features/authentication/pages/Register";
import VerifyEmail from "./features/authentication/pages/VerifyEmail";
import ForgotPassword from "./features/authentication/pages/ForgotPassword";
import ResetPassword from "./features/authentication/pages/ResetPassword";
import ChangePassword from "./features/authentication/pages/ChangePassword";
import ProtectedRoute from "./features/authentication/components/ProtectedRoute";
import Account from "./features/account/pages/Account";

import Dashboard from "./pages/Dashboard";
import Users from "./features/users/pages/Users";
import AddUser from "./features/users/pages/AddUser";
import Roles from "./features/roles/pages/Roles";


// ---- Journal Management System (JMS) ----
import RoleRoute from "./features/jms/components/RoleRoute";
import AccountRedirect from "./features/jms/pages/AccountRedirect";
import JmsLanding from "./features/jms/pages/LandingPage";
import JmsAbout from "./features/jms/pages/AboutPage";
import JmsIssues from "./features/jms/pages/Issues";
import JmsAuthorGuide from "./features/jms/pages/AuthorGuide";
import JmsReviewerGuide from "./features/jms/pages/ReviewerGuide";
import JmsEditorial from "./features/jms/pages/EditorialBoard";
import JmsContact from "./features/jms/pages/ContactUs";
import JmsAnnouncements from "./features/jms/pages/Announcements";
import JmsSearch from "./features/jms/pages/SearchPage";
import JmsIssue from "./features/jms/pages/CurrentIssue";
import JmsArticle from "./features/jms/pages/ArticlePage";
import AuthorDashboard from "./features/jms/pages/author/Dashboard";
import AuthorSubmissions from "./features/jms/pages/author/MySubmissions";
import AuthorSubmit from "./features/jms/pages/author/SubmitManuscript";
import AuthorManuscript from "./features/jms/pages/author/ManuscriptDetail";
import AuthorProofs from "./features/jms/pages/author/PendingProofs";
import AuthorProof from "./features/jms/pages/author/ViewProof";
import AuthorFees from "./features/jms/pages/author/PublishingFees";
import EicDashboard from "./features/jms/pages/eic/Dashboard";
import EicScreening from "./features/jms/pages/eic/Screening";
import EicScreen from "./features/jms/pages/eic/ScreenManuscript";
import EicAssign from "./features/jms/pages/eic/AssignReviewers";
import EicAssignDetail from "./features/jms/pages/eic/AssignReviewerDetail";
import EicDecisions from "./features/jms/pages/eic/FinalDecisions";
import EicDecide from "./features/jms/pages/eic/DecideManuscript";
import EicReports from "./features/jms/pages/eic/Reports";
import ReviewerDashboard from "./features/jms/pages/reviewer/Dashboard";
import ReviewerAssignments from "./features/jms/pages/reviewer/MyAssignments";
import ReviewerPending from "./features/jms/pages/reviewer/PendingReview";
import ReviewerAssignment from "./features/jms/pages/reviewer/AssignmentDetail";
import ReviewerSettings from "./features/jms/pages/reviewer/Settings";
import MeDashboard from "./features/jms/pages/managing-editor/Dashboard";
import MePending from "./features/jms/pages/managing-editor/PendingProduction";
import MeProduction from "./features/jms/pages/managing-editor/ProductionDetail";
import MePublish from "./features/jms/pages/managing-editor/PublishPage";
import MePublished from "./features/jms/pages/managing-editor/Published";
import MeViewPublished from "./features/jms/pages/managing-editor/ViewPublished";
import MeIssues from "./features/jms/pages/managing-editor/Issues";
import MeIssueForm from "./features/jms/pages/managing-editor/IssueForm";
import MeViewIssue from "./features/jms/pages/managing-editor/ViewIssue";
import MeReports from "./features/jms/pages/managing-editor/Reports";
import JAdminDashboard from "./features/jms/pages/admin/Dashboard";
import JAdminCategories from "./features/jms/pages/admin/Categories";
import JAdminTypes from "./features/jms/pages/admin/SubjectAreas";
import JAdminMessages from "./features/jms/pages/admin/Messages";
import JAdminMessage from "./features/jms/pages/admin/MessageDetail";
import JAdminAnnouncements from "./features/jms/pages/admin/Announcements";
import JAdminSettings from "./features/jms/pages/admin/Settings";

import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, homePathFor, useAuth } from "./context/AuthContext";

/** "/" and unknown URLs: send people to the right place. */
function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] text-[13px] text-gray-500">
        Loading your session...
      </div>
    );
  }

  return <Navigate to={homePathFor(user)} replace />;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />

            {/* Public authentication pages */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Any signed-in user */}
            <Route element={<ProtectedRoute />}>
              <Route path="/change-password" element={<ChangePassword />} />
              <Route path="/account" element={<Account />} />
            </Route>

            {/* Super Admin portal */}
            <Route element={<ProtectedRoute superAdminOnly />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/users" element={<Users />} />
              <Route path="/users/create" element={<AddUser />} />
              <Route path="/roles" element={<Roles />} />
            </Route>


            {/* Journal Management System: public site */}
            <Route path="/journal" element={<JmsLanding />} />
            <Route path="/about" element={<JmsAbout />} />
            <Route path="/issues" element={<JmsIssues />} />
            <Route path="/issues/current" element={<JmsIssue />} />
            <Route path="/issues/:id" element={<JmsIssue />} />
            <Route path="/journals" element={<Navigate to="/issues" replace />} />
            <Route path="/announcements" element={<JmsAnnouncements />} />
            <Route path="/announcements/:id" element={<JmsAnnouncements />} />
            <Route path="/search" element={<JmsSearch />} />
            <Route path="/articles/:id" element={<JmsArticle />} />
            <Route path="/author-guide" element={<JmsAuthorGuide />} />
            <Route path="/reviewer-guide" element={<JmsReviewerGuide />} />
            <Route path="/editorial" element={<JmsEditorial />} />
            <Route path="/contact" element={<JmsContact />} />

            {/* Journal portals */}
            <Route element={<RoleRoute portal="author" />}>
              <Route path="/author/dashboard" element={<AuthorDashboard />} />
              <Route path="/author/submissions" element={<AuthorSubmissions />} />
              <Route path="/author/submit" element={<AuthorSubmit />} />
              <Route path="/author/manuscript/:id" element={<AuthorManuscript />} />
              <Route path="/author/submissions/:id" element={<AuthorManuscript />} />
              <Route path="/author/submit/:id" element={<AuthorSubmit />} />
              <Route path="/author/pending-proof" element={<AuthorProofs />} />
              <Route path="/author/proof/:id" element={<AuthorProof />} />
              <Route path="/author/fees" element={<AuthorFees />} />
              <Route path="/author/settings" element={<AccountRedirect />} />
            </Route>
            <Route element={<RoleRoute portal="eic" />}>
              <Route path="/eic/dashboard" element={<EicDashboard />} />
              <Route path="/eic/screening" element={<EicScreening />} />
              <Route path="/eic/screen/:id" element={<EicScreen />} />
              <Route path="/eic/assign-reviewers" element={<EicAssign />} />
              <Route path="/eic/assign/:id" element={<EicAssignDetail />} />
              <Route path="/eic/final-decisions" element={<EicDecisions />} />
              <Route path="/eic/decide/:id" element={<EicDecide />} />
              <Route path="/eic/reports" element={<EicReports />} />
              <Route path="/eic/settings" element={<AccountRedirect />} />
            </Route>
            <Route element={<RoleRoute portal="reviewer" />}>
              <Route path="/reviewer/dashboard" element={<ReviewerDashboard />} />
              <Route path="/reviewer/assignments" element={<ReviewerAssignments />} />
              <Route path="/reviewer/pending" element={<ReviewerPending />} />
              <Route path="/reviewer/assignment/:id" element={<ReviewerAssignment />} />
              <Route path="/reviewer/invitation/:id" element={<ReviewerAssignment />} />
              <Route path="/reviewer/settings" element={<ReviewerSettings />} />
            </Route>
            <Route element={<RoleRoute portal="manager" />}>
              <Route path="/managing-editor/dashboard" element={<MeDashboard />} />
              <Route path="/managing-editor/pending-production" element={<MePending />} />
              <Route path="/managing-editor/production/:id" element={<MeProduction />} />
              <Route path="/managing-editor/publish/:id" element={<MePublish />} />
              <Route path="/managing-editor/published" element={<MePublished />} />
              <Route path="/managing-editor/published/:id" element={<MeViewPublished />} />
              <Route path="/managing-editor/issues" element={<MeIssues />} />
              <Route path="/managing-editor/issues/add" element={<MeIssueForm />} />
              <Route path="/managing-editor/issues/view/:id" element={<MeViewIssue />} />
              <Route path="/managing-editor/issues/edit/:id" element={<MeIssueForm />} />
              <Route path="/managing-editor/reports" element={<MeReports />} />
              <Route path="/managing-editor/settings" element={<AccountRedirect />} />
            </Route>
            <Route element={<RoleRoute portal="admin" />}>
              <Route path="/admin/dashboard" element={<JAdminDashboard />} />
              <Route path="/admin/categories" element={<JAdminCategories />} />
              <Route path="/admin/subjects" element={<JAdminTypes />} />
              <Route path="/admin/messages" element={<JAdminMessages />} />
              <Route path="/admin/messages/:id" element={<JAdminMessage />} />
              <Route path="/admin/announcements" element={<JAdminAnnouncements />} />
              <Route path="/admin/settings" element={<JAdminSettings />} />
              <Route path="/admin/reports" element={<EicReports />} />
            </Route>

            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
