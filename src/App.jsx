import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Routes, Route, Navigate, useSearchParams, BrowserRouter, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth.jsx';
import { Toaster } from '@/components/ui/toaster';
import { ApiCacheProvider } from '@/contexts/ApiCacheContext.jsx';
import { SocketProvider } from '@/contexts/SocketContext.jsx';
import { getOrganisationBankAccounts } from '@/lib/api/finance';
import { listClientsByOrganization } from '@/lib/api/clients';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/useMediaQuery.jsx';

const LoginForm = lazy(() => import('@/components/auth/LoginForm'));
const ForgotPassword = lazy(() => import('@/components/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/components/auth/ResetPassword'));
const TwoFactorVerify = lazy(() => import('@/components/auth/TwoFactorVerify'));
const VerifyToken = lazy(() => import('@/pages/VerifyToken.jsx'));
const Sidebar = lazy(() => import('@/components/layout/Sidebar'));
const EntitySidebar = lazy(() => import('@/components/layout/EntitySidebar'));
const TeamSidebar = lazy(() => import('@/components/layout/TeamSidebar.jsx'));
const AccountantSidebar = lazy(() => import('@/components/layout/AccountantSidebar.jsx'));
const Dashboard = lazy(() => import('@/components/dashboard/Dashboard'));
const Documents = lazy(() => import('@/components/documents/Documents'));
const ClientFinance = lazy(() => import('@/components/finance/ClientFinance'));
const FinancePage = lazy(() => import('@/pages/FinancePage'));
const Beneficiaries = lazy(() => import('@/components/beneficiaries/Beneficiaries'));
const OrganisationBank = lazy(() => import('@/components/organisation/OrganisationBank.jsx'));
const Profile = lazy(() => import('@/components/profile/Profile.jsx'));
const AccountantDashboard = lazy(() => import('@/components/accountant/dashboard/AccountantDashboard.jsx'));
const Services = lazy(() => import('@/components/accountant/services/Services.jsx'));
const Clients = lazy(() => import('@/components/accountant/clients/Clients.jsx'));
const Organisation = lazy(() => import('@/components/accountant/organisation/Organisation.jsx'));
const TeamMembers = lazy(() => import('@/components/accountant/team/TeamMembers.jsx'));
const Settings = lazy(() => import('@/components/accountant/settings/Settings.jsx'));
const TaskManagementPage = lazy(() => import('@/components/accountant/tasks/TaskManagementPage.jsx'));
const RecurringTaskManagementPage = lazy(() => import('@/components/accountant/tasks/RecurringTaskManagementPage.jsx'));
const TodoPage = lazy(() => import('@/components/accountant/tasks/TodoPage.jsx'));
const ClientUsersPage = lazy(() => import('@/pages/ClientUsersPage.jsx'));
const TaskDashboardPage = lazy(() => import('@/pages/TaskDashboardPage'));
const InvoiceDetailsPage = lazy(() => import('@/pages/InvoiceDetailsPage.jsx'));
const VoucherDetailsPage = lazy(() => import('@/pages/VoucherDetailsPage.jsx'));
const VoucherDetailsCAPage = lazy(() => import('@/pages/VoucherDetailsCA.jsx'));
const BeneficiaryDetailsPage = lazy(() => import('@/pages/BeneficiaryDetailsPage.jsx'));
const ComingSoon = lazy(() => import('./pages/ComingSoon.jsx'));
const UpcomingTask = lazy(() => import('./pages/UpcomingTask.jsx'));
const PublicDocumentView = lazy(() => import('./pages/PublicDocumentView.jsx'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy.jsx'));
const TermsOfService = lazy(() => import('@/pages/TermsOfService.jsx'));
const GlobalFAB = lazy(() => import('@/components/common/GlobalFAB'));

const FullScreenLoader = () => (
  <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
    <div className="animated-bg"></div>
    <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-primary"></div>
  </div>
);

const SectionLoader = () => (
  <div className="flex h-full min-h-[200px] w-full items-center justify-center py-10">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const SidebarSkeleton = () => (
  <aside className="hidden lg:flex w-64 shrink-0 items-center justify-center bg-black/10 text-white/70">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
  </aside>
);

const ProtectedContent = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const navigate = useNavigate();

  const [currentEntity, setCurrentEntity] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [organisationBankAccounts, setOrganisationBankAccounts] = useState([]);
  const [cachedClients, setCachedClients] = useState([]); // Cache for client names

  // Fetch clients for name resolution (CLIENT_USER / CLIENT_MASTER_ADMIN)
  useEffect(() => {
    const fetchClientsForNameResolution = async () => {
      if ((user?.role === 'CLIENT_USER' || user?.role === 'CLIENT_MASTER_ADMIN') && user?.organization_id && user?.access_token) {
        try {
          const clients = await listClientsByOrganization(user.organization_id, user.access_token);
          if (Array.isArray(clients)) {
            setCachedClients(clients);
          }
        } catch (error) {
          console.error("Failed to fetch clients for name resolution", error);
        }
      }
    };

    if (user) {
      fetchClientsForNameResolution();
    }
  }, [user]);

  const fetchOrganisationBankAccounts = useCallback(async () => {
    if (currentEntity && user?.access_token) {
      try {
        const accounts = await getOrganisationBankAccounts(currentEntity, user.access_token);
        setOrganisationBankAccounts(accounts);
      } catch (error) {
        console.error('Failed to fetch organisation bank accounts:', error);
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
      } else if (user.role === 'CLIENT_USER' || user.role === 'CLIENT_ADMIN' || user.role === 'CLIENT_MASTER_ADMIN') {
        const entitiesToDisplay = user.entities || [];
        if (entitiesToDisplay.length > 0) {
          setCurrentEntity(entitiesToDisplay[0].id);
        } else if (
          user.organization_id &&
          typeof user.organization_id === 'string' &&
          user.organization_id.split('.').length !== 3
        ) {
          setCurrentEntity(user.organization_id);
        }
      } else if (user.role !== 'CA_ACCOUNTANT' && user.role !== 'CA_TEAM') {
        if (
          user.organization_id &&
          typeof user.organization_id === 'string' &&
          user.organization_id.split('.').length !== 3
        ) {
          setCurrentEntity(user.organization_id);
        } else {
          setCurrentEntity(user.id);
        }
      }
    }
  }, [user, currentEntity]);

  // Sync currentEntity to localStorage for other components to use
  useEffect(() => {
    if (currentEntity) {
      localStorage.setItem('entityId', currentEntity);
    }
  }, [currentEntity]);

  const getEntityName = (entityId) => {
    if (user.role === 'ENTITY_USER') return user.name;
    if (user.role !== 'CLIENT_USER' && user.role !== 'CLIENT_MASTER_ADMIN') return user.name;

    // Check cached clients first (most up-to-date)
    const cachedClient = cachedClients.find(c => c.id === entityId);
    if (cachedClient) return cachedClient.name;

    const entitiesToDisplay = user.entities || [];
    const entity = entitiesToDisplay.find((e) => e.id === entityId);
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

  let SidebarComponent = Sidebar;
  if (user.role === 'CA_ACCOUNTANT') {
    SidebarComponent = AccountantSidebar;
  } else if (user.role === 'CA_TEAM') {
    SidebarComponent = TeamSidebar;
  } else if (user.role === 'ENTITY_USER') {
    SidebarComponent = EntitySidebar;
  }

  return (
    <div className="flex h-screen bg-transparent overflow-hidden">
      <Suspense fallback={<SidebarSkeleton />}>
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
      </Suspense>
      <main className="flex-1 flex flex-col overflow-auto h-full">
        {!isDesktop && (
          <header className="p-3 sm:p-4 flex items-center justify-between lg:hidden sticky top-0 z-10 bg-black/10 backdrop-blur-sm border-b border-white/10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="h-9 w-9 sm:h-10 sm:w-10"
            >
              <Menu className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </Button>
            <div className="text-white font-bold text-base sm:text-lg truncate px-2 flex-1 text-center">
              {user?.name || user?.agency_name}
            </div>
            <div className="w-9 sm:w-10"></div>
          </header>
        )}
        <div className="flex-1 overflow-y-auto">
          <Suspense fallback={<SectionLoader />}>
            <Routes>
              <Route
                path="/"
                element={
                  user.role === 'CA_ACCOUNTANT' || user.role === 'CA_TEAM' ? (
                    <AccountantDashboard />
                  ) : (
                    <Dashboard
                      entityId={currentEntity}
                      entityName={getEntityName(currentEntity)}
                      onQuickAction={handleQuickAction}
                      organisationBankAccounts={organisationBankAccounts}
                    />
                  )
                }
              />
              <Route
                path="/finance/*"
                element={
                  user.role === 'CLIENT_USER' || user.role === 'CLIENT_MASTER_ADMIN' ? (
                    <ClientFinance
                      entityName={getEntityName(currentEntity)}
                      organisationBankAccounts={organisationBankAccounts}
                      quickAction={null}
                      clearQuickAction={() => { }}
                      entityId={currentEntity}
                      organizationName={user?.organization_name}
                    />
                  ) : (
                    <FinancePage />
                  )
                }
              />
              <Route
                path="/documents"
                element={<Documents entityId={currentEntity} quickAction={null} clearQuickAction={() => { }} />}
              />
              <Route
                path="/beneficiaries"
                element={<Beneficiaries entityId={currentEntity} quickAction={null} clearQuickAction={() => { }} />}
              />
              <Route
                path="/organisation-bank"
                element={
                  <OrganisationBank
                    entityId={currentEntity}
                    entityName={getEntityName(currentEntity)}
                    quickAction={null}
                    clearQuickAction={() => { }}
                    organisationBankAccounts={organisationBankAccounts}
                  />
                }
              />
              <Route path="/profile" element={<Profile />} />
              <Route path="/clients" element={<Clients setActiveTab={() => { }} />} />
              <Route path="/tasks" element={<TaskManagementPage entityId={currentEntity} entityName={getEntityName(currentEntity)} />} />
              <Route path="/tasks/recurring" element={<RecurringTaskManagementPage />} />
              <Route path="/todos" element={<TodoPage />} />
              <Route path="/services" element={<Services />} />
              <Route path="/organisation" element={<Organisation />} />
              <Route path="/team-members" element={<TeamMembers />} />
              <Route path="/users" element={<ClientUsersPage entityId={currentEntity} />} />
              <Route path="/settings/*" element={<Settings />} />
              <Route path="/tasks/:taskId" element={<TaskDashboardPage />} />
              <Route path="/invoices/:invoiceId" element={<InvoiceDetailsPage />} />
              <Route path="/finance/vouchers/:voucherId" element={<VoucherDetailsPage />} />
              <Route path="/vouchers/ca/:voucherId" element={<VoucherDetailsCAPage />} />
              <Route path="/beneficiaries/:beneficiaryId" element={<BeneficiaryDetailsPage />} />
              <Route path="/coming-soon" element={<ComingSoon />} />
              <Route path="/upcoming/task" element={<UpcomingTask />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </main>
      <Suspense fallback={null}>
        <GlobalFAB />
      </Suspense>
    </div>
  );
};

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
  }

  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
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
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/verify-2fa" element={<TwoFactorVerify />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/verify" element={<VerifyToken />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </>
        )}
      </Routes>
    </Suspense>
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
                <meta
                  name="description"
                  content="Comprehensive financial management platform for documents, beneficiaries, transactions, and invoice management."
                />
                <meta property="og:title" content="Fynivo: Simplify Your Accounts" />
                <meta
                  property="og:description"
                  content="Comprehensive financial management platform for documents, beneficiaries, transactions, and invoice management."
                />
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
