import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Upload, Trash2, Plus, Share2, Folder, FolderPlus, ArrowLeft, Search, Loader2, RefreshCw, Inbox, CalendarIcon, Download, Copy, X, User, Link2, Grid, Phone, Mail, MessageCircle, Facebook, Twitter } from 'lucide-react';

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
    <div className={className} style={{ position: 'relative', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}>
        {/* Folder shadow */}
        <ellipse cx="36" cy="58" rx="28" ry="4" fill="#000000" opacity="0.15" />
        
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
import { getDocuments, createFolder, uploadFile, deleteDocument, shareDocument, viewFile, getSharedDocuments, listOrganisations, listAllEntities, createCAFolder, uploadCAFile, shareFolder, FINANCE_API_BASE_URL } from '@/lib/api';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';

const buildFileTree = (folders, documents) => {
  const root = { id: 'root', name: 'Root', is_folder: true, children: [] };
  const allItems = {};

  folders.forEach(folder => {
    allItems[folder.id] = { ...folder, is_folder: true, children: [] };
  });

  documents.forEach(doc => {
    allItems[doc.id] = { ...doc, is_folder: false };
  });

  folders.forEach(folder => {
    if (folder.parent_id && allItems[folder.parent_id]) {
      allItems[folder.parent_id].children.push(allItems[folder.id]);
    } else {
      root.children.push(allItems[folder.id]);
    }
    if (folder.documents) {
      folder.documents.forEach(doc => {
        allItems[folder.id].children.push({ ...doc, is_folder: false });
      });
    }
  });

  documents.forEach(doc => {
    if (!doc.folder_id) {
      root.children.push({ ...doc, is_folder: false });
    }
  });

  return root;
};


const findPath = (root, id) => {
  const path = [];
  function search(node) {
    if (node.id === id) {
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

const Documents = ({ entityId, quickAction, clearQuickAction }) => {
  const { user } = useAuth();
  
  const getInitialEntityId = () => {
    if (user?.role === 'CA_ACCOUNTANT') return 'all';
    return entityId;
  };

  const [documentsState, setDocumentsState] = useState({ id: 'root', name: 'Root', is_folder: true, children: [] });
  const [sharedDocuments, setSharedDocuments] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState('root');
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
  const [shareLink, setShareLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('myFiles'); // 'myFiles' or 'sharedWithMe'
  const [currentClientId, setCurrentClientId] = useState(getInitialEntityId());
  const [organisations, setOrganisations] = useState([]);
  const [entitiesForFilter, setEntitiesForFilter] = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState('all');

  useEffect(() => {
    if (quickAction === 'upload-document') {
      setShowUpload(true);
      clearQuickAction();
    }
  }, [quickAction, clearQuickAction]);

  useEffect(() => {
    const fetchOrgs = async () => {
      if (user?.role === 'CA_ACCOUNTANT' && user?.access_token) {
        try {
          const orgs = await listOrganisations(user.access_token);
          setOrganisations(orgs || []);
        } catch (error) {
          toast({
            title: 'Error fetching organisations',
            description: error.message,
            variant: 'destructive',
          });
        }
      }
    };
    fetchOrgs();
  }, [user, toast]);

  useEffect(() => {
    const fetchEntities = async () => {
      if (user?.role === 'CA_ACCOUNTANT' && currentClientId !== 'all' && user?.access_token) {
        try {
          const allEntities = await listEntities(currentClientId, user.access_token);
          setEntitiesForFilter(allEntities);
        } catch (error) {
          toast({
            title: 'Error fetching entities',
            description: error.message,
            variant: 'destructive',
          });
          setEntitiesForFilter([]);
        }
      } else {
        setEntitiesForFilter([]);
      }
    };
    fetchEntities();
    setSelectedEntityId('all');
  }, [currentClientId, user, toast]);

  const fetchDocuments = useCallback(async (isRefresh = false) => {
    let entityToFetch = null;
    if (user?.role === 'CA_ACCOUNTANT') {
        entityToFetch = selectedEntityId !== 'all' ? selectedEntityId : (currentClientId !== 'all' ? currentClientId : null);
    } else {
        entityToFetch = entityId;
    }

    if (isRefresh) {
        setIsRefreshing(true);
    } else {
        setIsLoading(true);
    }
    try {
        const data = await getDocuments(entityToFetch, user.access_token);
        const fileTree = buildFileTree(data.folders || [], data.documents || []);
        setDocumentsState(fileTree);
    } catch (error) {
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
  }, [currentClientId, selectedEntityId, user, entityId, toast]);

  const fetchSharedDocuments = useCallback(async (isRefresh = false) => {
    if (!user?.access_token) return;
     if (isRefresh) {
        setIsRefreshing(true);
    } else {
        setIsLoading(true);
    }
    try {
      const data = await getSharedDocuments(user.access_token, user.role, entityId);
      const combinedShared = [
        ...(data.documents || []).map(d => ({ ...d, is_folder: false })),
        ...(data.folders || []).map(f => ({ ...f, is_folder: true }))
      ];
      setSharedDocuments(combinedShared);
    } catch (error) {
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
  }, [user?.access_token, user?.role, entityId, toast]);

  useEffect(() => {
    if (activeTab === 'myFiles') {
      fetchDocuments();
    } else {
      fetchSharedDocuments();
    }
  }, [fetchDocuments, fetchSharedDocuments, activeTab, currentClientId, selectedEntityId]);

  const currentPath = useMemo(() => findPath(documentsState, currentFolderId), [documentsState, currentFolderId]);
  const currentFolder = currentPath[currentPath.length - 1];

  const filteredChildren = useMemo(() => {
    if (activeTab === 'sharedWithMe') {
        let itemsToFilter = sharedDocuments;
        if (user?.role === 'CA_ACCOUNTANT') {
            if (selectedEntityId !== 'all') {
                // Assuming shared items might have an entity_id, if not this won't work
                // The current API doesn't seem to support this, so we filter by org
                itemsToFilter = sharedDocuments.filter(item => item.organization_id === currentClientId);
            } else if (currentClientId !== 'all') {
                itemsToFilter = sharedDocuments.filter(item => item.organization_id === currentClientId);
            }
        }
        if (!searchTerm) return itemsToFilter;
        return itemsToFilter.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    if (!currentFolder || !currentFolder.children) return [];
if (activeTab === 'myFiles') {
    // Exclude shared documents from "My Files" for all roles
    return currentFolder.children.filter(item => {
        if (user?.role === 'CA_ACCOUNTANT') {
            return !sharedDocuments.some(shared => shared.id === item.id);
        }
        return !sharedDocuments.some(shared => shared.id === item.id);
    });
}
    if (!searchTerm) return currentFolder.children;
    return currentFolder.children.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [currentFolder, searchTerm, activeTab, sharedDocuments, user?.role, currentClientId, selectedEntityId]);

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

    // Optimistic update - add file immediately to UI
    const tempDocId = `temp-${Date.now()}`;
    const newDocument = {
      id: tempDocId,
      name: file.name,
      is_folder: false,
      file_type: file.type || 'Unknown',
      size: file.size,
      expiry_date: shareExpiryDate ? shareExpiryDate.toISOString().split('T')[0] : null,
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
        if (user?.role === 'CA_ACCOUNTANT') {
            createdDocument = await uploadCAFile(currentFolderId, file, shareExpiryDate, user.access_token);
        } else {
            createdDocument = await uploadFile(currentFolderId, entityId, file, shareExpiryDate, user.access_token);
        }
        
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
        // Refresh in background to sync with server
        fetchDocuments(true);
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
        const createdFolder = user?.role === 'CA_ACCOUNTANT'
          ? await createCAFolder(newFolderName, currentFolderId, user.access_token)
          : await createFolder(newFolderName, entityId, currentFolderId, user.agency_id, user.access_token);
        
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
        // Refresh in background to ensure sync
        fetchDocuments(true);
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
    setIsMutating(true);
    try {
        await deleteDocument(itemToDelete.id, itemToDelete.type, user.access_token);
        toast({ title: "Item Deleted", description: "The selected item has been removed." });
        if (activeTab === 'myFiles') {
          fetchDocuments(true);
        } else {
          fetchSharedDocuments(true);
        }
    } catch (error) {
        toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
    } finally {
      setItemToDelete(null);
      setIsMutating(false);
    }
  };

  const handleShareClick = (doc) => {
    setShareDoc(doc);
    // Generate shareable link - using the API endpoint for viewing the document
    const baseUrl = FINANCE_API_BASE_URL.replace('/api', '');
    const link = `${baseUrl}/api/documents/${doc.id}`;
    setShareLink(link);
    setLinkCopied(false);
    setShareEmails(''); // Reset emails when opening dialog
    setShareDialogOpen(true);
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
    
    switch(appName) {
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
      setCurrentFolderId(doc.id);
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
  
  const renderMyFiles = () => (
    <>
      <div className="flex items-center space-x-2 text-gray-400 mb-8">
        {currentFolderId !== 'root' && currentPath.length > 1 && (
          <Button variant="ghost" size="sm" onClick={() => setCurrentFolderId(currentPath[currentPath.length - 2].id)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        )}
        {currentPath.map((folder, index) => (
          <React.Fragment key={folder.id}>
            <span onClick={() => setCurrentFolderId(folder.id)} className="cursor-pointer hover:text-white transition-colors">{folder.name}</span>
            {index < currentPath.length - 1 && <span className="text-gray-600">/</span>}
          </React.Fragment>
        ))}
      </div>
       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
        {filteredChildren.map((item, index) => (
            <motion.div 
              key={item.id} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="flex flex-col items-center cursor-pointer group relative"
              onDoubleClick={item.is_folder ? () => setCurrentFolderId(item.id) : () => handleView(item)}
            >
              <div className="relative mb-2">
                {item.is_folder ? (
                  <FolderIcon 
                    className="w-24 h-24 transition-transform group-hover:scale-110" 
                    hasExpired={hasExpiredDocuments(item)}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-xl flex items-center justify-center bg-gradient-to-br from-sky-500 to-indigo-500 transition-transform group-hover:scale-110">
                    <FileText className="w-12 h-12 text-white" />
                  </div>
                )}
                {/* Action buttons on hover */}
                <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button 
                    size="icon" 
                    variant="secondary" 
                    className="h-7 w-7 bg-gray-800/90 hover:bg-gray-700"
                    onClick={(e) => {e.stopPropagation(); handleShareClick(item)}}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </Button>
                  {!item.is_folder && (
                    <Button 
                      size="icon" 
                      variant="secondary" 
                      className="h-7 w-7 bg-gray-800/90 hover:bg-gray-700"
                      onClick={(e) => {e.stopPropagation(); handleView(item)}}
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        size="icon" 
                        variant="secondary" 
                        className="h-7 w-7 bg-red-600/90 hover:bg-red-700"
                        onClick={(e) => {e.stopPropagation(); setItemToDelete({id: item.id, type: item.is_folder ? 'folder' : 'document'})}}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
                        <AlertDialogCancel onClick={(e) => {e.stopPropagation(); setItemToDelete(null)}} disabled={isMutating}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => {e.stopPropagation(); handleDelete()}} disabled={isMutating}>
                          {isMutating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="w-full text-center px-1">
                <p className="text-sm text-white truncate group-hover:text-blue-300 transition-colors">{item.name}</p>
                {!item.is_folder && (
                  <p className="text-xs text-gray-400 mt-1 truncate">{item.file_type} • {item.size ? `${(item.size / 1024 / 1024).toFixed(2)} MB` : ''}</p>
                )}
              </div>
            </motion.div>
        ))}
        {filteredChildren.length === 0 && (
            <div className="text-center py-12 col-span-full">
            <p className="text-gray-400">{searchTerm ? 'No items found matching your search.' : 'This folder is empty.'}</p>
            </div>
        )}
        </div>
    </>
  );

  const renderSharedWithMe = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
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
                className="w-24 h-24 transition-transform group-hover:scale-110" 
                hasExpired={hasExpiredDocuments(item)}
              />
            ) : (
              <div className="w-24 h-24 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 transition-transform group-hover:scale-110">
                <FileText className="w-12 h-12 text-white" />
              </div>
            )}
            {/* Action buttons on hover */}
            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <Button 
                size="icon" 
                variant="secondary" 
                className="h-7 w-7 bg-gray-800/90 hover:bg-gray-700"
                onClick={(e) => { e.stopPropagation(); handleView(item) }}
              >
                <FileText className="w-3.5 h-3.5" />
              </Button>
              <a href={`${FINANCE_API_BASE_URL}/api/documents/${item.id}`} download={item.name} onClick={(e) => e.stopPropagation()}>
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="h-7 w-7 bg-gray-800/90 hover:bg-gray-700"
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
              </a>
            </div>
          </div>
          <div className="w-full text-center px-1">
            <p className="text-sm text-white truncate group-hover:text-blue-300 transition-colors">{item.name}</p>
            <p className="text-xs text-gray-400 mt-1 truncate">Shared by: {item.owner_email}</p>
          </div>
        </motion.div>
      ))}
      {sharedDocuments.length === 0 && (
        <div className="text-center py-12 col-span-full">
          <p className="text-gray-400">{searchTerm ? 'No shared items found matching your search.' : 'No items have been shared with you.'}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-5xl font-bold text-white">Documents</h1>
          <div className="flex items-center space-x-2 w-full md:w-auto">
             <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
             <div className="relative w-full md:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input placeholder="Search..." className="pl-12" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            {activeTab === 'myFiles' && (
              <>
                <Button onClick={() => setShowCreateFolder(true)} variant="outline">
                  <FolderPlus className="w-5 h-5 mr-2" /> Folder
                </Button>
                {currentFolderId !== 'root' && (
                  <Button onClick={() => setShowUpload(true)}>
                    <Plus className="w-5 h-5 mr-2" /> Upload
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mb-8">
            <div className="flex space-x-1 bg-black/20 p-1 rounded-lg">
                <Button variant={activeTab === 'myFiles' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('myFiles')} className="flex items-center space-x-2">
                    <Folder className="w-4 h-4" />
                    <span>My Files</span>
                </Button>
                <Button variant={activeTab === 'sharedWithMe' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('sharedWithMe')} className="flex items-center space-x-2">
                    <Inbox className="w-4 h-4" />
                    <span>Shared with me</span>
                </Button>
            </div>
            
            {user?.role === 'CA_ACCOUNTANT' && (
                <div className="flex items-center space-x-2">
                    <div className="w-64">
                        <Select value={currentClientId} onValueChange={setCurrentClientId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Client" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Clients</SelectItem>
                                {organisations.map(org => (
                                    <SelectItem key={org.id} value={org.id}>
                                        {org.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {currentClientId !== 'all' && entitiesForFilter.length > 0 && (
                        <div className="w-64">
                            <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Entity" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Entities</SelectItem>
                                    {entitiesForFilter.map(entity => (
                                        <SelectItem key={entity.id} value={entity.id}>
                                            {entity.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            )}
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

        <Dialog open={showUpload} onOpenChange={setShowUpload}>
            <DialogContent>
                <DialogHeader><DialogTitle>Upload Document to {currentFolder?.name}</DialogTitle></DialogHeader>
                <form onSubmit={handleUpload} className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="file">Select File</Label>
                        <Input id="file" name="file" type="file" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="expiry-date" className="text-right">
                        Expiry Date
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className="col-span-3 justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {shareExpiryDate ? format(shareExpiryDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={shareExpiryDate}
                            onSelect={setShareExpiryDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <DialogFooter>
                       <Button variant="ghost" type="button" onClick={() => setShowUpload(false)} disabled={isMutating}>Cancel</Button>
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
            activeTab === 'myFiles' ? renderMyFiles() : renderSharedWithMe()
        )}
      </motion.div>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 bg-gray-900 border-gray-700">
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
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 bg-transparent text-white text-sm outline-none truncate"
                />
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
              <div className="grid grid-cols-5 gap-3">
                {/* WhatsApp */}
                <button
                  onClick={() => handleShareViaApp('whatsapp')}
                  className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors border border-gray-700"
                >
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs text-gray-300">WhatsApp</span>
                </button>

                {/* Gmail */}
                <button
                  onClick={() => handleShareViaApp('gmail')}
                  className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors border border-gray-700"
                >
                  <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs text-gray-300">Gmail</span>
                </button>

                {/* Outlook */}
                <button
                  onClick={() => handleShareViaApp('outlook')}
                  className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors border border-gray-700"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs text-gray-300">Outlook</span>
                </button>

                {/* Microsoft Teams */}
                <button
                  onClick={() => handleShareViaApp('teams')}
                  className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors border border-gray-700"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs text-gray-300">Teams</span>
                </button>

                {/* Facebook */}
                <button
                  onClick={() => handleShareViaApp('facebook')}
                  className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors border border-gray-700"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                    <Facebook className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs text-gray-300">Facebook</span>
                </button>

                {/* Twitter */}
                <button
                  onClick={() => handleShareViaApp('twitter')}
                  className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors border border-gray-700"
                >
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center">
                    <Twitter className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs text-gray-300">Twitter</span>
                </button>

                {/* LinkedIn */}
                <button
                  onClick={() => handleShareViaApp('linkedin')}
                  className="flex flex-col items-center space-y-2 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors border border-gray-700"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center">
                    <Link2 className="w-6 h-6 text-white" />
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

      {previewFile && (
        <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{previewFile.name}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <iframe src={previewFile.url} className="w-full h-[600px]" title={previewFile.name} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Documents;
