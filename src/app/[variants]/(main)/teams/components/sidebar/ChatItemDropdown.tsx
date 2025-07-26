'use client';

import { MoreHorizontal, Edit3, Trash2, Users } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Modal } from '@lobehub/ui';

import { useTeamChatStore } from '@/store/teamChat';
import { TeamChatItem } from '@/database/schemas/teamChat';

interface ChatItemDropdownProps {
  chat: TeamChatItem;
  onClose?: () => void;
}

export const ChatItemDropdown = ({ chat, onClose }: ChatItemDropdownProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.title || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { updateTeamChat, deleteTeamChat } = useTeamChatStore();

  const handleEdit = () => {
    setEditTitle(chat.title || '');
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || editTitle === chat.title) {
      setIsEditDialogOpen(false);
      return;
    }

    try {
      setIsUpdating(true);
      await updateTeamChat(chat.id, { title: editTitle.trim() });
      setIsEditDialogOpen(false);
      onClose?.();
    } catch (error) {
      console.error('Failed to update chat:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteTeamChat(chat.id);
      setIsDeleteDialogOpen(false);
      onClose?.();
    } catch (error) {
      console.error('Failed to delete chat:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMakePublic = async () => {
    try {
      const currentMetadata = chat.metadata || {};
      const isCurrentlyPublic = currentMetadata.isPublic;
      
      await updateTeamChat(chat.id, {
        metadata: {
          ...currentMetadata,
          isPublic: !isCurrentlyPublic,
        }
      });
      onClose?.();
    } catch (error) {
      console.error('Failed to toggle public status:', error);
    }
  };

  const isPublic = chat.metadata?.isPublic || false;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-slate-800 border-slate-700">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleEdit();
            }}
            className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700"
          >
            <Edit3 className="mr-2 h-4 w-4" />
            Edit Name
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleMakePublic();
            }}
            className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700"
          >
            <Users className="mr-2 h-4 w-4" />
            {isPublic ? 'Make Private' : 'Make Public'}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-slate-700" />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="text-red-400 hover:bg-red-900/20 focus:bg-red-900/20"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Chat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Modal */}
      <Modal
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        title="Edit Chat Name"
        footer={
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isUpdating || !editTitle.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isUpdating ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="chatTitle" className="block text-sm font-medium text-slate-300 mb-2">
              Chat Name
            </label>
            <Input
              id="chatTitle"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="bg-slate-700 border-slate-600 text-slate-200"
              placeholder="Enter chat name..."
              maxLength={100}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        title="Delete Chat"
        footer={
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-slate-300">
            Are you sure you want to delete "{chat.title || 'Untitled Chat'}"? 
            This action cannot be undone and all messages will be permanently removed.
          </p>
        </div>
      </Modal>
    </>
  );
};
