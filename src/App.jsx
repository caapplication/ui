
import React, { useState, useEffect, useCallback } from 'react';
    import { Helmet } from 'react-helmet';
    import { Routes, Route, Navigate, useSearchParams, BrowserRouter } from 'react-router-dom';
    import { AuthProvider, useAuth } from '@/hooks/useAuth.jsx';
    import { Toaster } from '@/components/ui/toaster';
    import LoginForm from '@/components/auth/LoginForm';
    import ForgotPassword from '@/components/auth/ForgotPassword';
    import ResetPassword from '@/components/auth/ResetPassword';
    import Sidebar from '@/components/layout/Sidebar';
    import EntitySidebar from '@/components/layout/EntitySidebar';
    import Dashboard from '@/components/dashboard/Dashboard';
    import Documents from '@/components/documents/Documents';
    import Finance from '@/components/finance/Finance';
    import Beneficiaries from '@/components/beneficiaries/Beneficiaries';
    import OrganisationBank from '@/components/organisation/OrganisationBank.jsx';
    import Profile from '@/components/profile/Profile.jsx';
    import { getOrganisationBankAccounts } from '@/lib/api';
    import AccountantDashboard from '@/components/accountant/AccountantDashboard.jsx';
    import AccountantSidebar from '@/components/layout/AccountantSidebar.jsx';
    import Services from '@/components/accountant/services/Services.jsx';
    import Clients from '@/components/accountant/clients/Clients.jsx';
    import AccountantFinance from '@/components/accountant/finance/Finance.jsx';
    import Organisation from '@/components/accountant/organisation/Organisation.jsx';
    import TeamMembers from '@/components/accountant/team/TeamMembers.jsx';
    import Settings from '@/components/accountant/settings/Settings.jsx';
    import TaskManagementPage from '@/components/accountant/tasks/TaskManagementPage.jsx';
    import TodoPage from '@/components/accountant/tasks/TodoPage.jsx';
    import { Menu } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { useMediaQuery } from '@/hooks/useMediaQuery.jsx';
    import ClientUserDashboard from '@/components/dashboard/ClientUserDashboard.jsx';
    import TaskDashboardPage from '@/pages/TaskDashboardPage.jsx';
