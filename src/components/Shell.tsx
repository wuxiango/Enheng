import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AdminSessionProvider } from './adminSession'
import { AlbumColumn } from './AlbumColumn'
import { Roadmap } from './Roadmap'
import { SiteNav } from './SiteNav'
import { SocialDock } from './SocialDock'

export function Shell() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light')
  const dark = theme === 'dark'

  function toggleTheme() {
    const next = dark ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    localStorage.setItem('theme', next)
    setTheme(next)
  }

  return (
    <AdminSessionProvider>
      <SiteNav />
      <div className="app">
        <AlbumColumn dark={dark} onToggleTheme={toggleTheme} />
        <main className="column">
          <Outlet />
        </main>
        <Roadmap />
      </div>
      <SocialDock />
    </AdminSessionProvider>
  )
}
