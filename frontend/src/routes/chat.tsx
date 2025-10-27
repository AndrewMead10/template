import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChatMessage } from '@/components/chat/ChatMessage'
import { ChatSidebar } from '@/components/chat/ChatSidebar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchWithAuth } from '@/lib/api'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface Conversation {
  id: number
  title: string
  created_at: string
  updated_at: string
}

interface ConversationDetail {
  id: number
  title: string
  messages: Message[]
}

interface ChatData {
  conversations: Conversation[]
  current_conversation: ConversationDetail | null
}

async function loadChatData(conversationId?: number): Promise<ChatData> {
  const url = conversationId
    ? `/api/chat/onload?conversation_id=${conversationId}`
    : '/api/chat/onload'
  const response = await fetchWithAuth(url)
  if (!response.ok) {
    throw new Error('Failed to load chat data')
  }
  return response.json()
}

async function checkChatConfig(): Promise<{ openai_configured: boolean }> {
  const response = await fetchWithAuth('/api/chat/config')
  if (!response.ok) {
    throw new Error('Failed to check config')
  }
  return response.json()
}

async function sendMessage(conversationId: number | undefined, message: string, title?: string) {
  console.log('sendMessage called with:', { conversationId, message, title })
  const response = await fetchWithAuth('/api/chat/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversation_id: conversationId,
      message,
      title,
    }),
  })

  console.log('sendMessage response:', response.ok, response.status)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage = errorData.detail || `Failed to send message (${response.status})`
    console.error('sendMessage error:', errorMessage, errorData)
    throw new Error(errorMessage)
  }

  return response
}

async function deleteConversation(conversationId: number) {
  const response = await fetchWithAuth('/api/chat/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversation_id: conversationId }),
  })

  if (!response.ok) {
    throw new Error('Failed to delete conversation')
  }

  return response.json()
}

async function updateConversation(conversationId: number, title: string) {
  const response = await fetchWithAuth('/api/chat/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversation_id: conversationId, title }),
  })

  if (!response.ok) {
    throw new Error('Failed to update conversation')
  }

  return response.json()
}

