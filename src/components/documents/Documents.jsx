import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Combobox } from '@/components/ui/combobox';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Folder, FileText, Download, Trash2, Plus, ArrowLeft, Search,
  MoreVertical, Share2, FolderPlus, Upload, ChevronRight, Home,
  UserPlus, X, User, Link2, Copy, Grid, Calendar as CalendarIcon,
  Check, ChevronsUpDown, Inbox, History, FolderOpen, LayoutTemplate,
  Loader2, Users, RefreshCw, Phone, Edit, MessageCircle, Facebook,
  Twitter, Linkedin, Mail, Info, Pencil, Eye, UserCheck, CircleDot, FileIcon, Clock, CalendarDays
} from 'lucide-react';

// Helper function to check if folder has expired documents (recursively checks subfolders)
const hasExpiredDocuments = (folder) => {
  if (!folder) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check documents in this folder
  if (folder.documents && folder.documents.length > 0) {
    const hasExpired = folder.documents.some(doc => {
      if (!doc.expiry_date) return false;
      const expiryDate = new Date(doc.expiry_date);
      expiryDate.setHours(0, 0, 0, 0);
      return expiryDate <= today;
    });
    if (hasExpired) return true;
  }

  // Check children (subfolders) recursively
  if (folder.children && folder.children.length > 0) {
    return folder.children.some(child => {
      if (child.is_folder) {
        return hasExpiredDocuments(child);
      } else if (child.expiry_date) {
        const expiryDate = new Date(child.expiry_date);
        expiryDate.setHours(0, 0, 0, 0);
        return expiryDate <= today;
      }
      return false;
    });
  }

  return false;
};

