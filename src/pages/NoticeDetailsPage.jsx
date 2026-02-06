import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Paperclip, MoreVertical, FileText, UserPlus, X, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RefreshCcw, Share2, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { getNotice, getNoticeComments, addNoticeComment, requestNoticeClosure, approveNoticeClosure, rejectNoticeClosure, addNoticeCollaborator } from '@/lib/api/notices';
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

    // Zoom for preview
    const [zoom, setZoom] = useState(1);

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

    if (isLoading) return <div className="p-8 text-center text-white">Loading notice details...</div>;
    if (!notice) return <div className="p-8 text-center text-white">Notice not found</div>;

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

                    {/* <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 h-9 text-sm font-medium">
                        <UserPlus className="w-4 h-4 mr-2" /> Collaborate
                    </Button> */}
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

                        {notice.file_url ? (
                            <iframe
                                src={notice.file_url}
                                className="w-full h-full border-0 bg-white"
                                style={{ transform: `scale(${zoom})`, transformOrigin: 'center top', transition: 'transform 0.2s' }}
                                title="Notice Document"
                            />
                        ) : (
                            <div className="text-gray-500">No document attached</div>
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
        </div>
    );
};

export default NoticeDetailsPage;