function ChatPage() {
  const queryClient = useQueryClient()
  const [currentConversationId, setCurrentConversationId] = useState<number | undefined>()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renameConversationId, setRenameConversationId] = useState<number | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: chatData, isLoading } = useQuery({
    queryKey: ['chat', currentConversationId],
    queryFn: () => loadChatData(currentConversationId),
  })

  const { data: configData } = useQuery({
    queryKey: ['chat-config'],
    queryFn: checkChatConfig,
    staleTime: 60000, // Cache for 1 minute
  })

  useEffect(() => {
    if (chatData?.current_conversation) {
      setMessages(chatData.current_conversation.messages)
    } else {
      setMessages([])
    }
  }, [chatData])

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages, streamingContent])

  const deleteMutation = useMutation({
    mutationFn: deleteConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat'] })
      if (currentConversationId === renameConversationId) {
        setCurrentConversationId(undefined)
      }
      toast.success('Conversation deleted')
    },
    onError: () => {
      toast.error('Failed to delete conversation')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) =>
      updateConversation(id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat'] })
      toast.success('Conversation renamed')
      setRenameDialogOpen(false)
    },
    onError: () => {
      toast.error('Failed to rename conversation')
    },
  })

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isStreaming) return

    const userMessage = inputMessage.trim()
    console.log('Sending message:', userMessage, 'to conversation:', currentConversationId)
    setInputMessage('')
    setIsStreaming(true)
    setStreamingContent('')

    // Add user message optimistically
    const tempUserMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMessage])

    try {
      console.log('Calling sendMessage API...')
      const response = await sendMessage(currentConversationId, userMessage)
      console.log('Got response:', response.status, response.headers)

      // Get conversation ID from response headers
      const newConversationId = response.headers.get('X-Conversation-Id')
      if (newConversationId && !currentConversationId) {
        setCurrentConversationId(parseInt(newConversationId))
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim()
              if (!jsonStr) continue

              const data = JSON.parse(jsonStr)

              if (data.error) {
                toast.error(data.error)
                setIsStreaming(false)
                setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id))
                return
              }

              if (data.done) {
                // Add final message to messages array
                const assistantMessage: Message = {
                  id: Date.now() + 1,
                  role: 'assistant',
                  content: accumulatedContent,
                  created_at: new Date().toISOString(),
                }
                setMessages((prev) => [...prev, assistantMessage])
                setStreamingContent('')
                setIsStreaming(false)
                queryClient.invalidateQueries({ queryKey: ['chat'] })
                return
              }

              if (data.content) {
                accumulatedContent += data.content
                setStreamingContent(accumulatedContent)
              }
            } catch (parseError) {
              console.error('Failed to parse SSE data:', line, parseError)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
      toast.error(errorMessage)
      setIsStreaming(false)
      setStreamingContent('')
      // Remove the optimistic user message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleNewConversation = () => {
    setCurrentConversationId(undefined)
    setMessages([])
    textareaRef.current?.focus()
  }

  const handleSelectConversation = (id: number) => {
    setCurrentConversationId(id)
  }

  const handleDeleteConversation = (id: number) => {
    if (confirm('Are you sure you want to delete this conversation?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleRenameConversation = (id: number) => {
    const conversation = chatData?.conversations.find((c) => c.id === id)
    if (conversation) {
      setRenameConversationId(id)
      setNewTitle(conversation.title)
      setRenameDialogOpen(true)
    }
  }

  const handleRenameSubmit = () => {
    if (renameConversationId && newTitle.trim()) {
      updateMutation.mutate({ id: renameConversationId, title: newTitle })
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="flex h-[calc(100vh-4rem)]">
        <div className="w-64 flex-shrink-0">
          <ChatSidebar
            conversations={chatData?.conversations || []}
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
            onRenameConversation={handleRenameConversation}
          />
        </div>

        <div className="flex-1 flex flex-col">
          <ScrollArea ref={scrollAreaRef} className="flex-1">
            <div className="max-w-4xl mx-auto p-4">
              {configData && !configData.openai_configured && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>OpenAI API Not Configured</AlertTitle>
                  <AlertDescription>
                    The OpenAI API key is not configured. Please set the <code className="font-mono text-sm">OPENAI_API_KEY</code> environment variable in your <code className="font-mono text-sm">.env</code> file and restart the application.
                  </AlertDescription>
                </Alert>
              )}

              {messages.length === 0 && !streamingContent && (
                <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold mb-2">
                      Start a conversation
                    </h2>
                    <p>Type a message below to begin</p>
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  role={message.role}
                  content={message.content}
                />
              ))}

              {streamingContent && (
                <ChatMessage
                  role="assistant"
                  content={streamingContent}
                  isStreaming={true}
                />
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-4">
            <div className="max-w-4xl mx-auto flex gap-2">
              <Textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  configData && !configData.openai_configured
                    ? 'OpenAI API key not configured'
                    : 'Type your message... (Shift+Enter for new line)'
                }
                className="resize-none"
                rows={3}
                disabled={isStreaming || (configData && !configData.openai_configured)}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isStreaming || (configData && !configData.openai_configured)}
                size="icon"
                className="h-full"
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Conversation</DialogTitle>
            <DialogDescription>
              Enter a new name for this conversation
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter conversation title"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSubmit()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRenameSubmit} disabled={!newTitle.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export const Route = createFileRoute('/chat')({
  beforeLoad: async () => {
    try {
      const response = await fetchWithAuth('/api/auth/me')
      if (!response.ok) throw new Error('Not authenticated')
    } catch {
      throw redirect({ to: '/auth/login', search: { redirect: '/chat' } })
    }
  },
  component: ChatPage,
})
