import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  MoreVertical,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Conversation {
  id: number
  title: string
  created_at: string
  updated_at: string
}

interface ChatSidebarProps {
  conversations: Conversation[]
  currentConversationId?: number
  onSelectConversation: (id: number) => void
  onNewConversation: () => void
  onDeleteConversation: (id: number) => void
  onRenameConversation: (id: number) => void
}

export function ChatSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
}: ChatSidebarProps) {
  return (
    <div className="flex flex-col h-full border-r bg-muted/10">
      <div className="p-4 border-b">
        <Button
          onClick={onNewConversation}
          className="w-full"
          variant="default"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`group relative flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted cursor-pointer transition-colors ${
                currentConversationId === conversation.id
                  ? 'bg-muted'
                  : ''
              }`}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm">
                {conversation.title}
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      onRenameConversation(conversation.id)
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteConversation(conversation.id)
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>

      {conversations.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 p-4 text-center text-sm text-muted-foreground">
          <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
          <p>No conversations yet</p>
          <p className="text-xs mt-1">Start a new chat to begin</p>
        </div>
      )}
    </div>
  )
}
