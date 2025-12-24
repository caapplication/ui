import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ArrowLeft, Download, Loader2, AlertCircle, MoreVertical } from 'lucide-react';
import { getPublicFolder, getPublicSubfolder, viewPublicDocument } from '@/lib/api/documents';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FINANCE_API_BASE_URL } from '@/lib/api/documents';

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
  
  // Check subfolders recursively
  if (folder.subfolders && folder.subfolders.length > 0) {
    return folder.subfolders.some(subfolder => {
      return hasExpiredDocuments(subfolder);
    });
  }
  
  return false;
};

// Custom Folder Icon Component - File Explorer Style (matching Documents.jsx)
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

const PublicDocumentView = () => {
  const { token } = useParams();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [folderData, setFolderData] = useState(null);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [currentPath, setCurrentPath] = useState([]);

  // Determine type from URL path
  const type = location.pathname.includes('/public/folder/') ? 'folder' : 'document';

  useEffect(() => {
    if (!token) {
      setError('Invalid share link');
      setLoading(false);
      return;
    }

    if (type === 'folder') {
      loadFolder(token);
    } else if (type === 'document') {
      loadDocument(token);
    }
  }, [type, token]);

  const loadFolder = async (folderToken) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPublicFolder(folderToken);
      if (!data) {
        throw new Error('No data received from server');
      }
      setFolderData(data);
      setCurrentFolderId(data.id);
      setCurrentPath([{ id: data.id, name: data.name, token: folderToken }]);
    } catch (err) {
      console.error('Error loading folder:', err);
      setError(err.message || 'Failed to load folder. The link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  const loadSubfolder = async (subfolderId) => {
    try {
      setLoading(true);
      setError(null);
      const parentToken = currentPath[currentPath.length - 1]?.token || token;
      const data = await getPublicSubfolder(parentToken, subfolderId);
      setFolderData(data);
      setCurrentFolderId(data.id);
      setCurrentPath(prev => [...prev, { id: data.id, name: data.name, token: parentToken }]);
    } catch (err) {
      setError(err.message || 'Failed to load subfolder');
    } finally {
      setLoading(false);
    }
  };

  const loadDocument = async (docToken) => {
    try {
      setLoading(true);
      setError(null);
      const blob = await viewPublicDocument(docToken);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to load document');
      setLoading(false);
    }
  };

  const handleFolderClick = (subfolder) => {
    loadSubfolder(subfolder.id);
  };

  const handleDocumentClick = async (doc) => {
    try {
      // Use the public download endpoint URL
      const downloadUrl = doc.url.startsWith('http') ? doc.url : `${FINANCE_API_BASE_URL}${doc.url}`;
      window.open(downloadUrl, '_blank');
    } catch (err) {
      setError(err.message || 'Failed to open document');
    }
  };

  const handleBack = () => {
    if (currentPath.length > 1) {
      const newPath = currentPath.slice(0, -1);
      const parentFolder = newPath[newPath.length - 1];
      setCurrentPath(newPath);
      loadFolder(parentFolder.token);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading && !folderData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-500 mb-4">
              <AlertCircle className="h-4 w-4" />
              <p>{error}</p>
            </div>
            <Button onClick={() => window.location.reload()} className="mt-4 w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === 'document') {
    return null; // Document opens in new tab
  }

  const isSubFolder = currentPath.length > 1;
  const folders = folderData?.subfolders || [];
  const documents = folderData?.documents || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 sm:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="max-w-7xl mx-auto">
          {/* Header - matching Documents.jsx style */}
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">Shared Folder</h1>
            
            {/* Breadcrumb - matching Documents.jsx style */}
            <div className="flex items-center space-x-1 sm:space-x-2 text-gray-400 mb-4 sm:mb-8 text-sm sm:text-base overflow-x-auto pb-2">
              {currentPath.length > 1 && (
                <Button variant="ghost" size="sm" onClick={handleBack} className="h-8 sm:h-9 text-xs sm:text-sm flex-shrink-0">
                  <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Back</span>
                </Button>
              )}
              {currentPath.map((folder, index) => (
                <React.Fragment key={folder.id}>
                  <span className="cursor-pointer hover:text-white transition-colors whitespace-nowrap truncate max-w-[100px] sm:max-w-none">{folder.name}</span>
                  {index < currentPath.length - 1 && <span className="text-gray-600 flex-shrink-0">/</span>}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Folders - matching Documents.jsx grid style */}
          {folders.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2 sm:gap-4 mb-6 sm:mb-8">
              {folders.map((item, index) => {
                // Check if folder has expired documents
                const hasExpired = hasExpiredDocuments(item);
                return (
                  <motion.div 
                    key={item.id} 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    className="flex flex-col items-center cursor-pointer group relative p-2 sm:p-3 rounded-lg transition-all hover:bg-gray-800/30"
                    onClick={() => handleFolderClick(item)}
                  >
                    <div className="relative mb-2">
                      <FolderIcon 
                        className={`w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 transition-transform group-hover:scale-110`}
                        hasExpired={hasExpired}
                      />
                    </div>
                    <div className="w-full text-center px-1">
                      <p className="text-xs sm:text-sm truncate transition-colors text-white group-hover:text-blue-300">{item.name}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Documents - Table format in subfolders, grid format in main folders (matching Documents.jsx) */}
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
                            <DropdownMenuItem onClick={() => handleDocumentClick(item)}>
                              <FileText className="w-4 h-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              const downloadUrl = item.url.startsWith('http') ? item.url : `${FINANCE_API_BASE_URL}${item.url}`;
                              window.open(downloadUrl, '_blank');
                            }}>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Documents - Grid format in main folders (matching Documents.jsx) */}
          {!isSubFolder && documents.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2 sm:gap-4">
              {documents.map((item, index) => (
                <motion.div 
                  key={item.id} 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className="flex flex-col items-center cursor-pointer group relative"
                  onDoubleClick={() => handleDocumentClick(item)}
                >
                  <div className="relative mb-2">
                    <div className="w-40 h-40 sm:w-44 sm:h-44 md:w-48 md:h-48 rounded-xl flex items-center justify-center bg-gradient-to-br from-sky-500 to-indigo-500 transition-transform group-hover:scale-110">
                      <FileText className="w-20 h-20 sm:w-22 sm:h-22 md:w-24 md:h-24 text-white" />
                    </div>
                    {/* Action buttons on hover - matching Documents.jsx */}
                    <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 sm:gap-1">
                      <Button 
                        size="icon" 
                        variant="secondary" 
                        className="h-6 w-6 sm:h-7 sm:w-7 bg-gray-800/90 hover:bg-gray-700"
                        onClick={(e) => { e.stopPropagation(); handleDocumentClick(item) }}
                      >
                        <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="secondary" 
                        className="h-6 w-6 sm:h-7 sm:w-7 bg-gray-800/90 hover:bg-gray-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          const downloadUrl = item.url.startsWith('http') ? item.url : `${FINANCE_API_BASE_URL}${item.url}`;
                          window.open(downloadUrl, '_blank');
                        }}
                      >
                        <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="w-full text-center px-1">
                    <p className="text-xs sm:text-sm text-white truncate group-hover:text-blue-300 transition-colors">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-1 truncate hidden sm:block">
                      {item.expiry_date ? `Expires: ${formatDate(item.expiry_date)}` : 'No expiry'}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {folders.length === 0 && documents.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">{'This folder is empty.'}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default PublicDocumentView;
