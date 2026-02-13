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
import * as recurringTasks from './recurringTasks';
import * as notices from './notices';

const API_BASE_URL = import.meta.env.VITE_LOGIN_API_URL || 'http://127.0.0.1:8001';
const FINANCE_API_BASE_URL = import.meta.env.VITE_FINANCE_API_URL || 'http://127.0.0.1:8003';

export const {
  refreshToken,
  requestPasswordReset,
  confirmPasswordReset,
  getProfile,
  updateName,
  updatePassword,
  toggle2FA,
  verify2FA,
  resend2FA
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
  getCATeamVouchersBulk,
  getCATeamInvoicesBulk,
  getCATeamInvoiceAttachment,
  exportVouchersToTallyXML,
  getActivityLog,
  getAccountantDashboardStats,
  createActivityLog,
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
  createPublicShareTokenDocument,
  createPublicShareTokenFolder,
  revokePublicShareTokenDocument,
  revokePublicShareTokenFolder,
  getPublicFolder,
  getPublicSubfolder,
  viewPublicDocument,
  shareFolder,
  createCAFolder,
  uploadCAFile
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
  listAssignedClientIdsForService
} = services;

export const {
  listOrganisations,
  createOrganisation,
  updateOrganisation,
  deleteOrganisation,
  listAllEntities,
  listEntities,
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
  listAllClientUsers
} = organisation;

export const {
  listClients,
  listClientsByOrganization,
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
  removeTeamMember
} = clients;

export {
  getClientBillingSetup,
  createOrUpdateClientBilling,
  updateClientBilling,
  bulkUpdateServiceBillings
} from './clientBilling';

export {
  getInvoicesWithPaymentStatus,
  getPaymentQRCode,
  uploadPaymentProof,
  getPaymentQRSettings,
  createPaymentQRSettings,
  updatePaymentQRSettings
} from './payments';

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
  getUnreadNoticeCount,
  markNoticeCommentAsRead,
  getNoticeCommentReadReceipts
} = notices;
