import { handleResponse, getAuthHeaders } from './utils';
    import * as auth from './auth';
    import * as finance from './finance';
    import * as documents from './documents';
    import * as services from './services';
    import * as organisation from './organisation';
    import * as clients from './clients';
    import * as settings from './settings';
    import * as team from './team';
    import * as tasks from './tasks';

    const API_BASE_URL = 'https://login-api.fynivo.in';
    const FINANCE_API_BASE_URL = 'http://localhost:8004';

    export const {
      refreshToken,
      requestPasswordReset,
      confirmPasswordReset,
      getProfile,
      updateName,
      updatePassword,
      toggle2FA,
      verify2FA
    } = auth;

    export const {
      getEntities,
      getDashboardData,
      getBeneficiaries,
      getBeneficiariesForCA,
      addBeneficiary,
      deleteBeneficiary,
      getBankAccountsForBeneficiary,
      addBankAccount,
      deleteBankAccount,
      getOrganisationBankAccounts,
      getOrganisationBankAccountsForCA,
      addOrganisationBankAccount,
      deleteOrganisationBankAccount,
      getInvoices,
      addInvoice,
      updateInvoice,
      deleteInvoice,
      getInvoiceAttachment,
      getVouchers,
      addVoucher,
      updateVoucher,
      deleteVoucher,
      getCATeamVouchers,
      getCATeamInvoices,
      getCATeamInvoiceAttachment,
      exportVouchersToTallyXML,
      getActivityLog,
      getAccountantDashboardStats,
    } = finance;

    export const {
      getDocuments,
      createFolder,
      uploadFile,
      deleteDocument,
      shareDocument,
      viewFile,
      getSharedDocuments
    } = documents;

    export const {
      createService,
      listServices,
      getServiceDetails,
      deleteService,
      updateServiceSettings,
      getChecklists,
      addChecklistItem,
      deleteChecklistItem,
      getSubtasks,
      addSubtask,
      deleteSubtask,
      getSupportingFiles,
      addSupportingFile,
      deleteSupportingFile,
      getClientCountForService
    } = services;

    export const {
      listOrganisations,
      createOrganisation,
      updateOrganisation,
      deleteOrganisation,
      listAllEntities,
      createEntity,
      updateEntity,
      deleteEntity,
      listOrgUsers,
      resendToken,
      inviteOrganizationUser,
      deleteOrgUser
    } = organisation;

    export const {
      listClients,
      createClient,
      updateClient,
      uploadClientPhoto,
      deleteClient,
      listClientPortals,
      createClientPortal,
      updateClientPortal,
      revealClientPortalSecret,
      deleteClientPortal,
      listClientServices,
      addServicesToClient,
      removeServicesFromClient,
      getClientDashboard
    } = clients;

    export const {
      getGeneralSettings,
      updateGeneralSettings,
      getTags,
      createTag,
      updateTag,
      deleteTag,
      getPortals,
      createPortal,
      deletePortal,
      getBusinessTypes,
      createBusinessType,
      updateBusinessType,
      deleteBusinessType
    } = settings;

    export const {
      inviteTeamMember,
      listTeamMembers,
      updateTeamMember,
      deleteTeamMember,
      listDepartments
    } = team;

    export const {
      listTasks,
      createTask,
      getTaskDetails,
      getTaskHistory,
      updateTask,
      deleteTask,
      startTaskTimer,
      stopTaskTimer,
      addManuallyLoggedTime,
      listTodos,
      createTodo,
      updateTodo,
      deleteTodo,
      addTaskSubtask,
      updateTaskSubtask,
      deleteTaskSubtask
    } = tasks;