import InvoiceDetailsPage from '@/pages/InvoiceDetailsPage.jsx';
import VoucherDetailsPage from '@/pages/VoucherDetailsPage.jsx';
import BeneficiaryDetailsPage from '@/pages/BeneficiaryDetailsPage.jsx';

    const ProtectedContent = () => {
      const { user } = useAuth();
      const [searchParams] = useSearchParams();
      const isDesktop = useMediaQuery("(min-width: 1024px)");

      const [currentEntity, setCurrentEntity] = useState(null);
      const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
      const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
      const [organisationBankAccounts, setOrganisationBankAccounts] = useState([]);
      
      const fetchOrganisationBankAccounts = useCallback(async () => {
        if (currentEntity && user?.access_token && (user?.role === 'CLIENT_USER' || user?.role === 'ENTITY_USER')) {
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
            } else if (user.organization_id) {
              setCurrentEntity(user.organization_id);
            }
          } else if (user.role !== 'CA_ACCOUNTANT') {
            setCurrentEntity(user.organization_id || user.id);
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

      const renderClientContent = () => {
        if (user.role === 'CLIENT_USER' && activeTab === 'dashboard') {
            return <ClientUserDashboard 
              entityId={currentEntity} 
              entityName={getEntityName(currentEntity)} 
              onQuickAction={handleQuickAction}
              organisationBankAccounts={organisationBankAccounts}
            />;
        }

        switch (activeTab) {
          case 'dashboard':
            return <Dashboard 
                      entityId={currentEntity} 
                      entityName={getEntityName(currentEntity)} 
                      onQuickAction={handleQuickAction}
                      organisationBankAccounts={organisationBankAccounts}
                    />;
          case 'finance':
            return <Finance 
                      entityName={getEntityName(currentEntity)}
                      organisationBankAccounts={organisationBankAccounts}
                      quickAction={quickAction}
                      clearQuickAction={clearQuickAction}
                      entityId={currentEntity}
                      organizationName={user?.organization_name}
                    />;
          case 'documents':
            return <Documents 
                      entityId={currentEntity}
                      quickAction={quickAction}
                      clearQuickAction={clearQuickAction}
                    />;
          case 'beneficiaries':
            return <Beneficiaries 
                      quickAction={quickAction}
                      clearQuickAction={clearQuickAction}
                    />;
          case 'organisation-bank':
            return <OrganisationBank
                      entityId={currentEntity}
                      entityName={getEntityName(currentEntity)}
                      quickAction={quickAction}
                      clearQuickAction={clearQuickAction}
                    />;
          case 'profile':
            return <Profile />;
          default:
            return <Dashboard 
                      entityId={currentEntity} 
                      entityName={getEntityName(currentEntity)} 
                      onQuickAction={handleQuickAction}
                      organisationBankAccounts={organisationBankAccounts}
                    />;
        }
      };

      const renderEntityContent = () => {
        switch (activeTab) {
          case 'dashboard':
            return <Dashboard 
                      entityId={currentEntity} 
                      entityName={getEntityName(currentEntity)} 
                      onQuickAction={handleQuickAction}
                      organisationBankAccounts={organisationBankAccounts}
                    />;
          case 'finance':
            return <Finance 
                      entityName={getEntityName(currentEntity)}
                      organisationBankAccounts={organisationBankAccounts}
                      quickAction={quickAction}
                      clearQuickAction={clearQuickAction}
                      entityId={currentEntity}
                      organizationName={user?.name}
                    />;
          case 'documents':
            return <Documents 
                      entityId={currentEntity}
                    />;
          case 'profile':
            return <Profile />;
          default:
            return <Dashboard 
                      entityId={currentEntity} 
                      entityName={getEntityName(currentEntity)} 
                      onQuickAction={handleQuickAction}
                      organisationBankAccounts={organisationBankAccounts}
                    />;
        }
      };

      const renderAccountantContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <AccountantDashboard />;
            case 'clients':
                return <Clients setActiveTab={handleTabChange} />;
            case 'tasks':
                return <TaskManagementPage />;
            case 'todos':
                return <TodoPage />;
            case 'services':
                return <Services />;
            case 'finance':
                return <AccountantFinance />;
            case 'organisation':
                return <Organisation />;
            case 'team-members':
                return <TeamMembers />;
            case 'settings':
                return <Settings />;
            case 'profile':
                return <Profile />;
            case 'documents':
                return <Documents />;
            default:
                return <AccountantDashboard />;
        }
      };

      let SidebarComponent;
      if (user.role === 'CA_ACCOUNTANT') {
        SidebarComponent = AccountantSidebar;
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
              <header className="p-4 flex items-center justify-between lg:hidden sticky top-0 z-10 bg-black/10 backdrop-blur-sm">
                 <Button variant="ghost" size="icon" onClick={() => setIsMobileSidebarOpen(true)}>
                  <Menu className="h-6 w-6 text-white" />
                </Button>
                <div className="text-white font-bold text-lg">{user?.name || user?.agency_name}</div>
                <div className="w-10"></div>
              </header>
            )}
            <div className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Dashboard entityId={currentEntity} entityName={getEntityName(currentEntity)} onQuickAction={() => {}} organisationBankAccounts={organisationBankAccounts} />} />
                <Route path="/finance/*" element={<Finance entityName={getEntityName(currentEntity)} organisationBankAccounts={organisationBankAccounts} quickAction={null} clearQuickAction={() => {}} entityId={currentEntity} organizationName={user?.organization_name} />} />
                <Route path="/documents" element={<Documents entityId={currentEntity} quickAction={null} clearQuickAction={() => {}} />} />
                <Route path="/beneficiaries" element={<Beneficiaries quickAction={null} clearQuickAction={() => {}} />} />
                <Route path="/organisation-bank" element={<OrganisationBank entityId={currentEntity} entityName={getEntityName(currentEntity)} quickAction={null} clearQuickAction={() => {}} />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/clients" element={<Clients setActiveTab={() => {}} />} />
                <Route path="/tasks" element={<TaskManagementPage />} />
                <Route path="/todos" element={<TodoPage />} />
                <Route path="/services" element={<Services />} />
                <Route path="/team-members" element={<TeamMembers />} />
                <Route path="/settings" element={<Settings />} />
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
                {user ? (
                    <>
                        <Route path="/*" element={<ProtectedContent />} />
                        <Route path="/tasks/:taskId" element={<TaskDashboardPage />} />
                        <Route path="/invoices/:invoiceId" element={<InvoiceDetailsPage />} />
                        <Route path="/vouchers/:voucherId" element={<VoucherDetailsPage />} />
                        <Route path="/beneficiaries/:beneficiaryId" element={<BeneficiaryDetailsPage />} />
                    </>
                ) : (
                    <>
                        <Route path="/login" element={<LoginForm />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="*" element={<Navigate to="/login" />} />
                    </>
                )}
            </Routes>
        );
    };

    function App() {
      return (
        <BrowserRouter>
          <AuthProvider>
            <Helmet>
              <title>Financial Publication Platform - Manage Your Finances</title>
              <meta name="description" content="Comprehensive financial management platform for documents, beneficiaries, transactions, and invoice management." />
              <meta property="og:title" content="Financial Publication Platform - Manage Your Finances" />
              <meta property="og:description" content="Comprehensive financial management platform for documents, beneficiaries, transactions, and invoice management." />
            </Helmet>
            <div className="animated-bg"></div>
            <AppContent />
            <Toaster />
          </AuthProvider>
        </BrowserRouter>
      );
    }

    export default App;
