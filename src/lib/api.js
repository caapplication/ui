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
import * as notices from './api/notices';
import * as recurringTasks from './api/recurringTasks';
import * as folderTemplates from './api/folderTemplates';
import * as clientBilling from './api/clientBilling';
import * as payments from './api/payments';

const API_BASE_URL = import.meta.env.VITE_LOGIN_API_URL || 'http://127.0.0.1:8001';
export const FINANCE_API_BASE_URL = import.meta.env.VITE_FINANCE_API_URL || 'http://127.0.0.1:8003';

export const {
    refreshToken,
    requestPasswordReset,
    confirmPasswordReset,
    getProfile,
    updateName,
    updatePassword,
    toggle2FA,
    verify2FA,
    resend2FA,
    get2FAStatus,
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
    getCAVoucher,
    updateCAVoucher,
    deleteCAVoucher,
    getCATeamVouchers,
    getCATeamVouchersBulk,
    getCATeamInvoices,
    getCATeamInvoicesBulk,
    getCATeamInvoiceAttachment,
    exportVouchersToTallyXML,
    getActivityLog,
    getNoticeAttachment,
    getAccountantDashboardStats,
    getFinancePendingCaApprovalIndicator,
    getFinancePendingMasterAdminApprovalIndicator,
    getEntityIndicators,
    exportVouchers,
    exportInvoices,
    getInvoicePdf,
    getCACompanyProfile,
    createCACompanyProfile,
    updateCACompanyProfile,
    createActivityLog
} = finance;

export const {
    getDocuments,
    createFolder,
    uploadFile,
    deleteDocument,
    shareDocument,
    viewFile,
    getSharedDocuments,
    getSharedFolderContents,
    createCAFolder,
    uploadCAFile,
    shareFolder,
    renameFolder
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
    getClientCountForService,
    listAssignedClientIdsForService,
    getServiceDeletionStatus
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
    deleteOrgUser,
    inviteEntityUser,
    listEntityUsers,
    deleteEntityUser,
    deleteInvitedOrgUser,
    listAllEntityUsers,
    addEntityUsers,
    listAllClientUsers
} = organisation;

export const {
    listClients,
    getClientBillingInvoices,
    getInvoicePaymentDetails,
    uploadClientInvoicePaymentProof,
    getPaymentProofUrl,
    markInvoicePaid,
    updateClientBillingInvoiceStatus,
    getMyCompany,
    updateMyCompany,
    getInvoicePDFBlob,
    downloadInvoicePDF,
    updateClientBillingInvoice,
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
    getClientDashboard,
    getClientTeamMembers,
    getAllClientTeamMembers,
    assignTeamMembers,
    removeTeamMember,
    listClientsByOrganization
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
    listCATeamForClient,
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
    deleteTaskSubtask,
    listTaskStages,
    createTaskStage,
    updateTaskStage,
    deleteTaskStage,
    listTaskComments,
    createTaskComment,
    updateTaskComment,
    deleteTaskComment,
    addTaskCollaborator,
    removeTaskCollaborator,
    getTaskCollaborators,
    getCommentReadReceipts,
    requestTaskClosure,
    getClosureRequest,
    reviewClosureRequest,
    getUnreadNotificationCount
} = tasks;

export const {
    listRecurringTasks,
    getRecurringTask,
    createRecurringTask,
    updateRecurringTask,
    deleteRecurringTask,
    triggerRecurringTaskScheduler
} = recurringTasks;

export const {
    getNotices,
    getNotice,
    createNotice,
    uploadNotice,
    requestNoticeClosure,
    approveNoticeClosure,
    rejectNoticeClosure,
    getNoticeComments,
    addNoticeComment,
    addNoticeCollaborator,
    getUnreadNoticeCount
} = notices;

export const {
    listTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate
} = folderTemplates;

export const {
    getClientBillingSetup,
    createOrUpdateClientBilling,
    updateClientBilling,
    bulkUpdateServiceBillings,
    generateInvoicesNow
} = clientBilling;

export const {
    getInvoicesWithPaymentStatus,
    getPaymentQRCode,
    uploadPaymentProof,
    getPaymentQRSettings,
    createPaymentQRSettings,
    updatePaymentQRSettings
} = payments;

// Wrapped API call functionality can be kept if needed for other purposes, 
// but the global idle timeout logic should be removed as it's now managed in useAuth.jsx.
``