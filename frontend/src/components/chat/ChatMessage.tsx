import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github-dark.css'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

export function ChatMessage({ role, content, isStreaming = false }: ChatMessageProps) {
  return (
    <div
      className={`flex w-full gap-4 p-4 ${
        role === 'assistant' ? 'bg-muted/50' : ''
      }`}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
        {role === 'user' ? 'U' : 'A'}
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex, rehypeHighlight]}
            components={{
              // Ensure code blocks are properly styled
              code(props) {
                const { children, className, ...rest } = props
                return (
                  <code className={className} {...rest}>
                    {children}
                  </code>
                )
              },
              // Ensure links open in new tab
              a({ node, children, ...props }) {
                return (
                  <a {...props} target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                )
              },
            }}
          >
            {content}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />
          )}
        </div>
      </div>
    </div>
  )
}
