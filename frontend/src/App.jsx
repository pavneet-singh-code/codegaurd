import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Assignments from './pages/Assignments.jsx';
import AssignmentDetails from './pages/AssignmentDetails.jsx';
import AssignmentForm from './pages/AssignmentForm.jsx';
import AnalysisPage from './pages/AnalysisPage.jsx';
import Analyses from './pages/Analyses.jsx';
import ReportPage from './pages/ReportPage.jsx';
import Insights from './pages/Insights.jsx';
import Students from './pages/Students.jsx';
import SubmitCode from './pages/SubmitCode.jsx';
import SubmissionHistory from './pages/SubmissionHistory.jsx';
import Progress from './pages/Progress.jsx';
import Settings from './pages/Settings.jsx';
import Help from './pages/Help.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/assignments/:id" element={<AssignmentDetails />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<Help />} />
          <Route element={<ProtectedRoute role="PROFESSOR" />}>
            <Route path="/assignments/new" element={<AssignmentForm />} />
            <Route path="/assignments/:id/edit" element={<AssignmentForm />} />
            <Route path="/assignments/:id/analysis" element={<AnalysisPage />} />
            <Route path="/analyses" element={<Analyses />} />
            <Route path="/analyses/:id" element={<ReportPage />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/students" element={<Students />} />
          </Route>
          <Route element={<ProtectedRoute role="STUDENT" />}>
            <Route path="/submit" element={<SubmitCode />} />
            <Route path="/assignments/:id/submit" element={<SubmitCode />} />
            <Route path="/submissions" element={<SubmissionHistory />} />
            <Route path="/progress" element={<Progress />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
