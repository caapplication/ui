import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Paperclip, MoreVertical, FileText, UserPlus, X, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RefreshCcw, Share2, Trash2, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';

import { getNotice, getNoticeComments, addNoticeComment, requestNoticeClosure, approveNoticeClosure, rejectNoticeClosure, addNoticeCollaborator } from '@/lib/api/notices';
import { getNoticeAttachment } from '@/lib/api';
import { listAllClientUsers } from '@/lib/api/organisation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

const NoticeDetailsPage = () => {
    const { noticeId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const token = user?.access_token;
    const { toast } = useToast();

    const [notice, setNotice] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isAttachmentLoading, setIsAttachmentLoading] = useState(true);

    // Collaboration
    const [isCollaborateOpen, setIsCollaborateOpen] = useState(false);
    const [clientUsers, setClientUsers] = useState([]);
    const [isFetchingUsers, setIsFetchingUsers] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Zoom for preview
    const [zoom, setZoom] = useState(1);

    // Secure Attachment
    const [attachmentUrl, setAttachmentUrl] = useState(null);
    const [attachmentContentType, setAttachmentContentType] = useState(null);

    // Workflow Modals
    const [isRequestCloseOpen, setIsRequestCloseOpen] = useState(false);
    const [isRejectCloseOpen, setIsRejectCloseOpen] = useState(false);
    const [closureReason, setClosureReason] = useState('');
    const [isProcessingAction, setIsProcessingAction] = useState(false);

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        fetchData();
    }, [noticeId]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const noticeData = await getNotice(noticeId, token);
            setNotice(noticeData);

            // Fetch secure attachment URL (Blob)
            if (noticeData.id) {
                try {
                    const result = await getNoticeAttachment(noticeData.id, token);
                    setAttachmentUrl(result.url);
                    setAttachmentContentType(result.contentType);
                } catch (e) {
                    console.error("Failed to load secure attachment", e);
                }
            }

            const commentsData = await getNoticeComments(noticeId, token);
            // Map comments to UI message format if needed, or stick to backend structure
            // Example map:
            const mappedMessages = commentsData.map(c => ({
                id: c.id,
                text: c.message,
                sender: c.user_name || 'Unknown',
                time: new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isMe: c.user_id === user?.id,
                avatar: (c.user_name || 'U')[0],
                attachment: c.attachment_url,
                role: c.user_role
            }));
            setMessages(mappedMessages);

        } catch (error) {
            console.error("Failed to fetch notice details", error);
            toast({ title: "Error", description: "Failed to load notice details", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        setIsSending(true);
        try {
            await addNoticeComment(noticeId, newMessage, null, token);
            setNewMessage('');
            // Refresh comments
            const commentsData = await getNoticeComments(noticeId, token);
            const mappedMessages = commentsData.map(c => ({
                id: c.id,
                text: c.message,
                sender: c.user_name || 'Unknown',
                time: new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isMe: c.user_id === user?.id,
                avatar: (c.user_name || 'U')[0],
                attachment: c.attachment_url,
                role: c.user_role
            }));
            setMessages(mappedMessages);
        } catch (error) {
            console.error("Failed to send message", error);
            toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
        } finally {
            setIsSending(false);
        }
    };

    const handleAction = async (action) => {
        setIsProcessingAction(true);
        try {
            if (action === 'request_close') {
                await requestNoticeClosure(noticeId, closureReason, token);
                toast({ title: "Success", description: "Closure requested successfully" });
                setIsRequestCloseOpen(false);
            } else if (action === 'approve_close') {
                await approveNoticeClosure(noticeId, token);
                toast({ title: "Success", description: "Notice closed successfully" });
            } else if (action === 'reject_close') {
                await rejectNoticeClosure(noticeId, closureReason, token);
                toast({ title: "Success", description: "Closure request rejected" });
                setIsRejectCloseOpen(false);
            }

            setClosureReason('');
            fetchData(); // Refresh state
        } catch (error) {
            console.error(`Failed to ${action}`, error);
            toast({ title: "Error", description: `Failed to ${action.replace('_', ' ')}`, variant: "destructive" });
        } finally {
            setIsProcessingAction(false);
        }
    }

    if (isLoading && !notice) return <div className="p-8 text-center text-white">Loading notice details...</div>;
    if (!isLoading && !notice) return <div className="p-8 text-center text-white">Notice not found</div>;

    const canRequestClose = (user?.role === 'CLIENT_MASTER_ADMIN' || user?.role === 'CLIENT_USER') &&
        (notice.status === 'pending' || notice.status === 'rejected');

    const canReviewClose = user?.role === 'CA_ACCOUNTANT' && notice.status === 'closure_requested';

    return (
        <div className="h-full flex flex-col text-white bg-transparent p-3 sm:p-4 md:p-6 pb-24 md:pb-24">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-white/10 mb-3 sm:mb-4">
                <div className="flex items-center gap-3 sm:gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/notices')} className="h-9 w-9 sm:h-10 sm:w-10 text-gray-300 hover:text-white hover:bg-white/10">
                        <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                    </Button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                            {notice.title}
                            <Badge variant={
                                notice.status === 'pending' ? 'destructive' :
                                    notice.status === 'closure_requested' ? 'warning' :
                                        notice.status === 'closed' ? 'success' : 'secondary'
                            } className="ml-2 text-xs capitalize">
                                {notice.status.replace('_', ' ')}
                            </Badge>
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-400">
                            Received {notice.date_received || 'N/A'} • {notice.notice_type}
                        </p>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center gap-2">
                    {canRequestClose && (
                        <Button onClick={() => setIsRequestCloseOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm font-medium">
                            <CheckCircle className="w-4 h-4 mr-2" /> Request Close
                        </Button>
                    )}

                    {canReviewClose && (
                        <>
                            <Button onClick={() => handleAction('approve_close')} disabled={isProcessingAction} className="bg-green-600 hover:bg-green-700 text-white h-9 text-sm font-medium">
                                <CheckCircle className="w-4 h-4 mr-2" /> Approve
                            </Button>
                            <Button onClick={() => setIsRejectCloseOpen(true)} className="bg-red-600 hover:bg-red-700 text-white h-9 text-sm font-medium">
                                <XCircle className="w-4 h-4 mr-2" /> Reject
                            </Button>
                        </>
                    )}

                    {user?.role === 'CLIENT_MASTER_ADMIN' && (
                        <Button onClick={() => setIsCollaborateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 text-sm font-medium">
                            <UserPlus className="w-4 h-4 mr-2" /> Collaborate
                        </Button>
                    )}
                </div>
            </header>

            {/* Main Content - Split View with Resizable Panel */}
            <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-lg border border-white/10 hidden md:flex">
                {/* Left Panel - Document Preview */}
                <ResizablePanel defaultSize={50} minSize={30}>
                    <div className="relative flex h-full w-full flex-col items-center justify-center p-2 bg-black/40 overflow-hidden">
                        {/* Zoom controls */}
                        <div className="absolute bottom-4 right-4 z-10 flex gap-2">
                            <Button variant="outline" size="icon" onClick={() => setZoom(z => z + 0.1)} className="h-9 w-9 bg-black/50 border-white/10 hover:bg-black/70">
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="h-9 w-9 bg-black/50 border-white/10 hover:bg-black/70">
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => setZoom(1)} className="h-9 w-9 bg-black/50 border-white/10 hover:bg-black/70">
                                <RefreshCcw className="h-4 w-4" />
                            </Button>
                        </div>

                        {(isAttachmentLoading || (!attachmentUrl && !notice.file_url)) && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 bg-black/40">
                                <Skeleton className="w-full h-full rounded-lg" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <FileText className="w-12 h-12 text-blue-400 mb-4 animate-pulse" />
                                    <p className="text-gray-400 animate-pulse text-lg font-medium">Loading Document...</p>
                                </div>
                            </div>
                        )}

                        {(attachmentUrl || notice.file_url) ? (
                            (() => {
                                const urlToUse = attachmentUrl || notice.file_url;
                                const isPdf = (attachmentContentType && attachmentContentType.includes('pdf')) ||
                                    notice.file_name?.toLowerCase().endsWith('.pdf') ||
                                    urlToUse.toLowerCase().includes('.pdf');

                                if (isPdf) {
                                    return (
                                        <iframe
                                            src={urlToUse}
                                            className={`w-full h-full border-0 bg-white transition-opacity duration-300 ${isAttachmentLoading ? 'opacity-0' : 'opacity-100'}`}
                                            style={{ transform: `scale(${zoom})`, transformOrigin: 'center top', transition: 'transform 0.2s' }}
                                            title="Notice Document"
                                            onLoad={() => setIsAttachmentLoading(false)}
                                        />
                                    );
                                } else {
                                    return (
                                        <img
                                            src={urlToUse}
                                            alt="Notice Document"
                                            className={`max-w-full max-h-full object-contain transition-all duration-300 ${isAttachmentLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                                            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                                            onLoad={() => setIsAttachmentLoading(false)}
                                        />
                                    );
                                }
                            })()
                        ) : (
                            !isAttachmentLoading && <div className="text-gray-500">No document attached</div>
                        )}

                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle className="bg-white/10" />

                {/* Right Panel - Chat Interface */}
                <ResizablePanel defaultSize={50} minSize={30}>
                    <div className="flex h-full flex-col bg-transparent">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.length === 0 ? (
                                <div className="text-center text-gray-500 mt-10">No messages yet. Start the discussion.</div>
                            ) : (
                                messages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex items-end max-w-[80%] gap-2 ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                            {!msg.isMe && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <Avatar className="w-8 h-8 cursor-help">
                                                                <AvatarFallback className="bg-indigo-600 text-xs">{msg.avatar}</AvatarFallback>
                                                            </Avatar>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{msg.sender} ({msg.role})</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                            <div className={`p-3 rounded-2xl text-sm ${msg.isMe ? 'bg-blue-600 text-white rounded-br-none' : 'glass-card border-white/10 text-gray-200 rounded-bl-none'}`}>
                                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                                <span className={`text-[10px] block mt-1 ${msg.isMe ? 'text-blue-200' : 'text-gray-500'}`}>{msg.time}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-sm">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                <Button type="button" size="icon" variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10">
                                    <Paperclip className="w-5 h-5" />
                                </Button>
                                <Input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    className="flex-1 glass-input border-white/10 focus-visible:ring-blue-500/50 bg-black/20"
                                    disabled={isSending}
                                />
                                <Button type="submit" size="icon" disabled={isSending} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-900/20">
                                    <Send className="w-4 h-4" />
                                </Button>
                            </form>
                        </div>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>

            {/* Mobile View (Simplified) */}
            <div className="flex flex-col md:hidden flex-1 gap-4">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 border border-white/10 rounded-lg">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 rounded-2xl text-sm ${msg.isMe ? 'bg-blue-600 text-white' : 'glass-card border-white/10 text-gray-200'}`}>
                                <p>{msg.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-3 border-t border-white/10 bg-black/20">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Message..."
                            className="flex-1 h-9 text-sm glass-input border-white/10"
                        />
                        <Button type="submit" size="icon" className="h-9 w-9 bg-blue-600">
                            <Send className="w-4 h-4" />
                        </Button>
                    </form>
                </div>
            </div>

            {/* Request Close Dialog */}
            <Dialog open={isRequestCloseOpen} onOpenChange={setIsRequestCloseOpen}>
                <DialogContent className="glass-card border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Request Notice Closure</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Provide a reason for closing this notice.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="reason">Reason / Remarks</Label>
                        <Textarea id="reason" value={closureReason} onChange={(e) => setClosureReason(e.target.value)} className="glass-input border-white/10 bg-black/20" />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsRequestCloseOpen(false)}>Cancel</Button>
                        <Button onClick={() => handleAction('request_close')} disabled={isProcessingAction}>Submit Request</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Close Dialog */}
            <Dialog open={isRejectCloseOpen} onOpenChange={setIsRejectCloseOpen}>
                <DialogContent className="glass-card border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Reject Closure Request</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Why are you rejecting this closure request?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="rejectReason">Rejection Reason</Label>
                        <Textarea id="rejectReason" value={closureReason} onChange={(e) => setClosureReason(e.target.value)} className="glass-input border-white/10 bg-black/20" required />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsRejectCloseOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => handleAction('reject_close')} disabled={isProcessingAction}>Reject Request</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CollaboratorsDialog
                isOpen={isCollaborateOpen}
                onClose={() => setIsCollaborateOpen(false)}
                noticeId={noticeId}
                token={token}
                toast={toast}
            />
        </div>
    );
};

const CollaboratorsDialog = ({ isOpen, onClose, noticeId, token, toast }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [processing, setProcessing] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await listAllClientUsers(token);
            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (userId) => {
        setProcessing(userId);
        try {
            await addNoticeCollaborator(noticeId, userId, token);
            toast({ title: "Success", description: "Collaborator added successfully" });
        } catch (error) {
            console.error("Failed to add collaborator", error);
            toast({ title: "Error", description: "This user is already a collaborator or error occurred", variant: "destructive" });
        } finally {
            setProcessing(null);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="glass-card border-white/10 text-white sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-indigo-400" />
                        Manage Collaborators
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Add team members to this notice so they can see it and join the discussion.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                            placeholder="Search team members..."
                            className="pl-10 glass-input border-white/10 bg-black/20"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {loading ? (
                            <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-400" /></div>
                        ) : filteredUsers.length > 0 ? (
                            filteredUsers.map(u => (
                                <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-8 h-8">
                                            <AvatarFallback className="bg-indigo-600 text-xs">{(u.name || 'U')[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{u.name}</span>
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wider">{u.role?.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                                        onClick={() => handleAdd(u.id)}
                                        disabled={processing === u.id}
                                    >
                                        {processing === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center text-gray-500 text-sm italic">No members found</div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} className="hover:bg-white/10 border-white/10">Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default NoticeDetailsPage;
