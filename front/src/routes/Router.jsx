// caminho: front/src/routes/Router.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from '../pages/public/home/Home.jsx'
import Login from '../pages/public/login/Login.jsx'
import QueroSerCliente from '../pages/public/quero-ser-cliente/QueroSerCliente.jsx'

import AppShell from '../shared/layout/AppShell.jsx'
import Dashboard from '../pages/app/dashboard/Dashboard.jsx'
import Contatos from '../pages/app/contatos/Contatos.jsx'
import Campanhas from '../pages/app/campanhas/Campanhas.jsx'
import Automacao from '../pages/app/automacao/Automacao.jsx'
import Inbox from '../pages/app/inbox/Inbox.jsx'
import CRM from '../pages/app/crm/CRM.jsx'
import Disparo from '../pages/app/disparo/Disparo.jsx'
import Fluxo from '../pages/app/fluxo/Fluxo.jsx'
import Configuracoes from '../pages/app/configuracoes/Configuracoes.jsx'
import Suporte from '../pages/app/suporte/Suporte.jsx'

import AdminDashboard from '../pages/admin/dashboard/AdminDashboard.jsx'
import AdminClientes from '../pages/admin/clientes/AdminClientes.jsx'
import AdminPlanos from '../pages/admin/planos/AdminPlanos.jsx'

function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
}

function isAppHost() {
  return window.location.hostname.startsWith('app.')
}

function RequireAuth({ children }) {
  const authed = !!getCookie('pc_auth')
  if (!authed) return <Navigate to="/login" replace />

  // 🔒 Força área logada a rodar apenas no subdomínio app.
  if (!isAppHost()) {
    window.location.href = 'https://app.plugconversa.com.br/app'
    return null
  }

  return children
}

function RequireAdminHost({ children }) {
  const authed = !!getCookie('pc_auth')
  if (!authed) return <Navigate to="/login" replace />

  // 🔒 Admin também apenas no subdomínio
  if (!isAppHost()) {
    window.location.href = 'https://app.plugconversa.com.br/admin'
    return null
  }

  return children
}

function Router() {
  return (
    <Routes>
      {/* Público */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/quero-ser-cliente" element={<QueroSerCliente />} />

      {/* Cliente (protegido) */}
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppShell kind="client" />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="crm" element={<CRM />} />
        <Route path="disparo" element={<Disparo />} />
        <Route path="fluxo" element={<Fluxo />} />
        <Route path="configuracoes" element={<Configuracoes />} />
        <Route path="suporte" element={<Suporte />} />
        <Route path="contatos" element={<Contatos />} />
        <Route path="campanhas" element={<Campanhas />} />
        <Route path="automacao" element={<Automacao />} />
      </Route>

      {/* Admin (protegido) */}
      <Route
        path="/admin"
        element={
          <RequireAdminHost>
            <AppShell kind="admin" />
          </RequireAdminHost>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="clientes" element={<AdminClientes />} />
        <Route path="planos" element={<AdminPlanos />} />
      </Route>

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default Router
// fim: front/src/routes/Router.jsx
