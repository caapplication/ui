import React, { useState, useEffect, useCallback } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Routes, Route, Navigate, useSearchParams, BrowserRouter, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth.jsx';
import { Toaster } from '@/components/ui/toaster';
import { ApiCacheProvider } from '@/contexts/ApiCacheContext.jsx';
import { SocketProvider } from '@/contexts/SocketContext.jsx';
import LoginForm from '@/components/auth/LoginForm';
import ForgotPassword from '@/components/auth/ForgotPassword';
import ResetPassword from '@/components/auth/ResetPassword';
import VerifyToken from '@/pages/VerifyToken.jsx';
import Sidebar from '@/components/layout/Sidebar';
import EntitySidebar from '@/components/layout/EntitySidebar';
import Dashboard from '@/components/dashboard/Dashboard';
import Documents from '@/components/documents/Documents';
import ClientFinance from '@/components/finance/ClientFinance';
import FinancePage from '@/pages/FinancePage';
import Beneficiaries from '@/components/beneficiaries/Beneficiaries';
import OrganisationBank from '@/components/organisation/OrganisationBank.jsx';
import Profile from '@/components/profile/Profile.jsx';
import { getOrganisationBankAccounts } from '@/lib/api';
import AccountantDashboard from '@/components/accountant/dashboard/AccountantDashboard.jsx';
import AccountantSidebar from '@/components/layout/AccountantSidebar.jsx';
import Services from '@/components/accountant/services/Services.jsx';
import Clients from '@/components/accountant/clients/Clients.jsx';
import Organisation from '@/components/accountant/organisation/Organisation.jsx';
import TeamMembers from '@/components/accountant/team/TeamMembers.jsx';
import Settings from '@/components/accountant/settings/Settings.jsx';
import TaskManagementPage from '@/components/accountant/tasks/TaskManagementPage.jsx';
import RecurringTaskManagementPage from '@/components/accountant/tasks/RecurringTaskManagementPage.jsx';
import TodoPage from '@/components/accountant/tasks/TodoPage.jsx';
import TeamSidebar from '@/components/layout/TeamSidebar.jsx';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/useMediaQuery.jsx';
import ClientUserDashboard from '@/components/dashboard/ClientUserDashboard.jsx';
import TaskDashboardPage from '@/pages/TaskDashboardPage.jsx';
import InvoiceDetailsPage from '@/pages/InvoiceDetailsPage.jsx';
import VoucherDetailsPage from '@/pages/VoucherDetailsPage.jsx';
import VoucherDetailsCAPage from '@/pages/VoucherDetailsCA.jsx';
import BeneficiaryDetailsPage from '@/pages/BeneficiaryDetailsPage.jsx';
import ComingSoon from './pages/ComingSoon.jsx';
import UpcomingTask from './pages/UpcomingTask.jsx';
import PublicDocumentView from './pages/PublicDocumentView.jsx';
import LandingPage from '@/pages/LandingPage.jsx';
import PrivacyPolicy from '@/pages/PrivacyPolicy.jsx';
import TermsOfService from '@/pages/TermsOfService.jsx';