// Custom Folder Icon Component - File Explorer Style
const FolderIcon = ({ className = "w-20 h-20", hasExpired = false }) => {
  const folderColor = hasExpired ? "#DC2626" : "#4A90E2"; // Red if expired, blue otherwise
  const folderTabColor = hasExpired ? "#EF4444" : "#5BA3F5";
  const folderHighlight = hasExpired ? "#F87171" : "#6BB6FF";
  const folderStroke = hasExpired ? "#B91C1C" : "#3A7BC8";

  return (
    <div className={className} style={{ position: 'relative' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        {/* Folder body */}
        <path
          d="M 8 22 L 8 52 L 56 52 L 56 22 L 32 22 L 28 18 L 8 18 Z"
          fill={folderColor}
          stroke={folderStroke}
          strokeWidth="0.5"
        />

        {/* Folder tab */}
        <path
          d="M 8 18 L 28 18 L 32 22 L 8 22 Z"
          fill={folderTabColor}
          stroke={folderColor}
          strokeWidth="0.5"
        />

        {/* Folder highlight on tab */}
        <path
          d="M 8 18 L 18 18 L 18 20 L 8 20 Z"
          fill={folderHighlight}
          opacity="0.6"
        />

        {/* Folder highlight on body */}
        <path
          d="M 8 22 L 8 30 L 56 30 L 56 22 L 32 22 L 28 18 L 8 18 Z"
          fill={folderHighlight}
          opacity="0.2"
        />

        {/* Folder crease line */}
        <line
          x1="8"
          y1="22"
          x2="56"
          y2="22"
          stroke={folderStroke}
          strokeWidth="0.5"
          opacity="0.3"
        />
      </svg>
    </div>
  );
};
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth.jsx';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import {
  getDocuments, createFolder, uploadFile, deleteDocument, shareDocument, viewFile, getSharedDocuments, getSharedFolderContents, listClients, createCAFolder, uploadCAFile, shareFolder, listAllClientUsers,
  listTemplates, createTemplate, deleteTemplate, applyTemplate, updateTemplate, renameFolder,
  listTeamMembers, listOrgUsers, listCATeamForClient
} from '../../lib/api';
import { createPublicShareTokenDocument, createPublicShareTokenFolder, listExpiringDocuments } from '@/lib/api/documents';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';

import { format } from 'date-fns';
import ActivityLog from '@/components/finance/ActivityLog';

const buildFileTree = (folders, documents) => {
  const root = { id: 'root', name: 'Home', is_folder: true, children: [] };
  const allItems = {};

  // Ensure folders and documents are arrays
  const foldersArray = Array.isArray(folders) ? folders : [];
  const documentsArray = Array.isArray(documents) ? documents : [];

  foldersArray.forEach(folder => {
    if (folder && folder.id) {
      allItems[folder.id] = { ...folder, is_folder: true, children: [] };
    }
  });

  documentsArray.forEach(doc => {
    if (doc && doc.id) {
      allItems[doc.id] = { ...doc, is_folder: false };
    }
  });

  foldersArray.forEach(folder => {
    if (!folder || !folder.id) return;

    if (folder.parent_id && allItems[folder.parent_id] && Array.isArray(allItems[folder.parent_id].children)) {
      allItems[folder.parent_id].children.push(allItems[folder.id]);
    } else {
      if (Array.isArray(root.children)) {
        root.children.push(allItems[folder.id]);
      }
    }
    if (folder.documents && Array.isArray(folder.documents)) {
      if (!allItems[folder.id].children) {
        allItems[folder.id].children = [];
      }
      folder.documents.forEach(doc => {
        if (doc && doc.id) {
          allItems[folder.id].children.push({ ...doc, is_folder: false });
        }
      });
    }
  });

  // Add documents to their respective folders
  documentsArray.forEach(doc => {
    if (doc.id) {
      const folderId = doc.folder_id || 'root';
      const nodeToAdd = { ...doc, is_folder: false };

      if (folderId === 'root') {
        // Only if not already present (prevent duplicates if API returns mixed structure)
        if (!root.children.some(child => child.id === doc.id)) {
          //   root.children.push(nodeToAdd); // Commented out based on original logic: "Don't add documents to root folder"
        }
      } else if (allItems[folderId]) {
        if (!allItems[folderId].children) {
          allItems[folderId].children = [];
        }
        // Prevent duplicates
        if (!allItems[folderId].children.some(child => child.id === doc.id)) {
          allItems[folderId].children.push(nodeToAdd);
        }
      } else {
        // Fallback: If folder ID exists but folder is not in the list (e.g. parent folder missing from API)
        // We create a virtual folder to hold these files so they are not lost.
        // Check if we already created a virtual folder for this ID
        if (!allItems[folderId]) {
          const virtualFolder = {
            id: folderId,
            name: `Folder ${folderId}`, // Placeholder name as we don't have the real name
            is_folder: true,
            children: [nodeToAdd]
          };
          allItems[folderId] = virtualFolder;
          // Add to root for visibility (or could try to resolve parent if known)
          if (Array.isArray(root.children)) {
            root.children.push(virtualFolder);
          }
        } else {
          // Virtual folder already created by previous sibling document
          if (!allItems[folderId].children.some(child => child.id === doc.id)) {
            allItems[folderId].children.push(nodeToAdd);
          }
        }
      }
    }
  });

  return root;
};


const findPath = (root, id) => {
  const path = [];
  function search(node) {
    if (String(node.id) === String(id)) {
      path.push(node);
      return true;
    }
    if (node.is_folder) {
      path.push(node);
      for (const child of node.children) {
        if (search(child)) {
          return true;
        }
      }
      path.pop();
    }
    return false;
  }
  search(root);
  return path;
};

// Helper function to find a folder by ID in the tree
const findFolder = (root, id) => {
  if (String(root.id) === String(id)) {
    return root;
  }
  if (root.is_folder && root.children) {
    for (const child of root.children) {
      const found = findFolder(child, id);
      if (found) return found;
    }
  }
  return null;
};

// Helper function to check if a folder is empty (has no children)
const isFolderEmpty = (folder) => {
  if (!folder || !folder.is_folder) return false;
  return !folder.children || folder.children.length === 0;
};

// Helper function to recursively check if a folder or its subfolders contain documents
const folderHasDocumentsRecursive = (folder) => {
  if (!folder || !folder.is_folder) return false;
  if (!folder.children || folder.children.length === 0) return false;

  for (const child of folder.children) {
    if (!child.is_folder) return true; // Found a document
    if (child.is_folder && folderHasDocumentsRecursive(child)) return true;
  }
  return false;
};

const Documents = ({ entityId, quickAction, clearQuickAction }) => {
  const { user } = useAuth();

  const getInitialEntityId = () => {
    if (user?.role === 'CA_ACCOUNTANT') return 'all';
    return entityId;
  };

  const { entities } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Helper functions for parameter obfuscation
  const encodeParam = (value) => {
    if (!value) return null;
    try {
      return btoa(String(value));
    } catch (e) {
      console.error('Encoding error:', e);
      return value;
    }
  };

  const decodeParam = (value) => {
    if (!value) return null;
    try {
      return atob(value);
    } catch (e) {
      // If decoding fails, it might be an already plain value (though unlikely if we consistently encode)
      // or invalid garbage. Return null or logical default implies failure.
      console.warn('Decoding error/Invalid param:', e);
      return null;
    }
  };

  // Initialize state directly from URL to prevent "flash" and race conditions
  const [realSelectedClientId, setRealSelectedClientId] = useState(() => {
    const param = searchParams.get('clientId');
    const decoded = decodeParam(param);
    return (decoded && decoded !== 'null' && decoded !== '') ? decoded : null;
  });

  const [currentFolderId, setCurrentFolderId] = useState(() => {
    const param = searchParams.get('folderId');
    const decoded = decodeParam(param);
    return (decoded && decoded !== 'null') ? decoded : 'root';
  });

  const [documentsState, setDocumentsState] = useState({ id: 'root', name: 'Home', is_folder: true, children: [] });
  const [sharedDocuments, setSharedDocuments] = useState([]);
  const [renewalDocuments, setRenewalDocuments] = useState([]);
  // const [currentFolderId, setCurrentFolderId] = useState('root'); // Removed: Initialized above
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showRenameFolder, setShowRenameFolder] = useState(false);
  const [folderToRename, setFolderToRename] = useState(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareDoc, setShareDoc] = useState(null);
  const [shareEmails, setShareEmails] = useState('');
  const [shareExpiryDate, setShareExpiryDate] = useState(null);
  const [withoutExpiryDate, setWithoutExpiryDate] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [collaborateDialogOpen, setCollaborateDialogOpen] = useState(false);
  const [collaborateDoc, setCollaborateDoc] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('myFiles'); // 'myFiles', 'sharedWithMe', 'renewals', or 'activityLog'
  const [sharedByFilter, setSharedByFilter] = useState(null);
  // Shared tab folder navigation state
  const [sharedCurrentFolder, setSharedCurrentFolder] = useState(null); // null = root (list of shared items)
  const [sharedFolderPath, setSharedFolderPath] = useState([]); // breadcrumb: [{id, name}, ...]
  const [sharedFolderContents, setSharedFolderContents] = useState({ folders: [], documents: [] });
  const [isLoadingSharedFolder, setIsLoadingSharedFolder] = useState(false);
  const [clientsForFilter, setClientsForFilter] = useState([]);
  const [isClientsLoading, setIsClientsLoading] = useState(false);
  // const [realSelectedClientId, setRealSelectedClientId] = useState(null); // Removed: Initialized above
  const [openClientCombobox, setOpenClientCombobox] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);
  // Determine the correct organization ID using our hook
  const currentOrganizationId = useCurrentOrganization(entityId);
  const [collabSelectedClientId, setCollabSelectedClientId] = useState(null); // 'my-team' or client ID
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeTemplateTab, setActiveTemplateTab] = useState('manage');
  const [templates, setTemplates] = useState([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateFolders, setNewTemplateFolders] = useState([{ name: '', subfolders: [] }]); // Nested: [{name, subfolders: []}]
  const [editingTemplate, setEditingTemplate] = useState(null); // { id, name, folders }
  const [selectedTemplateForApply, setSelectedTemplateForApply] = useState(null);
  const [selectedClientsForTemplate, setSelectedClientsForTemplate] = useState([]);
  const [templateClientSearch, setTemplateClientSearch] = useState('');

  // Initialize collabSelectedClientId when user changes
  useEffect(() => {
    if (user?.role === 'CA_ACCOUNTANT' && realSelectedClientId) {
      setCollabSelectedClientId(realSelectedClientId);
    } else if (user?.role === 'CA_ACCOUNTANT' || user?.role === 'AGENCY_ADMIN' || user?.role === 'CA_TEAM') {
      setCollabSelectedClientId('my-team');
    } else {
      // For Client Users/Admins, we can use the entity ID they are viewing if available, 
      // OR fallback to their organization ID derived from the hook.
      // Since listOrgUsers expects an OrgID/EntityID context:
      if (entityId) {
        setCollabSelectedClientId(entityId);
      } else if (currentOrganizationId) {
        setCollabSelectedClientId(currentOrganizationId);
      }
    }
  }, [user, realSelectedClientId, entityId, currentOrganizationId]);


  useEffect(() => {
    if (quickAction === 'upload-document') {
      setShowUpload(true);
      clearQuickAction();
    }
  }, [quickAction, clearQuickAction]);

  useEffect(() => {
    const fetchClients = async () => {
      if (user?.role === 'CA_ACCOUNTANT' && user?.access_token) {
        try {
          // Logic to derive agencyId matching TaskManagementPage for consistency
          let agencyId = user?.agency_id || null;
          if (!agencyId && user?.entities && user.entities.length > 0) {
            agencyId = user.entities[0].agency_id;
          }
          if (!agencyId) {
            const storedAgencyId = localStorage.getItem('agency_id');
            if (storedAgencyId) agencyId = storedAgencyId;
          }

          setIsClientsLoading(true);
          const clients = await listClients(agencyId, user.access_token);
          setClientsForFilter(clients || []);
        } catch (error) {
          console.error('Error fetching clients:', error);
          toast({
            title: 'Error fetching clients',
            description: error.message,
            variant: 'destructive',
          });
          setClientsForFilter([]);
        } finally {
          setIsClientsLoading(false);
        }
      }
    };

    if (user?.role === 'CA_ACCOUNTANT') {
      fetchClients();
    }
  }, [user, toast]);

  // Fetch Templates
  const fetchTemplates = useCallback(async () => {
    if (user?.role !== 'CA_ACCOUNTANT' || !user?.access_token) return;
    setIsLoadingTemplates(true);
    try {
      const data = await listTemplates(user.access_token);
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({ title: 'Error', description: 'Failed to load templates.', variant: 'destructive' });
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (showTemplates) {
      fetchTemplates();
    }
  }, [showTemplates, fetchTemplates]);

  const handleCreateTemplate = async () => {
    // Flatten nested structure to "Parent / Child" format
    const flattenFolders = () => {
      const result = [];
      newTemplateFolders.forEach(parent => {
        if (parent.name.trim()) {
          result.push(parent.name.trim()); // Add parent
          parent.subfolders.forEach(sub => {
            if (sub.trim()) {
              result.push(`${parent.name.trim()} / ${sub.trim()}`); // Add "Parent / Child"
            }
          });
        }
      });
      return result;
    };

    const validFolders = flattenFolders();
    if (!newTemplateName.trim() || validFolders.length === 0) return;

    setIsLoadingTemplates(true);
    try {
      await createTemplate({ name: newTemplateName, folders: validFolders }, user.access_token);
      toast({ title: "Template Created", description: "New folder template added successfully." });
      setNewTemplateName('');
      setNewTemplateFolders([{ name: '', subfolders: [] }]);
      fetchTemplates(); // Refresh list
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleUpdateTemplate = async () => {
    // Flatten nested structure to "Parent / Child" format
    const flattenFolders = () => {
      const result = [];
      newTemplateFolders.forEach(parent => {
        if (parent.name.trim()) {
          result.push(parent.name.trim()); // Add parent
          parent.subfolders.forEach(sub => {
            if (sub.trim()) {
              result.push(`${parent.name.trim()} / ${sub.trim()}`); // Add "Parent / Child"
            }
          });
        }
      });
      return result;
    };

    const validFolders = flattenFolders();
    if (!editingTemplate || !newTemplateName.trim() || validFolders.length === 0) return;

    setIsLoadingTemplates(true);
    try {
      await updateTemplate(editingTemplate.id, { name: newTemplateName, folders: validFolders }, user.access_token);
      toast({ title: "Template Updated", description: "Template updated successfully." });
      setEditingTemplate(null);
      setNewTemplateName('');
      setNewTemplateFolders([{ name: '', subfolders: [] }]);
      fetchTemplates(); // Refresh template list
      // Refresh the documents/folders tree so renamed template folders reflect immediately
      fetchDocuments(true).catch(err => console.error('Background refresh after template update failed:', err));
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    setIsLoadingTemplates(true);
    try {
      await deleteTemplate(id, user.access_token);
      toast({ title: "Template Deleted", description: "Template removed successfully." });
      fetchTemplates();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplateForApply || selectedClientsForTemplate.length === 0) return;
    setIsLoadingTemplates(true);
    try {
      const result = await applyTemplate(selectedTemplateForApply, selectedClientsForTemplate, user.access_token);
      const successCount = result.success ? result.success.length : 0;
      const errorCount = result.errors ? result.errors.length : 0;

      if (errorCount > 0) {
        toast({
          title: "Applied with some errors",
          description: `Applied to ${successCount} clients. Failed for ${errorCount} clients. Check console for details.`,
          variant: "warning"
        });
        console.error("Template application errors:", result.errors);
      } else {
        toast({
          title: "Templates Applied",
          description: `Successfully started creating folders for ${successCount} clients.`,
        });
      }

      setShowTemplates(false);
      setSelectedClientsForTemplate([]);
      setSelectedTemplateForApply(null);
      // Refresh documents if current view is affected (e.g. one of the selected clients is currently open)
      if (selectedClientsForTemplate.includes(realSelectedClientId)) {
        fetchDocuments(true);
      }
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const fetchDocuments = useCallback(async (isRefresh = false) => {
    console.log('fetchDocuments called', { isRefresh, realSelectedClientId, entityId: user?.role === 'CA_ACCOUNTANT' ? realSelectedClientId : entityId });
    if (!user?.access_token) {
      setIsLoading(false);
      return;
    }

    let entityToFetch = null;
    if (user?.role === 'CA_ACCOUNTANT') {
      entityToFetch = realSelectedClientId || null; // If null, fetches personal docs
    } else {
      // For non-CA accountants, entityId is required
      if (!entityId) {
        // Don't fetch if entityId is not available yet
        setDocumentsState({ id: 'root', name: 'Root', is_folder: true, children: [] });
        setIsLoading(false);
        return;
      }
      entityToFetch = entityId;
    }

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      console.log('Fetching from API for entity:', entityToFetch);
      const data = await getDocuments(entityToFetch, user.access_token);
      console.log('API Response:', data);
      // Ensure data has folders and documents arrays
      const folders = Array.isArray(data?.folders) ? data.folders : [];
      const documents = Array.isArray(data?.documents) ? data.documents : [];
      console.log('Building file tree with:', { foldersCount: folders.length, documentsCount: documents.length });
      console.log('Folder IDs:', folders.map(f => f.id).join(', '));
      const fileTree = buildFileTree(folders, documents);
      console.log('Built File Tree:', fileTree);
      setDocumentsState(fileTree);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error',
        description: `Failed to fetch documents: ${error.message}`,
        variant: 'destructive',
      });
      setDocumentsState({ id: 'root', name: 'Root', is_folder: true, children: [] });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [realSelectedClientId, user, entityId, toast]);

  /* Removed recursive function for tree building, now imported from utils */
  // Use buildFileTree from utils

  const fetchSharedDocuments = useCallback(async (isRefresh = false) => {
    console.log('fetchSharedDocuments called', { isRefresh, role: user?.role, entityId: realSelectedClientId || entityId });
    if (!user?.access_token) return;
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      // Determine what entity ID to pass.
      // If CA Accountant, use realSelectedClientId.
      // If Client User, use the entityId from props/auth context.
      const targetEntityId = user?.role === 'CA_ACCOUNTANT' ? realSelectedClientId : entityId;
      console.log('Fetching shared docs with targetEntityId:', targetEntityId);

      const data = await getSharedDocuments(user.access_token, user.role, targetEntityId);
      console.log('Shared Documents API Response:', data);

      const combinedShared = [
        ...(data.documents || []).map(d => ({ ...d, is_folder: false })),
        ...(data.folders || []).map(f => ({ ...f, is_folder: true }))
      ];
      setSharedDocuments(combinedShared);
    } catch (error) {
      console.error('Error fetching shared documents:', error);
      toast({
        title: 'Error fetching shared documents',
        description: error.message,
        variant: 'destructive',
      });
      setSharedDocuments([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.access_token, user?.role, realSelectedClientId, entityId, toast]);

  const fetchRenewalDocuments = useCallback(async () => {
    if (!user?.access_token) return;
    try {
      const targetEntityId = user?.role === 'CA_ACCOUNTANT' ? realSelectedClientId : entityId;
      const docs = await listExpiringDocuments(user.access_token, targetEntityId);
      setRenewalDocuments(Array.isArray(docs) ? docs : []);
    } catch (error) {
      console.error('Error fetching renewal documents:', error);
      setRenewalDocuments([]);
    }
  }, [user?.access_token, user?.role, realSelectedClientId, entityId]);

  // REMOVED: Conflicting useEffect that was resetting folder to root
  // The state is now single-source-of-truth initialized from URL, and updates push to URL.
  // No need to "sync back" URL -> State unless user hits Back button (handled by router re-mount or popstate if we used a listener,
  // but react-router's useSearchParams + initial state keying usually suffices for soft navs).
  // Actually, for Back button support without full reload, we might need a simple effect:
  useEffect(() => {
    // Listen for URL changes via popstate (Back/Forward buttons)
    // BUT, we must NOT reset if the change came from our own `handleFolderNavigation`.
    // Simplest way: just respect URL if it differs from state?
    // For now, let's rely on the router. If back button triggers re-render, initial state logic runs? No, only on mount.
    // So we DO need to listen to searchParams changes, BUT carefully.
    const urlFolderIdParam = searchParams.get('folderId');
    const urlClientIdParam = searchParams.get('clientId');

    const urlFolderId = decodeParam(urlFolderIdParam) || 'root';
    const urlClientIdRaw = decodeParam(urlClientIdParam);
    const normalizedUrlClientId = (urlClientIdRaw && urlClientIdRaw !== 'null' && urlClientIdRaw !== '') ? urlClientIdRaw : null;

    // Only update state if URL differs from current state (handling external nav/back button)
    if (urlFolderId !== currentFolderId) {
      setCurrentFolderId(urlFolderId);
    }
    if (normalizedUrlClientId !== realSelectedClientId) {
      setRealSelectedClientId(normalizedUrlClientId);
    }
  }, [searchParams]); // Only re-run when URL params change

  useEffect(() => {
    // Wait for user to be available
    if (!user?.access_token) {
      setIsLoading(false);
      return;
    }

    // Only fetch My Files if entityId is available for non-CA accountants
    // Shared files are linked to the user, so we should allow fetching them even without an entity context
    if (activeTab === 'myFiles' && user?.role !== 'CA_ACCOUNTANT' && !entityId) {
      // Set loading to false if entityId is not available yet
      setIsLoading(false);
      setDocumentsState({ id: 'root', name: 'Root', is_folder: true, children: [] });
      return; // Don't fetch my files until entityId is available
    }

    if (activeTab === 'myFiles') {
      fetchDocuments();
    } else if (activeTab === 'sharedWithMe') {
      fetchSharedDocuments();
    } else if (activeTab === 'renewals') {
      fetchRenewalDocuments();
    }

    // Always fetch renewal count in background for badge
    if (activeTab !== 'renewals') {
      fetchRenewalDocuments();
    }
  }, [fetchDocuments, fetchSharedDocuments, fetchRenewalDocuments, activeTab, realSelectedClientId, user?.role, user?.access_token, entityId]);

  // Helper to update URL params
  const updateUrl = (targetFolderId, targetClientId) => {
    const params = {};
    if (targetFolderId && targetFolderId !== 'root') {
      params.folderId = encodeParam(targetFolderId);
    }
    if (targetClientId) {
      params.clientId = encodeParam(targetClientId);
    }
    setSearchParams(params);
  };

  // Handler for folder navigation
  const handleFolderNavigation = (folderId) => {
    setCurrentFolderId(folderId);
    setSelectedFolder(null);
    updateUrl(folderId, realSelectedClientId);
  };

  // Handler for client change
  const handleClientChange = (clientId) => {
    setRealSelectedClientId(clientId);
    setCurrentFolderId('root');
    setSelectedFolder(null);
    updateUrl('root', clientId);
  };

  const currentPath = useMemo(() => findPath(documentsState, currentFolderId), [documentsState, currentFolderId]);
  const currentFolder = currentPath[currentPath.length - 1];

  // Check if selected folder can be deleted
  // For template folders: block if any documents exist (recursively) 
  // For regular folders: block if folder has any children
  const isSelectedFolderDeletable = useMemo(() => {
    if (!selectedFolder) return true;
    const folder = findFolder(documentsState, selectedFolder.id);
    if (!folder) return true;

    // Only the creator can delete
    if (folder.owner_id && folder.owner_id !== user?.id) return false;

    // Template folders: only block if documents exist (even in subfolders)
    if (folder.template_id) {
      return !folderHasDocumentsRecursive(folder);
    }

    // Regular folders: block if not empty
    return isFolderEmpty(folder);
  }, [selectedFolder, documentsState]);

  const filteredChildren = useMemo(() => {
    if (activeTab === 'sharedWithMe') {
      let itemsToFilter = sharedDocuments;
      // Filter by Search Term
      if (!searchTerm) return itemsToFilter;
      return itemsToFilter.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (!currentFolder || !currentFolder.children) return [];

    // My Files
    // Exclude shared documents from "My Files" for all roles
    let filtered = currentFolder.children.filter(item => {
      return !sharedDocuments.some(shared => shared.id === item.id);
    });

    // If in root folder, only return folders
    if (currentFolderId === 'root') {
      filtered = filtered.filter(item => item.is_folder);
    }

    // Apply search filter if search term exists
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [currentFolder, searchTerm, activeTab, sharedDocuments, currentFolderId]);

  const handleUpload = async (e) => {
    e.preventDefault();
    setIsMutating(true);
    const formData = new FormData(e.target);
    const file = formData.get('file');
    if (!file || file.size === 0) {
      toast({ title: "No file selected", description: "Please select a file to upload.", variant: "destructive" });
      setIsMutating(false);
      return;
    }

    // Validate that at least one option is selected (either checkbox OR expiry date)
    if (!withoutExpiryDate && !shareExpiryDate) {
      toast({ title: "Expiry date required", description: "Please select an expiry date or check 'Without expiry date'.", variant: "destructive" });
      setIsMutating(false);
      return;
    }

    // Optimistic update - add file immediately to UI
    const tempDocId = `temp-${Date.now()}`;
    const newDocument = {
      id: tempDocId,
      name: file.name,
      is_folder: false,
      file_type: file.type || 'Unknown',
      size: file.size,
      expiry_date: withoutExpiryDate ? null : (shareExpiryDate ? shareExpiryDate.toISOString().split('T')[0] : null),
      folder_id: currentFolderId === 'root' ? null : currentFolderId
    };

    // Update state immediately
    setDocumentsState(prev => {
      const updateFolder = (node) => {
        if (node.id === currentFolderId) {
          return { ...node, children: [...node.children, newDocument] };
        }
        if (node.is_folder && node.children) {
          return { ...node, children: node.children.map(updateFolder) };
        }
        return node;
      };
      return updateFolder(prev);
    });

    try {
      let createdDocument;
      const expiryDateToSend = withoutExpiryDate ? null : shareExpiryDate;
      createdDocument = await uploadFile(currentFolderId, user?.role === 'CA_ACCOUNTANT' ? realSelectedClientId : entityId, file, expiryDateToSend, user.access_token);

      // Replace temp document with real document from server
      setDocumentsState(prev => {
        const updateFolder = (node) => {
          if (node.id === currentFolderId) {
            return {
              ...node,
              children: node.children.map(child =>
                child.id === tempDocId ? { ...createdDocument, is_folder: false } : child
              )
            };
          }
          if (node.is_folder && node.children) {
            return { ...node, children: node.children.map(updateFolder) };
          }
          return node;
        };
        return updateFolder(prev);
      });

      toast({ title: "Document Uploaded", description: "New document has been successfully added." });
      setShowUpload(false);
      e.target.reset();
      setShareExpiryDate(null);
      setWithoutExpiryDate(false);
      // Refresh in background (non-blocking) to sync with server
      fetchDocuments(true).catch(err => console.error('Background refresh failed:', err));
    } catch (error) {
      // Rollback optimistic update on error
      setDocumentsState(prev => {
        const updateFolder = (node) => {
          if (node.id === currentFolderId) {
            return { ...node, children: node.children.filter(child => child.id !== tempDocId) };
          }
          if (node.is_folder && node.children) {
            return { ...node, children: node.children.map(updateFolder) };
          }
          return node;
        };
        return updateFolder(prev);
      });
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsMutating(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast({ title: "Invalid Name", description: "Folder name cannot be empty.", variant: "destructive" });
      return;
    }
    setIsMutating(true);

    // Optimistic update - add folder immediately to UI
    const tempFolderId = `temp-${Date.now()}`;
    const newFolder = {
      id: tempFolderId,
      name: newFolderName,
      is_folder: true,
      children: [],
      parent_id: currentFolderId === 'root' ? null : currentFolderId
    };

    // Update state immediately
    setDocumentsState(prev => {
      const updateFolder = (node) => {
        if (node.id === currentFolderId) {
          return { ...node, children: [...node.children, newFolder] };
        }
        if (node.is_folder && node.children) {
          return { ...node, children: node.children.map(updateFolder) };
        }
        return node;
      };
      return updateFolder(prev);
    });

    try {
      const createdFolder = await createFolder(newFolderName, user?.role === 'CA_ACCOUNTANT' ? realSelectedClientId : entityId, currentFolderId, user.agency_id, user.access_token);

      // Replace temp folder with real folder
      setDocumentsState(prev => {
        const replaceTempFolder = (node) => {
          if (node.id === currentFolderId && node.children) {
            return {
              ...node,
              children: node.children.map(child =>
                child.id === tempFolderId ? { ...createdFolder, is_folder: true, children: [] } : child
              )
            };
          }
          if (node.is_folder && node.children) {
            return { ...node, children: node.children.map(replaceTempFolder) };
          }
          return node;
        };
        return replaceTempFolder(prev);
      });

      toast({ title: "Folder Created", description: `Folder "${newFolderName}" has been created.` });
      setShowCreateFolder(false);
      setNewFolderName('');

      // Auto-refresh to sync nested folder structure from server
      fetchDocuments(true).catch(err => console.error('Background refresh after folder create failed:', err));
    } catch (error) {
      // Rollback
      setDocumentsState(prev => {
        const removeTempFolder = (node) => {
          if (node.id === currentFolderId && node.children) {
            return { ...node, children: node.children.filter(child => child.id !== tempFolderId) };
          }
          if (node.is_folder && node.children) {
            return { ...node, children: node.children.map(removeTempFolder) };
          }
          return node;
        };
        return removeTempFolder(prev);
      });
      toast({ title: "Error creating folder", description: error.message, variant: "destructive" });
    } finally {
      setIsMutating(false);
    }
  };

  const handleRenameFolder = async () => {
    if (!folderToRename || !renameFolderName.trim()) return;
    setIsMutating(true);
    const oldName = folderToRename.name;

    // Optimistic update
    setDocumentsState(prev => {
      const updateName = (node) => {
        if (node.id === folderToRename.id) {
          return { ...node, name: renameFolderName };
        }
        if (node.is_folder && node.children) {
          return { ...node, children: node.children.map(updateName) };
        }
        return node;
      };
      return updateName(prev);
    });

    try {
      await renameFolder(folderToRename.id, renameFolderName, user.access_token);
      toast({ title: "Folder Renamed", description: "Folder has been successfully renamed." });
      setShowRenameFolder(false);
      setFolderToRename(null);
      setRenameFolderName('');
    } catch (error) {
      // Rollback
      setDocumentsState(prev => {
        const revertName = (node) => {
          if (node.id === folderToRename.id) {
            return { ...node, name: oldName };
          }
          if (node.is_folder && node.children) {
            return { ...node, children: node.children.map(revertName) };
          }
          return node;
        };
        return revertName(prev);
      });
      toast({ title: "Error renaming folder", description: error.message, variant: "destructive" });
    } finally {
      setIsMutating(false);
    }
  };


  const handleDelete = async () => {
    if (!itemToDelete) return;

    // Check if trying to delete a folder
    if (itemToDelete.type === 'folder') {
      const folder = findFolder(documentsState, itemToDelete.id);

      // Template folders: block if documents exist anywhere in the hierarchy
      if (folder && folder.template_id && folderHasDocumentsRecursive(folder)) {
        toast({
          title: "Cannot delete template folder",
          description: "This template folder contains documents. Please remove all documents first before deleting.",
          variant: "destructive"
        });
        setItemToDelete(null);
        return;
      }

      // Regular folders: block if not empty
      if (folder && !folder.template_id && !isFolderEmpty(folder)) {
        toast({
          title: "Cannot delete folder",
          description: "This folder contains documents or subfolders. Please delete all items inside the folder first.",
          variant: "destructive"
        });
        setItemToDelete(null);
        return;
      }
    }

    setIsMutating(true);
    const deletedItem = itemToDelete;

    // If we're viewing the folder that's being deleted, navigate to parent first
    if (activeTab === 'myFiles' && currentFolderId === deletedItem.id && deletedItem.type === 'folder') {
      const parentFolder = currentPath.length > 1 ? currentPath[currentPath.length - 2] : null;
      handleFolderNavigation(parentFolder ? parentFolder.id : 'root');
    }

    // Optimistic deletion - remove from UI immediately
    if (activeTab === 'myFiles') {
      setDocumentsState(prev => {
        const removeItem = (node) => {
          if (node.is_folder && node.children) {
            return {
              ...node,
              children: node.children.filter(child => child.id !== deletedItem.id).map(removeItem)
            };
          }
          return node;
        };
        return removeItem(prev);
      });
    } else {
      setSharedDocuments(prev => prev.filter(item => item.id !== deletedItem.id));
    }

    // Clear selected folder if it was deleted
    if (selectedFolder && selectedFolder.id === deletedItem.id) {
      setSelectedFolder(null);
    }

    // Don't clear itemToDelete yet - keep modal open to show loader
    try {
      await deleteDocument(deletedItem.id, deletedItem.type, user.access_token);
      toast({ title: "Item Deleted", description: "The selected item has been removed." });

      // Clear the item to delete and close modal after successful deletion
      setItemToDelete(null);

      // Refresh in background (non-blocking) to sync with server
      if (activeTab === 'myFiles') {
        fetchDocuments(true).catch(err => console.error('Background refresh failed:', err));
      } else {
        fetchSharedDocuments(true).catch(err => console.error('Background refresh failed:', err));
      }
    } catch (error) {
      // Rollback optimistic deletion on error
      if (activeTab === 'myFiles') {
        fetchDocuments(true).catch(err => console.error('Rollback refresh failed:', err));
      } else {
        fetchSharedDocuments(true).catch(err => console.error('Rollback refresh failed:', err));
      }
      toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsMutating(false);
    }
  };

  const handleShareClick = async (doc) => {
    setShareDoc(doc);
    setLinkCopied(false);
    setShareEmails(''); // Reset emails when opening dialog
    setShareDialogOpen(true);
    setIsGeneratingLink(true);
    setShareLink('');

    // Generate public share token and link
    try {
      let tokenData;
      if (doc.is_folder) {
        tokenData = await createPublicShareTokenFolder(doc.id, 30, user.access_token);
      } else {
        tokenData = await createPublicShareTokenDocument(doc.id, 30, user.access_token);
      }

      // Generate public shareable link
      const baseUrl = window.location.origin;
      if (doc.is_folder) {
        const link = `${baseUrl}/public/folder/${tokenData.token}`;
        setShareLink(link);
      } else {
        const link = `${baseUrl}/public/document/${tokenData.token}`;
        setShareLink(link);
      }
    } catch (error) {
      console.error('Failed to generate public share link:', error);
      // Fallback to old link generation
      const baseUrl = FINANCE_API_BASE_URL.replace('/api', '');
      const link = `${baseUrl}/api/documents/${doc.id}`;
      setShareLink(link);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Helper: check if user is a client-side role
  const isClientRole = ['CLIENT_USER', 'CLIENT_MASTER_ADMIN', 'ENTITY_USER'].includes(user?.role);
  const isCARole = ['CA_ACCOUNTANT', 'AGENCY_ADMIN', 'CA_TEAM'].includes(user?.role);

  // Effect to fetch users for collaborate modal based on selected client
  useEffect(() => {
    if (!collaborateDialogOpen) return;

    const fetchCollabUsers = async () => {
      setLoadingUsers(true);
      setAvailableUsers([]);

      try {
        let users = [];

        if (isClientRole) {
          // For Client Admin / Client User: fetch both their org colleagues AND CA team members
          // 1. Fetch client org colleagues
          try {
            const clientUsers = await listAllClientUsers(user.access_token);
            if (Array.isArray(clientUsers)) {
              users = [...users, ...clientUsers.map(u => ({ ...u, _group: 'Client Team' }))];
            }
          } catch (clientError) {
            console.error('Failed to fetch client users:', clientError);
          }
          // 2. Also fetch CA team members via the dedicated client endpoint
          try {
            const caTeam = await listCATeamForClient(user.access_token);
            if (Array.isArray(caTeam)) {
              users = [...users, ...caTeam.map(u => ({ ...u, _group: 'CA Team' }))];
            }
          } catch (teamError) {
            console.error('Failed to fetch CA team members:', teamError);
          }
        } else {
          // For CA Admin / CA Team
          // CASE 1: My Team - when NO client selected
          if (!collabSelectedClientId || collabSelectedClientId === 'my-team') {
            try {
              const teamMembers = await listTeamMembers(user.access_token);
              if (Array.isArray(teamMembers)) {
                users = teamMembers;
              } else if (teamMembers && Array.isArray(teamMembers.members)) {
                users = teamMembers.members;
              } else if (teamMembers && teamMembers.data && Array.isArray(teamMembers.data)) {
                users = teamMembers.data;
              }
            } catch (teamError) {
              console.error('Failed to fetch team members:', teamError);
              toast({ title: 'Error', description: 'Failed to fetch team members.', variant: 'destructive' });
            }
          }
          // CASE 2: Client Selected - fetch that client's users
          else {
            const client = clientsForFilter.find(c => String(c.id) === String(collabSelectedClientId));
            if (client) {
              // Primary: use listAllClientUsers with entity_id (client.id) - works reliably
              try {
                const clientUsers = await listAllClientUsers(user.access_token, client.id);
                if (Array.isArray(clientUsers)) {
                  users = clientUsers;
                }
              } catch (entityError) {
                console.error('Failed to fetch client users via entity:', entityError);
                // Fallback: try listOrgUsers if organization_id exists
                if (client.organization_id) {
                  try {
                    const orgUsers = await listOrgUsers(client.organization_id, user.access_token);
                    if (orgUsers && typeof orgUsers === 'object') {
                      const invited = Array.isArray(orgUsers.invited_users) ? orgUsers.invited_users : [];
                      const joined = Array.isArray(orgUsers.joined_users) ? orgUsers.joined_users : [];
                      users = [...invited, ...joined];
                    } else if (Array.isArray(orgUsers)) {
                      users = orgUsers;
                    }
                  } catch (orgError) {
                    console.error('Fallback listOrgUsers also failed:', orgError);
                    toast({ title: 'Error', description: 'Failed to fetch client users.', variant: 'destructive' });
                  }
                } else {
                  toast({ title: 'Error', description: 'Failed to fetch client users.', variant: 'destructive' });
                }
              }
            } else {
              console.warn('Selected client not found in clientsForFilter', collabSelectedClientId);
            }
          }
        }

        // Normalize users
        const normalizedUsers = users.map(u => ({
          id: u.id || u.user_id || u.email,
          email: u.email || u.user_email,
          name: u.name || u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
          first_name: u.first_name,
          last_name: u.last_name,
          _group: u._group || ''
        })).filter(u => u.email && u.email !== user.email);

        // Deduplicate by email
        const seen = new Set();
        const deduped = normalizedUsers.filter(u => {
          if (seen.has(u.email)) return false;
          seen.add(u.email);
          return true;
        });

        setAvailableUsers(deduped);
      } catch (error) {
        console.error('Error in fetchCollabUsers:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchCollabUsers();
  }, [collabSelectedClientId, collaborateDialogOpen, user, clientsForFilter]);


  const handleCollaborateClick = async (doc) => {
    setCollaborateDoc(doc);
    setSelectedUsers([]);
    setAvailableUsers([]);
    setUserSearchTerm('');

    // Initialize selected client for modal
    // If CA selected a specific client in main view, use that.
    // Otherwise use 'my-team' (Personal Docs context) or null.
    if (user?.role === 'CA_ACCOUNTANT' && realSelectedClientId) {
      setCollabSelectedClientId(realSelectedClientId);
    } else {
      setCollabSelectedClientId('my-team');
    }

    setCollaborateDialogOpen(true);
  };

  const handleUserToggle = (user) => {
    setSelectedUsers(prev => {
      if (prev.some(u => u.id === user.id || u.email === user.email)) {
        return prev.filter(u => u.id !== user.id && u.email !== user.email);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleConfirmCollaborate = async () => {
    if (selectedUsers.length === 0) {
      toast({
        title: 'No users selected',
        description: 'Please select at least one user to collaborate with.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsMutating(true);
      const emails = selectedUsers.map(u => u.email);

      if (collaborateDoc.is_folder) {
        // Share folder with each user (one at a time as per backend)
        for (const email of emails) {
          await shareFolder(collaborateDoc.id, email, user.access_token);
        }
      } else {
        // Share document with all users at once
        await shareDocument(collaborateDoc.id, emails, user.access_token);
      }

      toast({
        title: 'Collaboration successful',
        description: `Successfully shared ${collaborateDoc.name} with ${selectedUsers.length} user(s).`
      });

      setCollaborateDialogOpen(false);
      setSelectedUsers([]);
      setCollaborateDoc(null);
      setUserSearchTerm('');

      // Refresh shared documents to show the updated list
      if (activeTab === 'sharedWithMe') {
        fetchSharedDocuments();
      }
    } catch (error) {
      toast({
        title: 'Collaboration failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setLinkCopied(true);
    toast({ title: "Link Copied", description: "Share link has been copied to clipboard." });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleShareViaApp = (appName) => {
    const encodedLink = encodeURIComponent(shareLink);
    const encodedName = encodeURIComponent(shareDoc?.name || 'Document');
    let shareUrl = '';

    switch (appName) {
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedName}%20${encodedLink}`;
        break;
      case 'gmail':
        shareUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=&su=${encodedName}&body=${encodedLink}`;
        break;
      case 'outlook':
        shareUrl = `https://outlook.live.com/mail/0/deeplink/compose?subject=${encodedName}&body=${encodedLink}`;
        break;
      case 'teams':
        shareUrl = `https://teams.microsoft.com/l/chat/0/0?message=${encodedLink}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedLink}&text=${encodedName}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedLink}`;
        break;
      default:
        return;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  const handleConfirmShare = async () => {
    const emails = shareEmails.split(',').map(e => e.trim()).filter(e => e);
    if (emails.length === 0) {
      toast({ title: "Email required", description: "Please enter at least one email address to share.", variant: "destructive" });
      return;
    }
    try {
      if (shareDoc.is_folder) {
        // Assuming we share with one email at a time for folders as per backend
        await shareFolder(shareDoc.id, emails[0], user.access_token);
      } else {
        await shareDocument(shareDoc.id, emails, user.access_token);
      }
      toast({ title: "Sharing Complete", description: `Successfully shared ${shareDoc.name}.` });
      setShareDialogOpen(false);
      setShareEmails('');
      setShareDoc(null);
    } catch (error) {
      toast({ title: "Share Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleView = async (doc) => {
    if (doc.is_folder) {
      handleFolderNavigation(doc.id);
      return;
    }
    toast({ title: "Loading...", description: `Opening ${doc.name}.` });
    try {
      const fileBlob = await viewFile(doc.id, user.access_token);
      const fileURL = URL.createObjectURL(fileBlob);
      setPreviewFile({ url: fileURL, name: doc.name });
    } catch (error) {
      toast({ title: "Failed to open file", description: error.message, variant: "destructive" });
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'myFiles') {
      fetchDocuments(true);
    } else if (activeTab === 'sharedWithMe') {
      fetchSharedDocuments(true);
    } else if (activeTab === 'renewals') {
      fetchRenewalDocuments();
    }
  };

  const renderMyFiles = () => {
    const isSubFolder = currentFolderId !== 'root';
    const folders = filteredChildren.filter(item => item.is_folder);
    const documents = filteredChildren.filter(item => !item.is_folder);

    const formatDate = (dateString) => {
      if (!dateString) return '-';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return (
      <>
        <div className="flex items-center space-x-1 sm:space-x-2 text-gray-400 mb-4 sm:mb-8 text-sm sm:text-base overflow-x-auto pb-2">
          {currentFolderId !== 'root' && currentPath.length > 1 && (
            <Button variant="ghost" size="sm" onClick={() => {
              handleFolderNavigation(currentPath[currentPath.length - 2].id);
            }} className="h-8 sm:h-9 text-xs sm:text-sm flex-shrink-0">
              <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Back</span>
            </Button>
          )}
          {currentPath.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <span onClick={() => {
                handleFolderNavigation(folder.id);
              }} className="cursor-pointer hover:text-white transition-colors whitespace-nowrap truncate max-w-[100px] sm:max-w-none">{folder.name}</span>
              {index < currentPath.length - 1 && <span className="text-gray-600 flex-shrink-0">/</span>}
            </React.Fragment>
          ))}
        </div>

        {/* Folders - Always in grid format with reduced gap and larger icons */}
        {folders.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {folders.map((item, index) => {
              const isSelected = selectedFolder?.id === item.id;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className={`flex flex-col items-center cursor-pointer group relative p-2 sm:p-3 rounded-lg transition-all ${isSelected ? 'bg-blue-500/20 border-2 border-blue-500' : 'hover:bg-gray-800/30'
                    }`}
                  onClick={() => {
                    // Single click opens folder
                    handleFolderNavigation(item.id);
                  }}
                >
                  <div className="relative mb-0">
                    <FolderIcon
                      className={`w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 transition-transform ${isSelected ? 'scale-105' : 'group-hover:scale-110'}`}
                      hasExpired={hasExpiredDocuments(item)}
                    />
                    {/* Checkbox on hover - top left corner */}
                    <div
                      className="absolute top-2 left-2 sm:top-2 sm:left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFolder(isSelected ? null : item);
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          setSelectedFolder(checked ? item : null);
                        }}
                        className="w-4 h-4 sm:w-5 sm:h-5 bg-gray-800 border-gray-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                    </div>
                  </div>
                  <div className="w-full text-center !mt-[-25px] px-1 ">
                    <p className={`text-xs sm:text-sm truncate transition-colors ${isSelected ? 'text-blue-300 font-semibold' : 'text-white group-hover:text-blue-300'
                      }`}>{item.name}</p>
                  </div>
                </motion.div>
              );
            })}
          </div >
        )}

        {/* Documents - Table format in subfolders, grid format in main folders */}
        {
          isSubFolder && documents.length > 0 && (
            <div className="mt-4 sm:mt-8 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-400 text-xs sm:text-sm">FILE NAME</TableHead>
                    <TableHead className="text-gray-400 text-xs sm:text-sm hidden md:table-cell">UPLOADED BY</TableHead>
                    <TableHead className="text-gray-400 text-xs sm:text-sm hidden sm:table-cell">EXPIRY DATE</TableHead>
                    <TableHead className="text-gray-400 text-right text-xs sm:text-sm">ACTION</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((item) => (
                    <TableRow key={item.id} className="hover:bg-white/5">
                      <TableCell className="text-white font-medium text-xs sm:text-sm">
                        <div className="flex flex-col sm:block">
                          <span className="truncate">{item.name}</span>
                          <span className="text-gray-400 text-xs sm:hidden mt-1">
                            {item.expiry_date ? formatDate(item.expiry_date) : <span className="text-gray-500 italic">Document not expire</span>}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300 text-xs sm:text-sm hidden md:table-cell">
                        <div className="flex flex-col">
                          <span className="text-white text-xs">{item.owner_name || item.owner_email || '-'}</span>
                          {item.created_at && (
                            <span className="text-gray-500 text-[10px]">
                              {new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(item.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300 text-xs sm:text-sm hidden sm:table-cell">
                        {item.expiry_date ? formatDate(item.expiry_date) : <span className="text-gray-500 italic">Document not expire</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                              <MoreVertical className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(item)}>
                              <FileText className="w-4 h-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleShareClick(item)}>
                              <Share2 className="w-4 h-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCollaborateClick(item)}>
                              <UserPlus className="w-4 h-4 mr-2" />
                              Collaborate
                            </DropdownMenuItem>
                            {item.owner_id === user?.id && (
                              <AlertDialog open={itemToDelete?.id === item.id && itemToDelete?.type === 'document'} onOpenChange={(open) => {
                                if (!open && !isMutating) {
                                  setItemToDelete(null);
                                }
                              }}>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setItemToDelete({ id: item.id, type: 'document' });
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the document.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setItemToDelete(null)} disabled={isMutating}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={async () => {
                                      await handleDelete();
                                    }} disabled={isMutating}>
                                      {isMutating ? (
                                        <>
                                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                          Deleting...
                                        </>
                                      ) : (
                                        'Delete'
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        }

        {/* Documents - Grid format in main folders (when not in subfolder) */}
        {
          !isSubFolder && documents.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2 sm:gap-4">
              {documents.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className="flex flex-col items-center cursor-pointer group relative"
                  onDoubleClick={() => handleView(item)}
                >
                  <div className="relative mb-2">
                    <div className="w-40 h-40 sm:w-44 sm:h-44 md:w-48 md:h-48 rounded-xl flex items-center justify-center bg-gradient-to-br from-sky-500 to-indigo-500 transition-transform group-hover:scale-110">
                      <FileText className="w-20 h-20 sm:w-22 sm:h-22 md:w-24 md:h-24 text-white" />
                    </div>
                    {/* Action buttons on hover */}
                    <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 sm:gap-1">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-6 w-6 sm:h-7 sm:w-7 bg-gray-800/90 hover:bg-gray-700"
                        onClick={(e) => { e.stopPropagation(); handleShareClick(item) }}
                      >
                        <Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-6 w-6 sm:h-7 sm:w-7 bg-gray-800/90 hover:bg-gray-700"
                        onClick={(e) => { e.stopPropagation(); setFolderToRename(item); setRenameFolderName(item.name); setShowRenameFolder(true); }}
                      >
                        <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-6 w-6 sm:h-7 sm:w-7 bg-gray-800/90 hover:bg-gray-700"
                        onClick={(e) => { e.stopPropagation(); handleView(item) }}
                      >
                        <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </Button>
                      <AlertDialog open={itemToDelete?.id === item.id && itemToDelete?.type === 'document'} onOpenChange={(open) => {
                        if (!open && !isMutating) {
                          setItemToDelete(null);
                        }
                      }}>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-6 w-6 sm:h-7 sm:w-7 bg-red-600/90 hover:bg-red-700"
                            onClick={(e) => { e.stopPropagation(); setItemToDelete({ id: item.id, type: 'document' }) }}
                          >
                            <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the item.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={(e) => { e.stopPropagation(); setItemToDelete(null) }} disabled={isMutating}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={async (e) => {
                              e.stopPropagation();
                              await handleDelete();
                            }} disabled={isMutating}>
                              {isMutating ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                'Delete'
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <div className="w-full text-center px-1">
                    <p className="text-xs sm:text-sm text-white truncate group-hover:text-blue-300 transition-colors">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-1 truncate hidden sm:block">{item.file_type} • {item.size ? `${(item.size / 1024 / 1024).toFixed(2)} MB` : ''}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        }

        {/* Empty state */}
        {
          filteredChildren.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">{searchTerm ? 'No items found matching your search.' : 'This folder is empty.'}</p>
              {currentFolderId !== 'root' && !searchTerm && (
                <Button
                  variant="outline"
                  onClick={() => {
                    handleFolderNavigation('root');
                    setSearchTerm('');
                    if (activeTab !== 'myFiles') setActiveTab('myFiles');
                  }}
                >
                  {realSelectedClientId ? 'Back to Client Documents' : 'Back to My Documents'}
                </Button>
              )}
            </div>
          )
        }
      </>
    );
  };

  // Get unique sharers for the filter dropdown (computed outside render function)
  const uniqueSharers = useMemo(() => {
    const sharers = new Map();
    sharedDocuments.forEach(item => {
      const email = item.owner_email;
      const name = item.owner_name || email;
      if (email && !sharers.has(email)) {
        sharers.set(email, name);
      }
    });
    return Array.from(sharers.entries()).map(([email, name]) => ({ email, name }));
  }, [sharedDocuments]);

  // Navigate into a shared folder
  const handleSharedFolderOpen = useCallback(async (folder) => {
    setIsLoadingSharedFolder(true);
    try {
      const data = await getSharedFolderContents(folder.id, user.access_token);
      const subfolders = (data.folders || []).map(f => ({ ...f, is_folder: true }));
      const docs = (data.documents || []).map(d => ({ ...d, is_folder: false }));
      setSharedFolderContents({ folders: subfolders, documents: docs });
      setSharedCurrentFolder(folder);
      setSharedFolderPath(prev => [...prev, { id: folder.id, name: folder.name }]);
    } catch (error) {
      console.error('Error fetching shared folder contents:', error);
      toast({ title: 'Error', description: 'Failed to open shared folder.', variant: 'destructive' });
    } finally {
      setIsLoadingSharedFolder(false);
    }
  }, [user?.access_token, toast]);

  // Navigate back in shared folder breadcrumb
  const handleSharedFolderBack = useCallback(async (targetIndex) => {
    if (targetIndex < 0) {
      // Go back to shared root
      setSharedCurrentFolder(null);
      setSharedFolderPath([]);
      setSharedFolderContents({ folders: [], documents: [] });
      return;
    }
    const target = sharedFolderPath[targetIndex];
    setIsLoadingSharedFolder(true);
    try {
      const data = await getSharedFolderContents(target.id, user.access_token);
      const subfolders = (data.folders || []).map(f => ({ ...f, is_folder: true }));
      const docs = (data.documents || []).map(d => ({ ...d, is_folder: false }));
      setSharedFolderContents({ folders: subfolders, documents: docs });
      setSharedCurrentFolder(target);
      setSharedFolderPath(prev => prev.slice(0, targetIndex + 1));
    } catch (error) {
      console.error('Error navigating shared folder:', error);
      toast({ title: 'Error', description: 'Failed to navigate.', variant: 'destructive' });
    } finally {
      setIsLoadingSharedFolder(false);
    }
  }, [user?.access_token, sharedFolderPath, toast]);

  // Deduplicate shared folders: hide subfolder if any ancestor is already in the shared list
  const deduplicatedSharedDocs = useMemo(() => {
    const sharedFolderIds = new Set(sharedDocuments.filter(d => d.is_folder).map(d => d.id));

    // For each shared folder, check if any of its ancestors are also shared
    const isAncestorShared = (item) => {
      if (!item.is_folder || !item.parent_id) return false;
      if (sharedFolderIds.has(item.parent_id)) return true;
      // Check deeper ancestors by finding the parent in the shared list
      const parent = sharedDocuments.find(d => d.is_folder && d.id === item.parent_id);
      if (parent) return isAncestorShared(parent);
      return false;
    };

    return sharedDocuments.filter(item => !isAncestorShared(item));
  }, [sharedDocuments]);

  // Reset shared folder navigation when switching tabs
  useEffect(() => {
    if (activeTab !== 'sharedWithMe') {
      setSharedCurrentFolder(null);
      setSharedFolderPath([]);
      setSharedFolderContents({ folders: [], documents: [] });
    }
  }, [activeTab]);

  const renderSharedWithMe = () => {
    // If we're inside a shared folder, show its contents
    if (sharedCurrentFolder) {
      const allContents = [...sharedFolderContents.folders, ...sharedFolderContents.documents];
      const folders = sharedFolderContents.folders;
      const documents = sharedFolderContents.documents;

      const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
      };

      return (
        <div>
          {/* Breadcrumb navigation */}
          <div className="flex items-center space-x-1 sm:space-x-2 text-gray-400 mb-4 sm:mb-8 text-sm sm:text-base overflow-x-auto pb-2">
            <Button variant="ghost" size="sm" onClick={() => {
              if (sharedFolderPath.length <= 1) {
                handleSharedFolderBack(-1);
              } else {
                handleSharedFolderBack(sharedFolderPath.length - 2);
              }
            }} className="h-8 sm:h-9 text-xs sm:text-sm flex-shrink-0">
              <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Back</span>
            </Button>
            <span
              className="cursor-pointer hover:text-white transition-colors whitespace-nowrap"
              onClick={() => handleSharedFolderBack(-1)}
            >
              Shared
            </span>
            <span className="text-gray-600 flex-shrink-0">/</span>
            {sharedFolderPath.map((crumb, index) => (
              <React.Fragment key={crumb.id}>
                <span
                  className={`cursor-pointer hover:text-white transition-colors whitespace-nowrap truncate max-w-[100px] sm:max-w-none ${index === sharedFolderPath.length - 1 ? 'text-white' : ''}`}
                  onClick={() => {
                    if (index < sharedFolderPath.length - 1) {
                      handleSharedFolderBack(index);
                    }
                  }}
                >
                  {crumb.name}
                </span>
                {index < sharedFolderPath.length - 1 && <span className="text-gray-600 flex-shrink-0">/</span>}
              </React.Fragment>
            ))}
          </div>

          {isLoadingSharedFolder ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          ) : (
            <>
              {/* Subfolders - grid like My Files */}
              {folders.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 mb-6 sm:mb-8">
                  {folders.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      className="flex flex-col items-center cursor-pointer group relative p-2 sm:p-3 rounded-lg transition-all hover:bg-gray-800/30"
                      onClick={() => handleSharedFolderOpen(item)}
                    >
                      <div className="relative mb-0">
                        <FolderIcon
                          className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 transition-transform group-hover:scale-110"
                          hasExpired={hasExpiredDocuments(item)}
                        />
                      </div>
                      <div className="w-full text-center !mt-[-25px] px-1">
                        <p className="text-xs sm:text-sm text-white truncate group-hover:text-blue-300 transition-colors" title={item.name}>{item.name}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Documents - table format */}
              {documents.length > 0 && (
                <div className="mt-4 sm:mt-8 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-gray-400 text-xs sm:text-sm">FILE NAME</TableHead>
                        <TableHead className="text-gray-400 text-xs sm:text-sm hidden md:table-cell">UPLOADED BY</TableHead>
                        <TableHead className="text-gray-400 text-xs sm:text-sm hidden sm:table-cell">EXPIRY DATE</TableHead>
                        <TableHead className="text-gray-400 text-right text-xs sm:text-sm">ACTION</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((item) => (
                        <TableRow key={item.id} className="hover:bg-white/5">
                          <TableCell className="text-white font-medium text-xs sm:text-sm">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                              <span className="truncate">{item.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-400 text-xs sm:text-sm hidden md:table-cell">
                            {item.owner_name || item.owner_email || '-'}
                          </TableCell>
                          <TableCell className="text-gray-400 text-xs sm:text-sm hidden sm:table-cell">
                            {item.expiry_date ? formatDate(item.expiry_date) : <span className="text-gray-500 italic">No expiry</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8"
                                onClick={(e) => { e.stopPropagation(); handleView(item); }}>
                                <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {folders.length === 0 && documents.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm sm:text-base">This folder is empty.</p>
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    // Root shared view - show list of shared items (deduplicated)
    const filteredSharedDocs = deduplicatedSharedDocs.filter(item => {
      const matchesSearch = !searchTerm || (item.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSharer = !sharedByFilter || item.owner_email === sharedByFilter;
      return matchesSearch && matchesSharer;
    });

    const sharedFolders = filteredSharedDocs.filter(item => item.is_folder);
    const sharedFiles = filteredSharedDocs.filter(item => !item.is_folder);

    return (
      <div>
        {/* Shared Folders - grid matching My Files */}
        {sharedFolders.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {sharedFolders.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="flex flex-col items-center cursor-pointer group relative p-2 sm:p-3 rounded-lg transition-all hover:bg-gray-800/30"
                onClick={() => handleSharedFolderOpen(item)}
              >
                <div className="relative mb-0">
                  <FolderIcon
                    className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 transition-transform group-hover:scale-110"
                    hasExpired={hasExpiredDocuments(item)}
                  />
                </div>
                <div className="w-full text-center !mt-[-25px] px-1">
                  <p className="text-xs sm:text-sm text-white truncate group-hover:text-blue-300 transition-colors" title={item.name}>{item.name}</p>
                  {(item.owner_name || item.owner_email) && (
                    <p className="text-xs text-gray-400 mt-1 truncate hidden sm:block">Shared by: {item.owner_name || item.owner_email}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Shared Files - grid matching My Files document grid */}
        {sharedFiles.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2 sm:gap-4">
            {sharedFiles.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="flex flex-col items-center cursor-pointer group relative p-2 sm:p-3 rounded-lg transition-all hover:bg-gray-800/30"
                onDoubleClick={() => handleView(item)}
              >
                <div className="relative mb-2">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 transition-transform group-hover:scale-110">
                    <FileText className="w-12 h-12 sm:w-16 sm:h-16 md:w-18 md:h-18 lg:w-20 lg:h-20 text-white" />
                  </div>
                </div>
                <div className="w-full text-center px-1">
                  <p className="text-xs sm:text-sm text-white truncate group-hover:text-blue-300 transition-colors" title={item.name}>{item.name}</p>
                  {(item.owner_name || item.owner_email) && (
                    <p className="text-xs text-gray-400 mt-1 truncate hidden sm:block">Shared by: {item.owner_name || item.owner_email}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {filteredSharedDocs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm sm:text-base">{searchTerm || sharedByFilter ? 'No shared items found matching your filters.' : 'No items have been shared with you.'}</p>
          </div>
        )}
      </div>
    );
  };

  const renderRenewals = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getRenewalStatus = (expiryDate) => {
      if (!expiryDate) return { label: '-', color: 'text-gray-400' };
      const expiry = new Date(expiryDate);
      expiry.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) return { label: 'Expired', color: 'text-red-400' };
      if (daysLeft === 0) return { label: 'Expires Today', color: 'text-red-400' };
      return { label: `Expiring in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`, color: 'text-yellow-400' };
    };

    // Build full folder path like "Main Folder / Sub Folder"
    const getFolderPathInfo = (doc) => {
      if (!doc.folder_id) return { label: 'Root', folderId: 'root' };
      const path = findPath(documentsState, doc.folder_id);
      if (path.length > 1) {
        // Skip the root node, join remaining folder names
        const folderNames = path.slice(1).map(f => f.name);
        return { label: folderNames.join(' / '), folderId: doc.folder_id };
      }
      const folder = findFolder(documentsState, doc.folder_id);
      return { label: folder ? folder.name : `Folder #${doc.folder_id}`, folderId: doc.folder_id };
    };

    const filteredRenewals = renewalDocuments.filter(doc =>
      (doc.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-gray-400 text-xs sm:text-sm w-16">S.No</TableHead>
              <TableHead className="text-gray-400 text-xs sm:text-sm">DOCUMENT NAME</TableHead>
              <TableHead className="text-gray-400 text-xs sm:text-sm hidden sm:table-cell">STATUS</TableHead>
              <TableHead className="text-gray-400 text-xs sm:text-sm hidden md:table-cell">LOCATION</TableHead>
              <TableHead className="text-gray-400 text-xs sm:text-sm hidden lg:table-cell">EXPIRY DATE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRenewals.length > 0 ? filteredRenewals.map((doc, index) => {
              const status = getRenewalStatus(doc.expiry_date);
              return (
                <TableRow
                  key={doc.id}
                  className="hover:bg-white/5 cursor-pointer"
                  onClick={() => handleView(doc)}
                >
                  <TableCell className="text-gray-500 font-mono text-xs sm:text-sm">
                    {String(index + 1).padStart(2, '0')}
                  </TableCell>
                  <TableCell className="text-white font-medium text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="truncate">{doc.name}</span>
                    </div>
                    <span className={`text-xs sm:hidden mt-1 block ${status.color}`}>{status.label}</span>
                  </TableCell>
                  <TableCell className={`text-xs sm:text-sm hidden sm:table-cell font-medium ${status.color}`}>
                    {status.label}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm hidden md:table-cell">
                    {(() => {
                      const pathInfo = getFolderPathInfo(doc);
                      return (
                        <span
                          className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTab('myFiles');
                            if (pathInfo.folderId && pathInfo.folderId !== 'root') {
                              handleFolderNavigation(pathInfo.folderId);
                            }
                          }}
                          title={`Navigate to: ${pathInfo.label}`}
                        >
                          {pathInfo.label}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-gray-400 text-xs sm:text-sm hidden lg:table-cell">
                    {doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <CalendarDays className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No expiring or expired documents found.</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8" onClick={() => setSelectedFolder(null)}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white">Documents</h1>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 w-full xl:w-auto flex-wrap justify-end">
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {/* Shared by user filter - left of search, only on Shared tab */}
              {activeTab === 'sharedWithMe' && !sharedCurrentFolder && uniqueSharers.length > 0 && (
                <div className="w-44 sm:w-52">
                  <Combobox
                    options={[
                      { value: '__all__', label: 'All Users' },
                      ...uniqueSharers.map(sharer => ({
                        value: sharer.email,
                        label: sharer.name || sharer.email
                      }))
                    ]}
                    value={sharedByFilter || '__all__'}
                    onValueChange={(val) => setSharedByFilter(val === '__all__' ? null : val)}
                    placeholder="Filter by user..."
                    searchPlaceholder="Search users..."
                    emptyText="No users found."
                  />
                </div>
              )}
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <Input placeholder="Search..." className="pl-9 sm:pl-12 h-9 sm:h-10 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
            {user?.role === 'CA_ACCOUNTANT' && activeTab === 'myFiles' && currentFolderId === 'root' && (
              <Button onClick={() => setShowTemplates(true)} variant="outline" className="h-9 sm:h-10 text-sm sm:text-base flex-1 sm:flex-initial border-dashed border-blue-500/50 hover:border-blue-500 text-blue-400 hover:text-blue-300">
                <Copy className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Templates</span>
              </Button>
            )}
            {user?.role === 'CA_ACCOUNTANT' && (
              <>
                <div className="w-full sm:w-48 lg:w-52">
                  <Popover open={openClientCombobox} onOpenChange={setOpenClientCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openClientCombobox}
                        className={cn(
                          "w-full justify-between h-9 sm:h-10",
                          !realSelectedClientId && "text-muted-foreground"
                        )}
                        disabled={isClientsLoading}
                      >
                        {isClientsLoading ? (
                          <div className="flex items-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span>Loading...</span>
                          </div>
                        ) : (
                          <>
                            {realSelectedClientId
                              ? clientsForFilter.find((client) => client.id === realSelectedClientId)?.name
                              : "Select Client"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                      <Command>
                        <CommandInput placeholder="Search client..." />
                        <CommandList>
                          <CommandEmpty>No client found.</CommandEmpty>
                          <CommandGroup>
                            {clientsForFilter.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={`${client.name} ${client.id}`}
                                onSelect={() => {
                                  const newClientId = client.id === realSelectedClientId ? null : client.id;
                                  handleClientChange(newClientId);
                                  setOpenClientCombobox(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    realSelectedClientId === client.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {client.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tabs Component Integration */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 sm:mb-8">
            <TabsList className="bg-black/20 p-1 rounded-lg w-full sm:w-auto h-auto">
              <TabsTrigger
                value="myFiles"
                className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm flex-1 sm:flex-initial data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none"
              >
                <Folder className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>My Files</span>
              </TabsTrigger>
              <TabsTrigger
                value="sharedWithMe"
                className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm flex-1 sm:flex-initial data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none"
              >
                <Inbox className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Shared with me</span>
                <span className="xs:hidden">Shared</span>
              </TabsTrigger>
              <TabsTrigger
                value="renewals"
                className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm flex-1 sm:flex-initial data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none"
              >
                <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Renewals</span>
                {renewalDocuments.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded-full font-medium">{renewalDocuments.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="activityLog"
                className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm flex-1 sm:flex-initial data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none"
              >
                <History className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Activity Log</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 w-full lg:w-auto">
              {/* Action bar: New Folder/Upload | Share | Collaborate | Delete */}
              <div className="flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 bg-gray-800/50 rounded-lg border border-gray-700 flex-wrap" onClick={(e) => e.stopPropagation()}>
                {/* 1. Delete */}
                <AlertDialog open={itemToDelete?.id === selectedFolder?.id && itemToDelete?.type === 'folder'} onOpenChange={(open) => {
                  if (!open && !isMutating) {
                    setItemToDelete(null);
                  }
                }}>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed h-8 sm:h-9 text-xs sm:text-sm flex-1 sm:flex-initial"
                      disabled={!selectedFolder || !isSelectedFolderDeletable}
                      title={selectedFolder && !isSelectedFolderDeletable ? (selectedFolder.owner_id && selectedFolder.owner_id !== user?.id ? "Only the creator can delete this folder" : selectedFolder.template_id ? "Cannot delete template folder with documents. Remove all documents first." : "Cannot delete folder with contents") : ""}
                      onClick={() => {
                        if (selectedFolder) {
                          setItemToDelete({ id: selectedFolder.id, type: 'folder' });
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the folder "{selectedFolder?.name || ''}".
                        {selectedFolder?.template_id && " This is a template folder. It cannot be deleted if it contains any documents."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setItemToDelete(null)} disabled={isMutating}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={async () => {
                        await handleDelete();
                        setSelectedFolder(null);
                      }} disabled={isMutating || !selectedFolder}>
                        {isMutating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          'Delete'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                {/* 2. Share */}
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed h-8 sm:h-9 text-xs sm:text-sm flex-1 sm:flex-initial"
                  onClick={() => selectedFolder && handleShareClick(selectedFolder)}
                  disabled={!selectedFolder}
                >
                  <Share2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
                {/* 3. Collaborate */}
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed h-8 sm:h-9 text-xs sm:text-sm flex-1 sm:flex-initial"
                  onClick={() => selectedFolder && handleCollaborateClick(selectedFolder)}
                  disabled={!selectedFolder}
                >
                  <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Collaborate</span>
                </Button>
                {/* Separator before create actions */}
                {activeTab === 'myFiles' && (
                  <div className="w-px h-6 bg-gray-600 mx-0.5 hidden sm:block" />
                )}
                {/* 4. New Folder */}
                {activeTab === 'myFiles' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-emerald-600 hover:bg-emerald-700 h-8 sm:h-9 text-xs sm:text-sm flex-1 sm:flex-initial"
                    onClick={() => setShowCreateFolder(true)}
                  >
                    <FolderPlus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                    <span className="hidden sm:inline">New Folder</span>
                  </Button>
                )}
                {/* Upload - shown when inside any folder (not root) */}
                {activeTab === 'myFiles' && currentFolderId !== 'root' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-emerald-600 hover:bg-emerald-700 h-8 sm:h-9 text-xs sm:text-sm flex-1 sm:flex-initial"
                    onClick={() => setShowUpload(true)}
                  >
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Upload</span>
                  </Button>
                )}
                {selectedFolder && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-1 h-8 w-8 sm:h-9 sm:w-9 p-0"
                    onClick={() => setSelectedFolder(null)}
                  >
                    <X className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>


          <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Folder</DialogTitle></DialogHeader>
              <div className="py-4">
                <Label htmlFor="folder-name">Folder Name</Label>
                <Input id="folder-name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Enter folder name" />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowCreateFolder(false)} disabled={isMutating}>Cancel</Button>
                <Button onClick={handleCreateFolder} disabled={isMutating}>
                  {isMutating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FolderPlus className="w-4 h-4 mr-2" />
                      Create
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showRenameFolder} onOpenChange={setShowRenameFolder}>
            <DialogContent>
              <DialogHeader><DialogTitle>Rename Folder</DialogTitle></DialogHeader>
              <div className="py-4">
                <Label htmlFor="rename-folder-name">New Name</Label>
                <Input id="rename-folder-name" value={renameFolderName} onChange={(e) => setRenameFolderName(e.target.value)} placeholder="Enter new folder name" />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowRenameFolder(false)} disabled={isMutating}>Cancel</Button>
                <Button onClick={handleRenameFolder} disabled={isMutating}>
                  {isMutating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Rename
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showUpload} onOpenChange={(open) => {
            setShowUpload(open);
            if (!open) {
              setShareExpiryDate(null);
              setWithoutExpiryDate(false);
            }
          }}>
            <DialogContent>
              <DialogHeader><DialogTitle>Upload Document to {currentFolder?.name}</DialogTitle></DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4 py-4">
                <div>
                  <Label htmlFor="file">Select File</Label>
                  <Input id="file" name="file" type="file" required />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="without-expiry"
                      checked={withoutExpiryDate}
                      onCheckedChange={(checked) => {
                        setWithoutExpiryDate(checked);
                        if (checked) {
                          setShareExpiryDate(null);
                        }
                      }}
                    />
                    <Label htmlFor="without-expiry" className="text-sm font-normal cursor-pointer">
                      Without expiry date
                    </Label>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="expiry-date" className="text-right">
                      Expiry Date <span className="text-red-500">*</span>
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className="col-span-3 justify-start text-left font-normal"
                          disabled={withoutExpiryDate}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {shareExpiryDate ? format(shareExpiryDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={shareExpiryDate}
                          onSelect={(date) => {
                            setShareExpiryDate(date);
                            if (date) {
                              setWithoutExpiryDate(false);
                            }
                          }}
                          disabled={(date) => date < new Date().setHours(0, 0, 0, 0)}
                          fromDate={new Date()}
                          fromYear={new Date().getFullYear()}
                          toYear={new Date().getFullYear() + 10}
                          captionLayout="dropdown-buttons"
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" type="button" onClick={() => {
                    setShowUpload(false);
                    setShareExpiryDate(null);
                    setWithoutExpiryDate(false);
                  }} disabled={isMutating}>Cancel</Button>
                  <Button type="submit" disabled={isMutating}>
                    {isMutating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          ) : (
            <div className="relative">
              {isMutating && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
                  <div className="flex flex-col items-center gap-3 bg-gray-900/95 px-6 py-4 rounded-lg border border-gray-700">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <p className="text-white text-sm font-medium">Processing...</p>
                  </div>
                </div>
              )}
              {isRefreshing && !isMutating && (
                <div className="absolute top-2 right-2 z-40 flex items-center gap-2 bg-gray-900/90 px-3 py-1.5 rounded-full border border-gray-700">
                  <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                  <span className="text-xs text-gray-300">Syncing...</span>
                </div>
              )}
              <TabsContent value="myFiles" className="mt-0">
                {renderMyFiles()}
              </TabsContent>

              <TabsContent value="activityLog" className="mt-0">
                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-6 min-h-[500px]">
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-400" />
                    Document Activity Log
                    {user?.role === 'CA_ACCOUNTANT' && realSelectedClientId && (
                      <span className="text-sm font-normal text-gray-400 ml-2">
                        for {clientsForFilter.find(c => c.id === realSelectedClientId)?.name || 'loading...'}
                      </span>
                    )}
                  </h2>
                  <ActivityLog
                    key={`${activeTab}-${realSelectedClientId || 'self'}`}
                    itemType={user?.role === 'CA_ACCOUNTANT' && !realSelectedClientId ? 'user' : 'client'}
                    itemId={user?.role === 'CA_ACCOUNTANT' && !realSelectedClientId ? `${user?.id}/documents` : `${user?.role === 'CA_ACCOUNTANT' ? realSelectedClientId : entityId}/documents`}
                  />
                </div>
              </TabsContent>

              <TabsContent value="sharedWithMe" className="mt-0">
                {renderSharedWithMe()}
              </TabsContent>

              <TabsContent value="renewals" className="mt-0">
                {renderRenewals()}
              </TabsContent>
            </div>
          )}
        </Tabs>
      </motion.div>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-[650px] p-0 bg-gray-900 border-gray-700 [&>button]:hidden">
          {/* Windows-style Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <Share2 className="w-5 h-5 text-white" />
              <DialogTitle className="text-white text-lg font-semibold">Share link</DialogTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <User className="w-4 h-4 text-gray-400" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShareDialogOpen(false)}>
                <X className="w-4 h-4 text-gray-400" />
              </Button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* File Details */}
            {shareDoc && (
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                  {shareDoc.is_folder ? (
                    <Folder className="w-8 h-8 text-white" />
                  ) : (
                    <FileText className="w-8 h-8 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{shareDoc.name}</p>
                  <p className="text-gray-400 text-sm truncate">{shareDoc.is_folder ? 'Folder' : shareDoc.file_type || 'File'}</p>
                </div>
              </div>
            )}

            {/* Share Link */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {isGeneratingLink ? (
                  <div className="flex-1 flex items-center gap-2 text-gray-500 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    Generating secure link...
                  </div>
                ) : (
                  <Input
                    value={shareLink}
                    readOnly
                    className="flex-1 bg-transparent border-none text-white text-sm focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                  />
                )}
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      const linkInput = document.querySelector('input[value="' + shareLink + '"]');
                      if (linkInput) {
                        linkInput.select();
                        document.execCommand('copy');
                      }
                    }}
                    title="View details"
                  >
                    <Grid className="w-4 h-4 text-gray-400" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${linkCopied ? 'text-green-400' : 'text-gray-400'}`}
                    onClick={handleCopyLink}
                    title="Copy link"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Direct Sharing Options */}
            <div className="space-y-3">
              <p className="text-gray-400 text-sm font-medium">Share using</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
                {/* WhatsApp */}
                <button
                  onClick={() => handleShareViaApp('whatsapp')}
                  className="flex flex-col items-center space-y-1 sm:space-y-2 p-2 sm:p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors border border-gray-700"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <span className="text-xs text-gray-300">WhatsApp</span>
                </button>

                {/* Gmail */}
                <button
                  onClick={() => handleShareViaApp('gmail')}
                  className="flex flex-col items-center space-y-1 sm:space-y-2 p-2 sm:p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors border border-gray-700"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-500 flex items-center justify-center">
                    <Mail className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <span className="text-xs text-gray-300">Gmail</span>
                </button>

                {/* Outlook */}
                <button
                  onClick={() => handleShareViaApp('outlook')}
                  className="flex flex-col items-center space-y-1 sm:space-y-2 p-2 sm:p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors border border-gray-700"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500 flex items-center justify-center">
                    <Mail className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <span className="text-xs text-gray-300">Outlook</span>
                </button>

                {/* Microsoft Teams */}
                <button
                  onClick={() => handleShareViaApp('teams')}
                  className="flex flex-col items-center space-y-1 sm:space-y-2 p-2 sm:p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors border border-gray-700"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-500 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <span className="text-xs text-gray-300">Teams</span>
                </button>

                {/* Facebook */}
                <button
                  onClick={() => handleShareViaApp('facebook')}
                  className="flex flex-col items-center space-y-1 sm:space-y-2 p-2 sm:p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors border border-gray-700"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-600 flex items-center justify-center">
                    <Facebook className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <span className="text-xs text-gray-300">Facebook</span>
                </button>

                {/* Twitter */}
                <button
                  onClick={() => handleShareViaApp('twitter')}
                  className="flex flex-col items-center space-y-1 sm:space-y-2 p-2 sm:p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors border border-gray-700"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black flex items-center justify-center">
                    <Twitter className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <span className="text-xs text-gray-300">Twitter</span>
                </button>

                {/* LinkedIn */}
                <button
                  onClick={() => handleShareViaApp('linkedin')}
                  className="flex flex-col items-center space-y-1 sm:space-y-2 p-2 sm:p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors border border-gray-700"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-700 flex items-center justify-center">
                    <Link2 className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <span className="text-xs text-gray-300">LinkedIn</span>
                </button>
              </div>
            </div>

            {/* Email Sharing (Original functionality) */}
            <div className="space-y-3 pt-4 border-t border-gray-700">
              <Label htmlFor="emails" className="text-gray-300">
                Or share via email
              </Label>
              <Input
                id="emails"
                value={shareEmails}
                onChange={(e) => setShareEmails(e.target.value)}
                className="bg-gray-800/50 border-gray-700 text-white"
                placeholder="user1@example.com, user2@example.com"
              />
              <Button onClick={handleConfirmShare} className="w-full">
                <Share2 className="w-4 h-4 mr-2" />
                Share via Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Collaborate Dialog */}
      <Dialog open={collaborateDialogOpen} onOpenChange={setCollaborateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 bg-gray-900 border-gray-700 [&>button]:hidden">
          {/* Windows-style Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-white" />
              <DialogTitle className="text-white text-lg font-semibold">Collaborate</DialogTitle>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
              setCollaborateDialogOpen(false);
              setUserSearchTerm('');
            }}>
              <X className="w-4 h-4 text-gray-400" />
            </Button>
          </div>

          <div className="p-6 space-y-6">
            {/* File/Folder Details */}
            {collaborateDoc && (
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                  {collaborateDoc.is_folder ? (
                    <Folder className="w-8 h-8 text-white" />
                  ) : (
                    <FileText className="w-8 h-8 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{collaborateDoc.name}</p>
                  <p className="text-gray-400 text-sm truncate">{collaborateDoc.is_folder ? 'Folder' : collaborateDoc.file_type || 'File'}</p>
                </div>
              </div>
            )}

            {/* 1. Client Select - only for CA Admin / CA Team roles */}
            {isCARole && (
              <div className="space-y-2">
                <Label>Client (Optional)</Label>
                <Combobox
                  options={clientsForFilter.map(client => ({
                    value: String(client.id),
                    label: client.name
                  }))
                  }
                  value={collabSelectedClientId || 'my-team'}
                  onValueChange={(val) => {
                    setCollabSelectedClientId(val);
                  }}
                  placeholder="Select a client..."
                  searchPlaceholder="Search clients..."
                  emptyText="No clients found."
                />
              </div>
            )}

            {/* 2. User Select */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Collaborator
                {loadingUsers && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
              </Label>
              <Combobox
                options={availableUsers
                  .filter(u => !selectedUsers.some(selected => selected.id === u.id || selected.email === u.email)) // Exclude already selected
                  .map(u => ({
                    value: String(u.id || u.email),
                    label: `${u.name || u.first_name || u.email} ${u.email ? `(${u.email})` : ''}${u._group ? ` [${u._group}]` : ''}`
                  }))
                }
                value="" // Always empty to act as a "picker"
                onValueChange={(val) => {
                  const userToAdd = availableUsers.find(u => String(u.id || u.email) === val);
                  if (userToAdd) {
                    handleUserToggle(userToAdd);
                  }
                }}
                placeholder={
                  loadingUsers
                    ? "Loading users..."
                    : isClientRole
                      ? (availableUsers.length === 0 ? "No users found" : "Select a user to collaborate...")
                      : (collabSelectedClientId && collabSelectedClientId !== 'my-team')
                        ? (availableUsers.length === 0 ? "No users found for this client" : "Select a client user...")
                        : "Select a team member..."
                }
                searchPlaceholder="Search users..."
                emptyText={loadingUsers ? "Loading..." : "No users found."}
                disabled={loadingUsers}
              />
            </div>

            {selectedUsers.length > 0 && (
              <div className="pt-2 border-t border-gray-700">
                <p className="text-sm text-gray-400 mb-2">
                  {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((userItem) => (
                    <div
                      key={userItem.id || userItem.email}
                      className="flex items-center space-x-2 px-3 py-1 bg-blue-500/20 border border-blue-500/50 rounded-full"
                    >
                      <span className="text-sm text-white">
                        {userItem.name || userItem.first_name || userItem.email}
                      </span>
                      <button
                        onClick={() => handleUserToggle(userItem)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <DialogFooter className="flex-row justify-end space-x-2 pt-4 border-t border-gray-700">
              <Button
                variant="outline"
                onClick={() => {
                  setCollaborateDialogOpen(false);
                  setSelectedUsers([]);
                  setCollaborateDoc(null);
                  setUserSearchTerm('');
                }}
                disabled={isMutating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmCollaborate}
                disabled={isMutating || selectedUsers.length === 0 || loadingUsers}
              >
                {isMutating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sharing...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Share with {selectedUsers.length > 0 ? `${selectedUsers.length} ` : ''}User{selectedUsers.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>


      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="sm:max-w-[800px] bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <LayoutTemplate className="w-6 h-6 text-blue-400" />
              Folder Templates
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Create reusable folder structures and apply them to multiple clients at once.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTemplateTab} onValueChange={setActiveTemplateTab} className="w-full mt-4">
            <TabsList className="bg-gray-800/50 w-full sm:w-auto">
              <TabsTrigger value="manage">Manage Templates</TabsTrigger>
              <TabsTrigger value="apply">Apply to Clients</TabsTrigger>
            </TabsList>

            <TabsContent value="manage" className="mt-4 space-y-4">
              {/* Create New Template Section */}
              <div className="p-4 rounded-lg bg-gray-800/20 border border-gray-700 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold text-gray-300">{editingTemplate ? 'Edit Template' : 'Create New Template'}</Label>
                  {editingTemplate && (
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditingTemplate(null);
                      setNewTemplateName('');
                      setNewTemplateFolders([{ name: '', subfolders: [] }]);
                    }}>
                      <X className="w-4 h-4 mr-1" /> Cancel
                    </Button>
                  )}
                </div>
                <div className="grid gap-4">
                  <div>
                    <Input
                      placeholder="Template Name (e.g., Audit 2024)"
                      className="bg-gray-800 border-gray-700 text-white"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs text-gray-400">Folder Structure</Label>

                    {/* Parent folders with subfolders */}
                    {newTemplateFolders.map((parentFolder, parentIdx) => (
                      <div key={parentIdx} className="p-3 rounded-lg bg-gray-800/50 border border-gray-700 space-y-2">
                        {/* Parent folder input */}
                        <div className="flex gap-2 items-center">
                          <Folder className="w-4 h-4 text-blue-400 shrink-0" />
                          <Input
                            placeholder="Parent Folder (e.g., Financial)"
                            className="bg-gray-900 border-gray-700 text-white flex-1"
                            value={parentFolder.name}
                            onChange={(e) => {
                              const updated = [...newTemplateFolders];
                              updated[parentIdx].name = e.target.value;
                              setNewTemplateFolders(updated);
                            }}
                          />
                          {newTemplateFolders.length > 1 && (
                            <Button variant="ghost" size="icon" onClick={() => {
                              const updated = newTemplateFolders.filter((_, i) => i !== parentIdx);
                              setNewTemplateFolders(updated);
                            }}>
                              <X className="w-4 h-4 text-gray-500 hover:text-red-400" />
                            </Button>
                          )}
                        </div>

                        {/* Subfolders */}
                        <div className="ml-6 space-y-2 border-l-2 border-gray-700 pl-3">
                          {parentFolder.subfolders.map((subfolder, subIdx) => (
                            <div key={subIdx} className="flex gap-2 items-center">
                              <ChevronRight className="w-3 h-3 text-gray-500 shrink-0" />
                              <Input
                                placeholder="Subfolder name"
                                className="bg-gray-900 border-gray-600 text-white text-sm flex-1"
                                value={subfolder}
                                onChange={(e) => {
                                  const updated = [...newTemplateFolders];
                                  updated[parentIdx].subfolders[subIdx] = e.target.value;
                                  setNewTemplateFolders(updated);
                                }}
                              />
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                const updated = [...newTemplateFolders];
                                updated[parentIdx].subfolders = updated[parentIdx].subfolders.filter((_, i) => i !== subIdx);
                                setNewTemplateFolders(updated);
                              }}>
                                <X className="w-3 h-3 text-gray-500 hover:text-red-400" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-gray-400 hover:text-white h-7"
                            onClick={() => {
                              const updated = [...newTemplateFolders];
                              updated[parentIdx].subfolders.push('');
                              setNewTemplateFolders(updated);
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add Subfolder
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Add Parent Folder button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-dashed text-gray-400 hover:text-white"
                      onClick={() => setNewTemplateFolders([...newTemplateFolders, { name: '', subfolders: [] }])}
                    >
                      <FolderPlus className="w-3 h-3 mr-1" /> Add Parent Folder
                    </Button>
                  </div>
                  <Button
                    className="w-full sm:w-auto ml-auto bg-blue-600 hover:bg-blue-700"
                    disabled={!newTemplateName.trim() || newTemplateFolders.every(f => !f.name.trim()) || isLoadingTemplates}
                    onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                  >
                    {isLoadingTemplates && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingTemplate ? 'Update Template' : 'Create Template'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Existing Templates - Right */}
                {templates.map(template => (
                  <div key={template.id} className="p-4 rounded-lg bg-gray-800 border border-gray-700 relative group flex flex-col">
                    <h3 className="font-semibold text-lg text-white mb-2">{template.name}</h3>
                    <div className="space-y-1 mb-4 flex-1">
                      {(template.folders || []).slice(0, 5).map((f, i) => (
                        <div key={i} className={`flex items-center gap-2 text-sm text-gray-400 ${f.includes('/') ? 'ml-4' : ''}`}>
                          <Folder className="w-3 h-3" /> {f.includes('/') ? f.split('/')[1].trim() : f}
                          {f.includes('/') && <span className="text-xs text-gray-600">(in {f.split('/')[0].trim()})</span>}
                        </div>
                      ))}
                      {(template.folders || []).length > 5 && (
                        <div className="text-xs text-gray-500 pl-5">
                          + {(template.folders || []).length - 5} more...
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-auto pt-4 border-t border-gray-700/50">
                      <Button size="sm" variant="destructive" className="w-10 px-0 bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-900/50" onClick={() => handleDeleteTemplate(template.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="w-10 px-0 border-gray-600 hover:bg-gray-700 text-gray-300" onClick={() => {
                        // Parse flat "Parent / Child" format back to nested structure
                        const parseFoldersToNested = (folders) => {
                          const parentMap = new Map(); // parentName -> subfolders[]

                          folders.forEach(f => {
                            if (f.includes('/')) {
                              const [parent, child] = f.split('/').map(s => s.trim());
                              if (!parentMap.has(parent)) {
                                parentMap.set(parent, []);
                              }
                              parentMap.get(parent).push(child);
                            } else {
                              if (!parentMap.has(f.trim())) {
                                parentMap.set(f.trim(), []);
                              }
                            }
                          });

                          return Array.from(parentMap.entries()).map(([name, subfolders]) => ({
                            name,
                            subfolders
                          }));
                        };

                        const nestedFolders = parseFoldersToNested(template.folders || []);
                        setEditingTemplate({ id: template.id, name: template.name, folders: [...(template.folders || [])] });
                        setNewTemplateName(template.name);
                        setNewTemplateFolders(nestedFolders.length > 0 ? nestedFolders : [{ name: '', subfolders: [] }]);
                      }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => {
                        setSelectedTemplateForApply(template.id);
                        setActiveTemplateTab('apply');
                      }}>Use Template</Button>
                    </div>
                  </div>
                ))}
                {templates.length === 0 && !isLoadingTemplates && (
                  <div className="col-span-1 md:col-span-2 text-center py-8 text-gray-500 italic">
                    No templates found. Create one above.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="apply" className="mt-4">
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label>1. Select Template</Label>
                  {/* Show selected template prominently, hide unselected ones */}
                  {selectedTemplateForApply ? (
                    <div className="space-y-3">
                      {(() => {
                        const selected = templates.find(t => t.id === selectedTemplateForApply);
                        if (!selected) return null;
                        return (
                          <div className="p-4 rounded-md border bg-blue-500/20 border-blue-500 ring-2 ring-blue-500/30">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-blue-400">{selected.name}</div>
                                <div className="text-xs mt-1 text-gray-400">{(selected.folders || []).length} folders</div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-gray-400 hover:text-white h-8"
                                onClick={() => setSelectedTemplateForApply(null)}
                              >
                                <X className="w-3 h-3 mr-1" /> Change
                              </Button>
                            </div>
                            {/* Show folder preview */}
                            {(selected.folders || []).length > 0 && (
                              <div className="mt-3 pt-3 border-t border-blue-500/30 flex flex-wrap gap-2">
                                {(selected.folders || []).map((f, i) => (
                                  <span key={i} className="text-xs bg-blue-500/10 text-blue-300 px-2 py-1 rounded">
                                    {f}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {templates.map(template => (
                        <div
                          key={template.id}
                          onClick={() => setSelectedTemplateForApply(template.id)}
                          className="cursor-pointer p-3 rounded-md border bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 text-center transition-all"
                        >
                          <div className="font-medium">{template.name}</div>
                          <div className="text-xs mt-1 opacity-70">{(template.folders || []).length} folders</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Label>2. Select Clients ({selectedClientsForTemplate.length})</Label>
                  {/* Search clients */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search clients..."
                      className="pl-9 h-9 bg-gray-800 border-gray-700 text-white text-sm"
                      value={templateClientSearch || ''}
                      onChange={(e) => setTemplateClientSearch(e.target.value)}
                    />
                  </div>
                  <div className="h-[200px] overflow-y-auto border border-gray-700 rounded-md bg-gray-800/50 p-2 space-y-1 custom-scrollbar">
                    {clientsForFilter
                      .filter(client => !templateClientSearch || client.name.toLowerCase().includes(templateClientSearch.toLowerCase()))
                      .map(client => {
                        const isSelected = selectedClientsForTemplate.includes(client.id);
                        return (
                          <div
                            key={client.id}
                            className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition-colors ${isSelected ? 'bg-blue-500/10 hover:bg-blue-500/15' : 'hover:bg-white/5'}`}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedClientsForTemplate(prev => prev.filter(id => id !== client.id));
                              } else {
                                setSelectedClientsForTemplate(prev => [...prev, client.id]);
                              }
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              className="pointer-events-none"
                            />
                            <span className="text-sm font-medium leading-none flex-1">
                              {client.name}
                            </span>
                          </div>
                        );
                      })}
                    {clientsForFilter.filter(client => !templateClientSearch || client.name.toLowerCase().includes(templateClientSearch.toLowerCase())).length === 0 && (
                      <div className="text-center py-4 text-gray-500 text-sm">No clients found.</div>
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 px-1">
                    <span className="cursor-pointer hover:text-white" onClick={() => setSelectedClientsForTemplate(clientsForFilter.map(c => c.id))}>Select All</span>
                    <span className="cursor-pointer hover:text-white" onClick={() => setSelectedClientsForTemplate([])}>Clear Selection</span>
                  </div>
                </div>

                <DialogFooter className="border-t border-gray-800 pt-4">
                  <Button variant="ghost" onClick={() => setShowTemplates(false)}>Cancel</Button>
                  <Button className="bg-green-600 hover:bg-green-700" disabled={!selectedTemplateForApply || selectedClientsForTemplate.length === 0 || isLoadingTemplates} onClick={handleApplyTemplate}>
                    {isLoadingTemplates ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                    Apply & Create Folders
                  </Button>
                </DialogFooter>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      {
        previewFile && (


          <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
            <DialogContent className="max-w-3xl w-[95vw] sm:w-full">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">{previewFile.name}</DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                <iframe src={previewFile.url} className="w-full h-[400px] sm:h-[500px] md:h-[600px]" title={previewFile.name} />
              </div>
            </DialogContent>
          </Dialog>
        )
      }
    </div >
  );
};

export default Documents;
