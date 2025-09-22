
import { handleResponse, getAuthHeaders } from './api/utils';
    import * as auth from './api/auth';
    import * as finance from './api/finance';
    import * as documents from './api/documents';
    import * as services from './api/services';
    import * as organisation from './api/organisation';
    import * as clients from './api/clients';
    import * as settings from './api/settings';
    import * as team from './api/team';
    import * as tasks from './api/tasks';
    
    const API_BASE_URL = 'https://login-api.snolep.com';
    export const FINANCE_API_BASE_URL = 'https://Finance-api.snolep.com';
    
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
        addBeneficiary,
        deleteBeneficiary,
        getBeneficiary,
        updateBeneficiary,
        getBankAccountsForBeneficiary,
        addBankAccount,
        deleteBankAccount,
        getOrganisationBankAccounts,
        addOrganisationBankAccount,
        updateOrganisationBankAccount,
        deleteOrganisationBankAccount,
        getInvoices,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        getInvoiceAttachment,
        getVouchers,
        addVoucher,
        getVoucher,
        updateVoucher,
        deleteVoucher,
        getVoucherAttachment,
        getCATeamVouchers,
        getCATeamInvoices,
        getCATeamInvoiceAttachment,
        exportVouchersToTallyXML,
        getActivityLog
    } = finance;
    
    export const {
        getDocuments,
        createFolder,
        uploadFile,
        deleteDocument,
        shareDocument,
        viewFile,
    getSharedDocuments,
    createCAFolder,
    uploadCAFile,
    shareFolder
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
        deleteBusinessType,
        getFinanceHeaders,
        createFinanceHeader,
        updateFinanceHeader,
        deleteFinanceHeader
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
