import { Routes, Route, Navigate } from 'react-router-dom'
import Navigation from './components/Navigation'
import HomePage from './pages/HomePage'
import ExplorePage from './pages/ExplorePage'
import CollegeDetailsPage from './pages/CollegeDetailsPage'
import MyCollegesPage from './pages/MyCollegesPage'
import LoginPage from './pages/LoginPage'
import { useAuth } from './auth/AuthContext'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <main className="pt-16">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            <ProtectedRoute><HomePage /></ProtectedRoute>
          } />
          <Route path="/explore" element={
            <ProtectedRoute><ExplorePage /></ProtectedRoute>
          } />
          <Route path="/my-colleges" element={
            <ProtectedRoute><MyCollegesPage /></ProtectedRoute>
          } />
          <Route path="/college/:id" element={
            <ProtectedRoute><CollegeDetailsPage /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
