import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search, Trash2, Edit, MoreVertical } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth.jsx';
import { getTags, createTag, updateTag, deleteTag } from '@/lib/api';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const TagsContent = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [openNewTag, setOpenNewTag] = useState(false);
    const [editingTag, setEditingTag] = useState(null);
    const [color, setColor] = useState("#aabbcc");
    const [tagName, setTagName] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [tags, setTags] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchTags = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const fetchedTags = await getTags(user.agency_id, user.access_token);
            setTags(fetchedTags || []);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Could not fetch tags." });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchTags();
    }, [fetchTags]);

    const handleSaveTag = async () => {
        if (!tagName) {
            toast({ variant: "destructive", title: "Validation Error", description: "Tag name cannot be empty." });
            return;
        }
        
        const tagData = { name: tagName, color };

        try {
            if (editingTag) {
                await updateTag(editingTag.id, tagData, user.agency_id, user.access_token);
                toast({ title: "Success", description: "Tag updated successfully." });
            } else {
                await createTag(tagData, user.agency_id, user.access_token);
                toast({ title: "Success", description: "Tag created successfully." });
            }
            await fetchTags();
            setOpenNewTag(false);
            setEditingTag(null);
            setTagName("");
            setColor("#aabbcc");
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: `Failed to ${editingTag ? 'update' : 'create'} tag.` });
        }
    };
    
    const handleOpenNew = () => {
        setEditingTag(null);
        setTagName("");
        setColor("#aabbcc");
        setOpenNewTag(true);
    };

    const handleOpenEdit = (tag) => {
        setEditingTag(tag);
        setTagName(tag.name);
        setColor(tag.color);
        setOpenNewTag(true);
    };
    
    const handleDeleteTag = async (tagId) => {
        try {
            await deleteTag(tagId, user.agency_id, user.access_token);
            toast({ title: "Success", description: "Tag deleted successfully." });
            await fetchTags();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to delete tag." });
        }
    };

    const filteredTags = tags.filter(tag => tag.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className='text-white'>
            <div className="flex justify-between items-center mb-6">
                <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <Input placeholder="Search tags..." className="pl-10 glass-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <Button onClick={handleOpenNew} className="bg-primary hover:bg-primary/90 text-white">
                    <Plus className="mr-2 h-4 w-4" /> New Tag
                </Button>
            </div>
            <div className="glass-card p-4">
                <div className="grid grid-cols-[1fr_auto] px-4 py-2 border-b border-white/10 font-bold uppercase text-sm text-gray-400">
                    <span>Tag</span>
                    <span className="text-right">Actions</span>
                </div>
                {isLoading ? (
                    <div className="flex justify-center items-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                ) : filteredTags.map((tag) => (
                    <div key={tag.id} className="grid grid-cols-[1fr_auto] items-center px-4 py-3 border-b border-white/10 last:border-b-0">
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }}></div>
                          {tag.name}
                        </span>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="glass-pane text-white">
                                <DropdownMenuItem onClick={() => handleOpenEdit(tag)}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteTag(tag.id)} className="text-red-400 focus:text-red-400 focus:bg-red-400/10">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ))}
                 {!isLoading && filteredTags.length === 0 && (
                    <div className="text-center py-10 text-gray-400">No tags found.</div>
                )}
            </div>

            <Dialog open={openNewTag} onOpenChange={setOpenNewTag}>
                <DialogContent className="glass-pane text-white">
                    <DialogHeader>
                        <DialogTitle>{editingTag ? 'Edit Tag' : 'New Tag'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="tag-name">Tag Name</Label>
                            <Input id="tag-name" placeholder="E.g. High Priority" className="glass-input" value={tagName} onChange={(e) => setTagName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Color</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal glass-input">
                                        <div className="w-5 h-5 rounded-full mr-2 border border-white/20" style={{ backgroundColor: color }}/>
                                        <span>{color}</span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 border-0">
                                    <HexColorPicker color={color} onChange={setColor} />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline" className="text-white">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleSaveTag} className="bg-primary hover:bg-primary/90">Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TagsContent;