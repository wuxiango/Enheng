import { Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { AdminPage } from './pages/AdminPage'
import { HomePage } from './pages/HomePage'
import { StatusPage } from './pages/StatusPage'
import { TopicPage } from './pages/TopicPage'

export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<HomePage />} />
        <Route path="topic/:id" element={<TopicPage />} />
        <Route path="status/:id" element={<StatusPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
    </Routes>
  )
}
