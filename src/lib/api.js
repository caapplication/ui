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
import * as recurringTasks from './api/recurringTasks';

const API_BASE_URL = 'https://login-api.fynivo.in';
export const FINANCE_API_BASE_URL = 'https://finance-api.fynivo.in/';

export const { 
    refreshToken, 
    requestPasswordReset, 
    confirmPasswordReset, 
    getProfile, 
    updateName, 
    updatePassword, 
    toggle2FA, 
    verify2FA,
    uploadProfilePicture,
    deleteProfilePicture
} = auth;

export const {
    getEntities,
    getDashboardData,
    getBeneficiaries,
    getBeneficiariesForCA,
    addBeneficiary,
    deleteBeneficiary,
    getBeneficiary,
    updateBeneficiary,
    getBankAccountsForBeneficiary,
    getBankAccountsForBeneficiaryDropdown,
    addBankAccount,
    deactivateBankAccount,
    reactivateBankAccount,
    deleteBankAccount,
    getOrganisationBankAccounts,
    getOrganisationBankAccountsDropdown,
    getOrganisationBankAccountsForCA,
    addOrganisationBankAccount,
    updateOrganisationBankAccount,
    deleteOrganisationBankAccount,
    getInvoices,
    getInvoicesList,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    getInvoiceAttachment,
    getVouchers,
    getVouchersList,
    addVoucher,
    getVoucher,
    getVoucherQuick,
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
    listEntities,
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
    deleteClientPhoto,
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
    resendInvite,
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

export const {
    listRecurringTasks,
    getRecurringTask,
    createRecurringTask,
    updateRecurringTask,
    deleteRecurringTask,
    triggerRecurringTaskScheduler
} = recurringTasks;

// Idle timeout and token refresh logic
let lastApiCallTimestamp = Date.now();
let idleTimeout;
let refreshInterval;

function resetIdleTimeout() {
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
        console.log('Session idle for 30 minutes. Logging out...');
        // Perform logout logic here
    }, 30 * 60 * 1000); // 30 minutes
}

function startRefreshInterval() {
    clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
        if (Date.now() - lastApiCallTimestamp < 15 * 60 * 1000) { // 15 minutes
            console.log('Refreshing token...');
            refreshToken(); // Call the refreshToken function
        }
    }, 15 * 60 * 1000); // 15 minutes
}

// Wrap API calls to track activity
function trackApiCall(apiFunction) {
    return async function (...args) {
        lastApiCallTimestamp = Date.now();
        resetIdleTimeout();
        return apiFunction(...args);
    };
}

// Example: Wrapping an API call
export const trackedGetVouchers = trackApiCall(getVouchers);

// Initialize idle timeout and refresh interval
resetIdleTimeout();
startRefreshInterval();
