import { useAuth } from '../context/AuthContext.jsx';
import { useStats } from '../context/StatsContext.jsx';
import { ErrorMessage, Loading } from '../components/ui.jsx';
import ProfessorOverview from './ProfessorOverview.jsx';
import StudentOverview from './StudentOverview.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const { stats, error } = useStats();
  if (!stats) return error ? <ErrorMessage error={error} /> : <Loading />;
  return user.role === 'PROFESSOR' ? <ProfessorOverview stats={stats} user={user} /> : <StudentOverview stats={stats} user={user} />;
}
