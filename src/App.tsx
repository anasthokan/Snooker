import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import SuperDashboard from './pages/superadmin/SuperDashboard';
import TenantsList from './pages/superadmin/TenantsList';
import Plans from './pages/superadmin/Plans';
import SystemMetrics from './pages/superadmin/SystemMetrics';
import TableFloor from './pages/tenant/TableFloor';
import KeepTournamentGoing from './pages/tenant/KeepTournamentGoing';
import TenantOverview from './pages/tenant/TenantOverview';
import GameTypes from './pages/tenant/GameTypes';
import GameUnits from './pages/tenant/GameUnits';
import StartGame from './pages/tenant/StartGame';
import ActiveSessions from './pages/tenant/ActiveSessions';
import CompletedSessions from './pages/tenant/CompletedSessions';
import CompletedSessionDetail from './pages/tenant/CompletedSessionDetail';
import Canteen from './pages/tenant/Canteen';
import EndSession from './pages/tenant/EndSession';
import Reports from './pages/tenant/Reports';
import Repayments from './pages/tenant/Repayments';
import RoleManagement from './pages/tenant/RoleManagement';
import Products from './pages/tenant/Products';
import Customers from './pages/tenant/Customers';
import CustomerAccounts from './pages/tenant/CustomerAccounts';
import CustomerPay from './pages/public/CustomerPay';
import PaySuccess from './pages/public/PaySuccess';
import CustomerLogin from './pages/customer/CustomerLogin';
import CustomerSignup from './pages/customer/CustomerSignup';
import CustomerTables from './pages/customer/CustomerTables';
import CustomerCanteen from './pages/customer/CustomerCanteen';
import CustomerEndSession from './pages/customer/CustomerEndSession';
import CustomerAccount from './pages/customer/CustomerAccount';
import CustomerLayout from './components/CustomerLayout';
import Profile from './pages/Profile';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/pay" element={<CustomerPay />} />
          <Route path="/pay/success" element={<PaySuccess />} />
          <Route path="/customer/login" element={<CustomerLogin />} />
          <Route path="/customer/signup" element={<CustomerSignup />} />
          <Route path="/customer" element={<Navigate to="/customer/tables" replace />} />
          <Route
            path="/customer/tables"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerLayout>
                  <CustomerTables />
                </CustomerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/session/:sessionId/canteen"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerLayout>
                  <CustomerCanteen />
                </CustomerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/session/:sessionId/end"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerLayout>
                  <CustomerEndSession />
                </CustomerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/account"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerLayout>
                  <CustomerAccount />
                </CustomerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/super"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AppLayout>
                  <SuperDashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/super/tenants"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AppLayout>
                  <TenantsList />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/super/plans"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AppLayout>
                  <Plans />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/super/metrics"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AppLayout>
                  <SystemMetrics />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/super/profile"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AppLayout>
                  <Profile />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant"
            element={
              <ProtectedRoute allowedRoles={['tenant_owner', 'manager', 'cashier']}>
                <AppLayout>
                  <TableFloor />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/overview"
            element={
              <ProtectedRoute allowedRoles={['tenant_owner', 'manager', 'cashier']}>
                <AppLayout>
                  <TenantOverview />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/game-types"
            element={
              <ProtectedRoute allowedRoles={['tenant_owner', 'manager', 'cashier']}>
                <AppLayout>
                  <GameTypes />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/game-units"
            element={
              <ProtectedRoute allowedRoles={['tenant_owner', 'manager', 'cashier']}>
                <AppLayout>
                  <GameUnits />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/products"
            element={
              <ProtectedRoute allowedRoles={['tenant_owner', 'manager', 'cashier']}>
                <AppLayout>
                  <Products />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/customers"
            element={
              <ProtectedRoute allowedRoles={['tenant_owner', 'manager', 'cashier']}>
                <AppLayout>
                  <Customers />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/customer-accounts"
            element={
              <ProtectedRoute allowedRoles={['tenant_owner', 'manager', 'cashier']}>
                <AppLayout>
                  <CustomerAccounts />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/start-game"
            element={
              <ProtectedRoute allowedRoles={['tenant_owner', 'manager', 'cashier']}>
                <AppLayout>
                  <StartGame />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/tournament"
            element={
              <ProtectedRoute allowedRoles={['tenant_owner', 'manager', 'cashier']}>
                <AppLayout>
                  <KeepTournamentGoing />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/sessions"
            element={
              <ProtectedRoute allowedRoles={['tenant_owner', 'manager', 'cashier']}>
                <AppLayout>
                  <ActiveSessions />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/completed-sessions"
            element={
              <ProtectedRoute allowedRoles={['tenant_owner', 'manager', 'cashier']}>
                <AppLayout>
                  <CompletedSessions />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/completed-sessions/:sessionId"
            element={
              <ProtectedRoute allowedRoles={['tenant_owner', 'manager', 'cashier']}>
                <AppLayout>
                  <CompletedSessionDetail />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/session/:sessionId/canteen"
            element={
              <ProtectedRoute allowedRoles={['tenant_owner', 'manager', 'cashier']}>
                <AppLayout>
                  <Canteen />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/session/:sessionId/end"
            element={
              <ProtectedRoute allowedRoles={['tenant_owner', 'manager', 'cashier']}>
                <AppLayout>
                  <EndSession />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/reports"
            element={
              <ProtectedRoute allowedRoles={['tenant_owner', 'manager', 'cashier']}>
                <AppLayout>
                  <Reports />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/repayments"
            element={
              <ProtectedRoute allowedRoles={['tenant_owner', 'manager', 'cashier']}>
                <AppLayout>
                  <Repayments />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/roles"
            element={
              <ProtectedRoute allowedRoles={['tenant_owner', 'manager']}>
                <AppLayout>
                  <RoleManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenant/profile"
            element={
              <ProtectedRoute allowedRoles={['tenant_owner', 'manager', 'cashier']}>
                <AppLayout>
                  <Profile />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
