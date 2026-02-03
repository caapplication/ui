import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Paperclip, MoreVertical, FileText, UserPlus, X, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RefreshCcw, Share2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const NoticeDetailsPage = () => {
    const { noticeId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([
        { id: 1, text: 'Attached is the GST notice received today. Please review.', sender: 'Deepak Kumar', time: '10:30 AM', isMe: false, avatar: 'D' },
        { id: 2, text: 'I will take a look at this immediately.', sender: 'Varun Soni', time: '10:35 AM', isMe: true, avatar: 'V' },
    ]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    // Mock Pagination State
    const [currentNoticeIndex, setCurrentNoticeIndex] = useState(1);
    const totalNotices = 5;

    // Mock Zoom for preview
    const [zoom, setZoom] = useState(1);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        setMessages([...messages, {
            id: messages.length + 1,
            text: newMessage,
            sender: 'Varun Soni',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isMe: true,
            avatar: 'V'
        }]);
        setNewMessage('');
    };

    const handleNavigate = (direction) => {
        // Mock navigation logic
        const newIndex = currentNoticeIndex + direction;
        if (newIndex >= 1 && newIndex <= totalNotices) {
            setCurrentNoticeIndex(newIndex);
            // In real app, would navigate to new ID
        }
    };

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
                            GST Notice - Q3
                            <Badge variant="destructive" className="ml-2 text-xs">Pending</Badge>
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-400">The Abduz Group • Received 15 Jan 2025</p>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center bg-gray-800/50 backdrop-blur-sm border border-white/10 rounded-full p-1.5 gap-1">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 h-9 text-sm font-medium">
                        <UserPlus className="w-4 h-4 mr-2" /> Collaborate
                    </Button>
                    <Button
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700 text-white border-none rounded-full px-4 h-9 text-sm font-medium"
                    >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                </div>
            </header>

            {/* Main Content - Split View with Resizable Panel */}
            <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-lg border border-white/10 hidden md:flex">
                {/* Left Panel - Document Preview */}
                <ResizablePanel defaultSize={50} minSize={30}>
                    <div className="relative flex h-full w-full flex-col items-center justify-center p-2 bg-black/40">
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

                        <div className="text-center p-10 border-2 border-dashed border-white/10 rounded-xl bg-white/5" style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s' }}>
                            <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                            <h3 className="text-xl font-medium text-gray-300">Document Preview</h3>
                            <p className="text-sm text-gray-500 mt-2">GST_Notice_Q3_2024.pdf</p>
                            <Button variant="link" className="text-blue-400 mt-4">Click to open full PDF</Button>
                        </div>
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle className="bg-white/10" />

                {/* Right Panel - Chat Interface */}
                <ResizablePanel defaultSize={50} minSize={30}>
                    <div className="flex h-full flex-col bg-transparent">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex items-end max-w-[80%] gap-2 ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                        {!msg.isMe && (
                                            <Avatar className="w-8 h-8">
                                                <AvatarFallback className="bg-indigo-600 text-xs">{msg.avatar}</AvatarFallback>
                                            </Avatar>
                                        )}
                                        <div className={`p-3 rounded-2xl text-sm ${msg.isMe ? 'bg-blue-600 text-white rounded-br-none' : 'glass-card border-white/10 text-gray-200 rounded-bl-none'}`}>
                                            <p>{msg.text}</p>
                                            <span className={`text-[10px] block mt-1 ${msg.isMe ? 'text-blue-200' : 'text-gray-500'}`}>{msg.time}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
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
                                />
                                <Button type="submit" size="icon" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-900/20">
                                    <Send className="w-4 h-4" />
                                </Button>
                            </form>
                        </div>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>

            {/* Mobile Layout (Stacked) */}
            <div className="flex flex-col md:hidden flex-1 gap-4">
                <div className="h-64 border border-white/10 rounded-lg bg-black/40 flex items-center justify-center p-4">
                    <div className="text-center">
                        <FileText className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Preview Available on Desktop</p>
                        <Button variant="outline" size="sm" className="mt-2 border-white/10">Download PDF</Button>
                    </div>
                </div>
                <div className="flex-1 border border-white/10 rounded-lg flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex items-end max-w-[80%] gap-2 ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`p-3 rounded-2xl text-sm ${msg.isMe ? 'bg-blue-600 text-white' : 'glass-card border-white/10 text-gray-200'}`}>
                                        <p>{msg.text}</p>
                                    </div>
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
            </div>

            {/* Navigation Buttons (Floating) */}
            <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-auto md:bottom-8 z-50 pointer-events-none md:pointer-events-auto flex justify-between md:block">
                {/* Previous Button */}
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleNavigate(-1)}
                    disabled={currentNoticeIndex === 1}
                    className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 border-white/30 text-white disabled:opacity-30 backdrop-blur-sm shadow-lg pointer-events-auto md:fixed md:bottom-8 md:left-[21rem] transition-all"
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>

                {/* Next Button */}
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleNavigate(1)}
                    disabled={currentNoticeIndex === totalNotices}
                    className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 border-white/30 text-white disabled:opacity-30 backdrop-blur-sm shadow-lg pointer-events-auto md:fixed md:bottom-8 md:right-8 transition-all"
                >
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
};

export default NoticeDetailsPage;
