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
import { FileText, Upload, Trash2, Plus, Share2, Folder, FolderPlus, ArrowLeft, Search, Loader2, RefreshCw, Inbox, CalendarIcon, Download, Copy, X, User, Link2, Grid, Phone, Mail, MessageCircle, Facebook, Twitter, MoreVertical, Users, UserPlus, Check, ChevronsUpDown } from 'lucide-react';

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
import { getDocuments, createFolder, uploadFile, deleteDocument, shareDocument, viewFile, getSharedDocuments, listClients, createCAFolder, uploadCAFile, shareFolder, listOrgUsers, listTeamMembers, FINANCE_API_BASE_URL } from '@/lib/api';
import { createPublicShareTokenDocument, createPublicShareTokenFolder } from '@/lib/api/documents';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';

import { format } from 'date-fns';

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
  // const [currentFolderId, setCurrentFolderId] = useState('root'); // Removed: Initialized above
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
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
  const [activeTab, setActiveTab] = useState('myFiles'); // 'myFiles' or 'sharedWithMe'
  const [clientsForFilter, setClientsForFilter] = useState([]);
  const [isClientsLoading, setIsClientsLoading] = useState(false);
  // const [realSelectedClientId, setRealSelectedClientId] = useState(null); // Removed: Initialized above
  const [openClientCombobox, setOpenClientCombobox] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [collabSelectedClientId, setCollabSelectedClientId] = useState(null); // 'my-team' or client ID

  // Initialize collabSelectedClientId when user changes
  useEffect(() => {
    if (user?.role === 'CA_ACCOUNTANT' && realSelectedClientId) {
      setCollabSelectedClientId(realSelectedClientId);
    } else if (user?.role === 'CA_ACCOUNTANT' || user?.role === 'AGENCY_ADMIN' || user?.role === 'CA_TEAM') {
      setCollabSelectedClientId('my-team');
    } else {
      // For Client Users/Admins, we default to their first organization/entity if available, or 'my-org' sentinel
      // However, listOrgUsers usually takes an Org ID. 
      // We need to know the Org ID.
      // Assuming user object has it or we can derive it.
      // For now, let's leave it null to trigger a "select" state or better:
      // If we want "show client user of its own entity", we should probably set it to the entity ID they are viewing if available?
      // But the dropdown expects a Client ID (Entity ID).
      // Let's set it to user.entity_id or similar if available?
      // Wait, the hook `list_all_client_users` returns users from accessible orgs.
      // But `Documents.jsx` uses `listOrgUsers` which takes `collabSelectedClientId` (as org ID).
      // Let's see if we can get the org ID from `user` state.

      // Strategy: If Client User, rely on the useEffect that fetches users to detect "Self Org" mode?
      // Actually, looking at `Documents.jsx` below (I need to read more context or just logic):
      // There is a `fetchCollabUsers` function.
      // It checks `if (!collabSelectedClientId || collabSelectedClientId === 'my-team')`.
      // If I set it to a special value 'self-org' maybe?
      // Or if I just set it to `entityId` if available?
      if (entityId) {
        setCollabSelectedClientId(entityId);
      }
    }
  }, [user, realSelectedClientId, entityId]);


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
    } else {
      fetchSharedDocuments();
    }
  }, [fetchDocuments, fetchSharedDocuments, activeTab, realSelectedClientId, user?.role, user?.access_token, entityId]);

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

  // Check if selected folder is empty (for delete button state)
  const isSelectedFolderEmpty = useMemo(() => {
    if (!selectedFolder) return true;
    const folder = findFolder(documentsState, selectedFolder.id);
    return folder ? isFolderEmpty(folder) : true;
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
      // Refresh in background (non-blocking) to ensure sync
      fetchDocuments(true).catch(err => console.error('Background refresh failed:', err));
    } catch (error) {
      // Revert optimistic update on error
      setDocumentsState(prev => {
        const removeTempFolder = (node) => {
          if (node.id === currentFolderId && node.children) {
            return {
              ...node,
              children: node.children.filter(child => child.id !== tempFolderId)
            };
          }
          if (node.is_folder && node.children) {
            return { ...node, children: node.children.map(removeTempFolder) };
          }
          return node;
        };
        return removeTempFolder(prev);
      });
      toast({ title: "Creation Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    // Check if trying to delete a folder that is not empty
    if (itemToDelete.type === 'folder') {
      const folder = findFolder(documentsState, itemToDelete.id);
      if (folder && !isFolderEmpty(folder)) {
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

  // Effect to fetch users for collaborate modal based on selected client
  useEffect(() => {
    if (!collaborateDialogOpen) return;

    const fetchCollabUsers = async () => {
      setLoadingUsers(true);
      setAvailableUsers([]);

      try {
        let users = [];

        // CASE 1: My Team (Agency) - when NO client selected
        if (!collabSelectedClientId || collabSelectedClientId === 'my-team') {
          if (['CLIENT_USER', 'CLIENT_MASTER_ADMIN', 'ENTITY_USER'].includes(user?.role)) {
            // For Client Users, "My Team" means their organization users (colleagues)
            try {
              const clientUsers = await listAllClientUsers(user.access_token);
              // listAllClientUsers returns { joined_users: [...] } or list?
              // Looking at index.js/organisation.js, listAllClientUsers returns response directly via handleResponse.
              // organisation.js: listAllClientUsers -> fetch /entities/all-client-users
              // entities.py: list_all_client_users returns list(unique_users.values()) -> Array of user objects
              if (Array.isArray(clientUsers)) {
                users = clientUsers;
              }
            } catch (clientError) {
              console.error('Failed to fetch client users:', clientError);
              toast({ title: 'Error', description: 'Failed to fetch users.', variant: 'destructive' });
            }
          } else {
            // For CA/Agency, fetch CA Team Members
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
        }
        // CASE 2: Client Selected - fetch that client's organization users
        else {
          const client = clientsForFilter.find(c => c.id === collabSelectedClientId);
          if (client && client.organization_id) {
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
              console.error('Failed to fetch org users:', orgError);
              toast({ title: 'Error', description: 'Failed to fetch client users.', variant: 'destructive' });
            }
          } else {
            // Fallback if no org ID (shouldn't happen for valid clients usually)
            console.warn('Selected client has no organization_id', client);
          }
        }

        // Normalize users
        const normalizedUsers = users.map(u => ({
          id: u.id || u.user_id || u.email,
          email: u.email || u.user_email,
          name: u.name || u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
          first_name: u.first_name,
          last_name: u.last_name
        })).filter(u => u.email && u.email !== user.email);

        setAvailableUsers(normalizedUsers);
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
    } else {
      fetchSharedDocuments(true);
    }
  };

  const renderMyFiles = () => {
    const isSubFolder = currentPath.length > 2;
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
                  <div className="relative mb-2">
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
                  <div className="w-full text-center px-1">
                    <p className={`text-xs sm:text-sm truncate transition-colors ${isSelected ? 'text-blue-300 font-semibold' : 'text-white group-hover:text-blue-300'
                      }`}>{item.name}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Documents - Table format in subfolders, grid format in main folders */}
        {isSubFolder && documents.length > 0 && (
          <div className="mt-4 sm:mt-8 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-400 text-xs sm:text-sm">FILE NAME</TableHead>
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
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Documents - Grid format in main folders (when not in subfolder) */}
        {!isSubFolder && documents.length > 0 && (
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
        )}

        {/* Empty state */}
        {filteredChildren.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">{searchTerm ? 'No items found matching your search.' : 'This folder is empty.'}</p>
            {currentFolderId !== 'root' && !searchTerm && (
              <Button
                variant="outline"
                onClick={() => {
                  handleClientChange(null);
                  setSearchTerm('');
                  setClientsForFilter([]); // Resetting clients filter might be safer or not needed? Let's just reset the ID.
                  if (activeTab !== 'myFiles') setActiveTab('myFiles');
                }}
              >
                Back to My Documents
              </Button>
            )}
          </div>
        )}
      </>
    );
  };

  const renderSharedWithMe = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2 sm:gap-4">
      {sharedDocuments.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.05 }}
          className="flex flex-col items-center cursor-pointer group relative"
          onDoubleClick={() => handleView(item)}
        >
          <div className="relative mb-2">
            {item.is_folder ? (
              <FolderIcon
                className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 transition-transform group-hover:scale-110"
                hasExpired={hasExpiredDocuments(item)}
              />
            ) : (
              <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 transition-transform group-hover:scale-110">
                <FileText className="w-12 h-12 sm:w-16 sm:h-16 md:w-18 md:h-18 lg:w-20 lg:h-20 text-white" />
              </div>
            )}
            {/* Action buttons on hover */}
            <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 sm:gap-1">
              <Button
                size="icon"
                variant="secondary"
                className="h-6 w-6 sm:h-7 sm:w-7 bg-gray-800/90 hover:bg-gray-700"
                onClick={(e) => { e.stopPropagation(); handleView(item) }}
              >
                <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="h-6 w-6 sm:h-7 sm:w-7 bg-gray-800/90 hover:bg-gray-700"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDocumentClick(item);
                }}
              >
                <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </Button>
            </div>
          </div>
          <div className="w-full text-center px-1">
            <p className="text-xs sm:text-sm text-white truncate group-hover:text-blue-300 transition-colors" title={item.name}>{item.name}</p>
            {item.owner_email && (
              <p className="text-xs text-gray-400 mt-1 truncate hidden sm:block">Shared by: {item.owner_email}</p>
            )}
            {!item.owner_email && (
              <p className="text-xs text-gray-400 mt-1 truncate hidden sm:block italic">Shared by unknown</p>
            )}
          </div>
        </motion.div>
      ))}
      {sharedDocuments.length === 0 && (
        <div className="text-center py-12 col-span-full">
          <p className="text-gray-400 text-sm sm:text-base">{searchTerm ? 'No shared items found matching your search.' : 'No items have been shared with you.'}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8" onClick={() => setSelectedFolder(null)}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white">Documents</h1>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 w-full xl:w-auto flex-wrap justify-end">
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <Input placeholder="Search..." className="pl-9 sm:pl-12 h-9 sm:h-10 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
            {activeTab === 'myFiles' && (
              <div className="flex items-center gap-2">
                <Button onClick={() => setShowCreateFolder(true)} variant="outline" className="h-9 sm:h-10 text-sm sm:text-base flex-1 sm:flex-initial">
                  <FolderPlus className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Folder</span>
                </Button>
                {currentFolderId !== 'root' && currentPath.length > 2 && (
                  <Button onClick={() => setShowUpload(true)} className="h-9 sm:h-10 text-sm sm:text-base flex-1 sm:flex-initial">
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Upload</span>
                  </Button>
                )}
              </div>
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

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 sm:mb-8">
          <div className="flex space-x-1 bg-black/20 p-1 rounded-lg w-full sm:w-auto">
            <Button variant={activeTab === 'myFiles' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('myFiles')} className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm flex-1 sm:flex-initial">
              <Folder className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>My Files</span>
            </Button>
            <Button variant={activeTab === 'sharedWithMe' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('sharedWithMe')} className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm flex-1 sm:flex-initial">
              <Inbox className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Shared with me</span>
              <span className="xs:hidden">Shared</span>
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 w-full lg:w-auto">
            {/* Action buttons - Always visible, enabled when folder is selected */}
            <div className="flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 bg-gray-800/50 rounded-lg border border-gray-700 flex-wrap" onClick={(e) => e.stopPropagation()}>
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
                    disabled={!selectedFolder || !isSelectedFolderEmpty}
                    title={selectedFolder && !isSelectedFolderEmpty ? "Cannot delete folder with contents" : ""}
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
                {isMutating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create
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
                  {isMutating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Upload
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
            {activeTab === 'myFiles' ? renderMyFiles() : renderSharedWithMe()}
          </div>
        )}
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

            {/* 1. Client Select */}
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
                    label: `${u.name || u.first_name || u.email} ${u.email ? `(${u.email})` : ''}`
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
