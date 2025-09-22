import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Upload, Trash2, Plus, Share2, Folder, FolderPlus, ArrowLeft, Search, Loader2, RefreshCw, Inbox, CalendarIcon, Download } from 'lucide-react';
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareDoc, setShareDoc] = useState(null);
  const [shareEmails, setShareEmails] = useState('');
  const [shareExpiryDate, setShareExpiryDate] = useState(null);
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
          const allEntities = await listAllEntities(user.access_token);
          const filtered = allEntities.filter(e => e.organization_id === currentClientId);
          setEntitiesForFilter(filtered);
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
    const formData = new FormData(e.target);
    const file = formData.get('file');
    if (!file || file.size === 0) {
      toast({ title: "No file selected", description: "Please select a file to upload.", variant: "destructive" });
      return;
    }

    try {
        if (user?.role === 'CA_ACCOUNTANT') {
            await uploadCAFile(currentFolderId, file, shareExpiryDate, user.access_token);
        } else {
            await uploadFile(currentFolderId, entityId, file, shareExpiryDate, user.access_token);
        }
        toast({ title: "Document Uploaded", description: "New document has been successfully added." });
        setShowUpload(false);
        e.target.reset();
        setShareExpiryDate(null);
        fetchDocuments(true);
    } catch (error) {
        toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast({ title: "Invalid Name", description: "Folder name cannot be empty.", variant: "destructive" });
      return;
    }
    try {
        if (user?.role === 'CA_ACCOUNTANT') {
            await createCAFolder(newFolderName, currentFolderId, user.access_token);
        } else {
            await createFolder(newFolderName, entityId, currentFolderId, user.agency_id, user.access_token);
        }
        toast({ title: "Folder Created", description: `Folder "${newFolderName}" has been created.` });
        setShowCreateFolder(false);
        setNewFolderName('');
        fetchDocuments(true);
    } catch (error)
        {
        toast({ title: "Creation Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (itemId) => {
    try {
        await deleteDocument(itemId, user.access_token);
        toast({ title: "Item Deleted", description: "The selected item has been removed." });
        if (activeTab === 'myFiles') {
          fetchDocuments(true);
        } else {
          fetchSharedDocuments(true);
        }
    } catch (error) {
        toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleShareClick = (doc) => {
    setShareDoc(doc);
    setShareDialogOpen(true);
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
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredChildren.map((item, index) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.05 }}>
            <Card className="glass-card card-hover" onDoubleClick={item.is_folder ? () => setCurrentFolderId(item.id) : () => handleView(item)}>
                <CardHeader>
                <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${item.is_folder ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-sky-500 to-indigo-500'}`}>
                    {item.is_folder ? <Folder className="w-6 h-6 text-white" /> : <FileText className="w-6 h-6 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{item.name}</CardTitle>
                    {!item.is_folder && <CardDescription>{item.file_type} • {item.size ? `${(item.size / 1024 / 1024).toFixed(2)} MB` : ''}</CardDescription>}
                    </div>
                </div>
                </CardHeader>
                <CardContent>
                <div className="flex space-x-2">
                    <Button size="icon" variant="outline" onClick={(e) => {e.stopPropagation(); handleShareClick(item)}}><Share2 className="w-4 h-4" /></Button>
                    {!item.is_folder && (
                        <Button size="icon" variant="outline" onClick={(e) => {e.stopPropagation(); handleView(item)}}><FileText className="w-4 h-4" /></Button>
                    )}
                    <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={(e) => {e.stopPropagation(); handleDelete(item.id)}}><Trash2 className="w-4 h-4" /></Button>
                </div>
                </CardContent>
            </Card>
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {sharedDocuments.map((item, index) => (
        <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.05 }}>
          <Card className="glass-card card-hover" onDoubleClick={() => handleView(item)}>
            <CardHeader>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-purple-500 to-pink-500">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">{item.name}</CardTitle>
                  <CardDescription>Shared by: {item.owner_email}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Button size="icon" variant="outline" onClick={(e) => { e.stopPropagation(); handleView(item) }}><FileText className="w-4 h-4" /></Button>
                <a href={`${FINANCE_API_BASE_URL}/api/documents/${item.id}`} download={item.name}>
                  <Button size="icon" variant="outline"><Download className="w-4 h-4" /></Button>
                </a>
              </div>
            </CardContent>
          </Card>
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
                <Button onClick={() => setShowUpload(true)}>
                  <Plus className="w-5 h-5 mr-2" /> Upload
                </Button>
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
                    <Button variant="ghost" onClick={() => setShowCreateFolder(false)}>Cancel</Button>
                    <Button onClick={handleCreateFolder}>Create</Button>
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
                       <Button variant="ghost" type="button" onClick={() => setShowUpload(false)}>Cancel</Button>
                       <Button type="submit"><Upload className="w-4 h-4 mr-2" />Upload</Button>
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Share File/Folder</DialogTitle>
            <DialogDescription>
              Enter the email addresses of the users you want to share with.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="emails" className="text-right">
                Emails
              </Label>
              <Input
                id="emails"
                value={shareEmails}
                onChange={(e) => setShareEmails(e.target.value)}
                className="col-span-3"
                placeholder="user1@example.com, user2@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleConfirmShare}>Share</Button>
          </DialogFooter>
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
