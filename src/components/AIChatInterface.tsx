import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Sparkles, Maximize2, Minimize2 } from 'lucide-react';
import { chatWithSchedulingAssistant } from '@/logic/gemini-selection/selector';
import type { ChatMessage } from '@/logic/gemini-selection/selector';

interface AIChatInterfaceProps {
  allSlots: any[];
  currentSuggestions: Array<{
    startISO: string;
    endISO: string;
    attendeesFree: string[];
    attendeesMissing: string[];
    badges: string[];
    reason: string;
  }>;
  onSuggestionsUpdate: (newSuggestions: Array<{
    startISO: string;
    endISO: string;
    attendeesFree: string[];
    attendeesMissing: string[];
    badges: string[];
    reason: string;
  }>) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export default function AIChatInterface({
  allSlots,
  currentSuggestions: _,
  onSuggestionsUpdate,
  isExpanded = false,
  onToggleExpand
}: AIChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m here to help you find the perfect meeting time. I can show you available time slots, explain why certain times work better, and help you explore alternatives. What would you like to know?',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (message?: string) => {
    const userMessage = message || inputMessage.trim();
    if (!userMessage) return;

    // Add user message to UI immediately
    const newUserMessage: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newUserMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Call AI chat function
      const response = await chatWithSchedulingAssistant({
        message: userMessage,
        conversationHistory: messages,
        currentSuggestions: [],
        allAvailableSlots: allSlots,
        participants: [], // Will be populated from context
        preferences: {},
        contextNotes: ''
      });

      // Add assistant response
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Update suggestions if AI provided new ones
      if (response.newSuggestions && response.newSuggestions.length > 0) {
        const formattedSuggestions = response.newSuggestions.map(slot => ({
          startISO: slot.timeslot.startISO,
          endISO: slot.timeslot.endISO,
          attendeesFree: [],
          attendeesMissing: [],
          badges: ['AI suggested'],
          reason: slot.reason || 'AI-optimized time slot'
        }));
        onSuggestionsUpdate(formattedSuggestions);
      }
    } catch (error) {
      console.error('Error chatting with AI:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try asking your question again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickActions = [
    { text: 'Show best times', prompt: 'Show me the best available time slots' },
    { text: 'Explain options', prompt: 'Can you explain why these times are good options?' },
    { text: 'Find alternatives', prompt: 'Show me some alternative time slots' }
  ];

  return (
    <div className={`${isExpanded ? 'fixed inset-0 z-50 rounded-none' : 'h-[600px] rounded-xl'} bg-white shadow-lg border border-gray-200 flex flex-col`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Scheduling Assistant</h3>
            <p className="text-xs text-gray-600">I can help you find the perfect meeting time</p>
          </div>
        </div>
        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            aria-label={isExpanded ? 'Minimize chat' : 'Expand chat'}
          >
            {isExpanded ? (
              <Minimize2 className="h-5 w-5 text-gray-600" />
            ) : (
              <Maximize2 className="h-5 w-5 text-gray-600" />
            )}
          </button>
        )}
      </div>

      {/* Messages Container */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
            {message.role === 'user' && (
              <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-2 items-center text-gray-500">
            <div className="flex gap-1">
              <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-xs">AI is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-2 flex-wrap">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInputMessage(action.prompt);
                handleSendMessage(action.prompt);
              }}
              className="text-xs px-3 py-1.5 rounded-full bg-white border border-gray-300 hover:border-primary-300 hover:bg-primary-50 text-gray-700 transition-colors"
            >
              {action.text}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about scheduling..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={isTyping}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isTyping || !inputMessage.trim()}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}