const ProtectedContent = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const navigate = useNavigate();

  const [currentEntity, setCurrentEntity] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [organisationBankAccounts, setOrganisationBankAccounts] = useState([]);

  const fetchOrganisationBankAccounts = useCallback(async () => {
    if (currentEntity && user?.access_token) {
      try {
        const accounts = await getOrganisationBankAccounts(currentEntity, user.access_token);
        setOrganisationBankAccounts(accounts);
      } catch (error) {
        console.error("Failed to fetch organisation bank accounts:", error);
        setOrganisationBankAccounts([]);
      }
    }
  }, [currentEntity, user?.access_token, user?.role]);

  useEffect(() => {
    fetchOrganisationBankAccounts();
  }, [fetchOrganisationBankAccounts]);

  useEffect(() => {
    if (user && !currentEntity) {
      if (user.role === 'ENTITY_USER') {
        setCurrentEntity(user.id);
      } else if (user.role === 'CLIENT_USER') {
        const entitiesToDisplay = user.entities || [];
        if (entitiesToDisplay.length > 0) {
          setCurrentEntity(entitiesToDisplay[0].id);
        } else if (
          user.organization_id &&
          typeof user.organization_id === 'string' &&
          user.organization_id.split('.').length !== 3 // not a JWT
        ) {
          setCurrentEntity(user.organization_id);
        }
      } else if (user.role !== 'CA_ACCOUNTANT') {
        if (
          user.organization_id &&
          typeof user.organization_id === 'string' &&
          user.organization_id.split('.').length !== 3 // not a JWT
        ) {
          setCurrentEntity(user.organization_id);
        } else {
          setCurrentEntity(user.id);
        }
      }
    }
  }, [user, currentEntity]);

  const getEntityName = (entityId) => {
    if (user.role === 'ENTITY_USER') return user.name;
    if (user.role !== 'CLIENT_USER') return user.name;
    const entitiesToDisplay = user.entities || [];
    const entity = entitiesToDisplay.find(e => e.id === entityId);
    if (entity) return entity.name;
    if (entityId === user.organization_id) return user.organization_name;
    return 'Select Entity';
  };

  const handleQuickAction = (action) => {
    switch (action) {
      case 'add-beneficiary':
        navigate('/beneficiaries', { state: { quickAction: 'add-beneficiary' } });
        break;
      case 'add-invoice':
        navigate('/finance', { state: { quickAction: 'add-invoice' } });
        break;
      case 'add-voucher':
        navigate('/finance', { state: { quickAction: 'add-voucher' } });
        break;
      case 'add-organisation-bank':
        navigate('/organisation-bank', { state: { quickAction: 'add-organisation-bank' } });
        break;
      default:
        break;
    }
  };

  let SidebarComponent;
  if (user.role === 'CA_ACCOUNTANT') {
    SidebarComponent = AccountantSidebar;
  } else if (user.role === 'CA_TEAM') {
    SidebarComponent = TeamSidebar;
  } else if (user.role === 'ENTITY_USER') {
    SidebarComponent = EntitySidebar;
  } else {
    SidebarComponent = Sidebar;
  }

  return (
    <div className="flex h-screen bg-transparent overflow-hidden">
      <SidebarComponent
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isOpen={isMobileSidebarOpen}
        setIsOpen={setIsMobileSidebarOpen}
        {...(user.role !== 'ENTITY_USER' && {
          currentEntity: currentEntity,
          setCurrentEntity: setCurrentEntity,
          getEntityName: getEntityName,
        })}
      />
      <main className="flex-1 flex flex-col overflow-auto h-full">
        {!isDesktop && (
          <header className="p-3 sm:p-4 flex items-center justify-between lg:hidden sticky top-0 z-10 bg-black/10 backdrop-blur-sm border-b border-white/10">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileSidebarOpen(true)} className="h-9 w-9 sm:h-10 sm:w-10">
              <Menu className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </Button>
            <div className="text-white font-bold text-base sm:text-lg truncate px-2 flex-1 text-center">{user?.name || user?.agency_name}</div>
            <div className="w-9 sm:w-10"></div>
          </header>
        )}
        <div className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={(user.role === 'CA_ACCOUNTANT' || user.role === 'CA_TEAM') ? <AccountantDashboard /> : <Dashboard entityId={currentEntity} entityName={getEntityName(currentEntity)} onQuickAction={handleQuickAction} organisationBankAccounts={organisationBankAccounts} />} />
            <Route path="/finance/*" element={user.role === 'CLIENT_USER' ? <ClientFinance entityName={getEntityName(currentEntity)} organisationBankAccounts={organisationBankAccounts} quickAction={null} clearQuickAction={() => { }} entityId={currentEntity} organizationName={user?.organization_name} /> : <FinancePage />} />
            <Route path="/documents" element={<Documents entityId={currentEntity} quickAction={null} clearQuickAction={() => { }} />} />
            <Route path="/beneficiaries" element={<Beneficiaries quickAction={null} clearQuickAction={() => { }} />} />
            <Route path="/organisation-bank" element={<OrganisationBank entityId={currentEntity} entityName={getEntityName(currentEntity)} quickAction={null} clearQuickAction={() => { }} organisationBankAccounts={organisationBankAccounts} />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/clients" element={<Clients setActiveTab={() => { }} />} />
            <Route path="/tasks" element={<TaskManagementPage />} />
            <Route path="/recurring-tasks" element={<RecurringTaskManagementPage />} />
            <Route path="/todos" element={<TodoPage />} />
            <Route path="/services" element={<Services />} />
            <Route path="/organisation" element={<Organisation />} />
            <Route path="/team-members" element={<TeamMembers />} />
            <Route path="/settings/*" element={<Settings />} />
            <Route path="/tasks/:taskId" element={<TaskDashboardPage />} />
            <Route path="/invoices/:invoiceId" element={<InvoiceDetailsPage />} />
            <Route path="/finance/vouchers/:voucherId" element={<VoucherDetailsPage />} />
            <Route path="/vouchers/ca/:voucherId" element={<VoucherDetailsCAPage />} />
            <Route path="/beneficiaries/:beneficiaryId" element={<BeneficiaryDetailsPage />} />
            <Route path="/coming-soon" element={<ComingSoon />} />
            <Route path="/upcoming/task" element={<UpcomingTask />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="animated-bg"></div>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes - no authentication required */}
      <Route path="/public/folder/:token" element={<PublicDocumentView />} />
      <Route path="/public/document/:token" element={<PublicDocumentView />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />

      {user ? (
        <>
          <Route path="/login" element={<Navigate to="/" />} />
          <Route path="/*" element={<ProtectedContent />} />
        </>
      ) : (
        <>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/verify" element={<VerifyToken />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </>
      )}
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <SocketProvider>
          <ApiCacheProvider>
            <HelmetProvider>
              <Helmet>
                <title>Fynivo: Simplify Your Finances</title>
                <meta name="description" content="Comprehensive financial management platform for documents, beneficiaries, transactions, and invoice management." />
                <meta property="og:title" content="Fynivo: Simplify Your Finances" />
                <meta property="og:description" content="Comprehensive financial management platform for documents, beneficiaries, transactions, and invoice management." />
                <link rel="icon" type="image/png" href="/logo.png" />
              </Helmet>
              <div className="animated-bg"></div>
              <AppContent />
              <Toaster />
            </HelmetProvider>
          </ApiCacheProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
