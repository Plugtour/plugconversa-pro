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

function isLocalhost() {
  const h = window.location.hostname
  return h === 'localhost' || h === '127.0.0.1'
}

function isAppHost() {
  // ✅ DEV: localhost se comporta como app (pra você conseguir trabalhar)
  if (isLocalhost()) return true
  return window.location.hostname.startsWith('app.')
}

function RequireAuth({ children }) {
  const authed = !!getCookie('pc_auth')
  const local = isLocalhost()
  const appHost = isAppHost()

  // ✅ Se não estiver logado
  if (!authed) {
    // DEV/local e app: vai pra /login interno
    if (local || appHost) return <Navigate to="/login" replace />

    // domínio principal (produção): manda pro login do domínio principal
    window.location.href = 'https://plugconversa.com.br/login'
    return null
  }

  // ✅ Se estiver logado, mas entrou no domínio principal em produção, força app
  if (!local && !window.location.hostname.startsWith('app.')) {
    window.location.href = 'https://app.plugconversa.com.br/dashboard'
    return null
  }

  return children
}

function Router() {
  const appHost = isAppHost()

  // ✅ No subdomínio app OU no localhost: rotas do app na raiz
  if (appHost) {
    return (
      <Routes>
        {/* Público (local/app) */}
        <Route path="/login" element={<Login />} />

        {/* Cliente (protegido) */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppShell kind="client" />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
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
            <RequireAuth>
              <AppShell kind="admin" />
            </RequireAuth>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="clientes" element={<AdminClientes />} />
          <Route path="planos" element={<AdminPlanos />} />
        </Route>

        {/* fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    )
  }

  // ✅ No domínio principal (produção): apenas institucional + login
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/quero-ser-cliente" element={<QueroSerCliente />} />

      {/* bloqueia acesso direto às rotas internas no domínio principal */}
      <Route path="/dashboard" element={<Navigate to="/login" replace />} />
      <Route path="/admin/*" element={<Navigate to="/login" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default Router
// fim: front/src/routes/Router.jsx
