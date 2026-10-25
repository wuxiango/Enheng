import { createContext, useContext, useState, type ReactNode } from 'react'

const AdminSessionContext = createContext<{
  authed: boolean
  setAuthed: (value: boolean) => void
} | null>(null)

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false)
  return <AdminSessionContext.Provider value={{ authed, setAuthed }}>{children}</AdminSessionContext.Provider>
}

export function useAdminSession() {
  const value = useContext(AdminSessionContext)
  if (!value) throw new Error('AdminSessionProvider 缺失')
  return value
}
