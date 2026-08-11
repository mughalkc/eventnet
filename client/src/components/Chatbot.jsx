import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import StructuredResponse from './StructuredResponse';

const Chatbot = ({ onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Enhanced message formatting with clickable links and better structure
  const formatMessage = (content) => {
    if (!content) return '';
    
    // First, normalize the content and clean up excessive formatting
    let formattedContent = content
      .trim() // Remove leading/trailing whitespace
      .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
      .replace(/\s{3,}/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace 3+ line breaks with double
      
      // Convert email addresses to clickable links
      .replace(
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
        '<a href="mailto:$1" class="text-indigo-600 hover:text-indigo-800 underline font-medium transition-colors duration-200">$1</a>'
      )
      // Convert URLs to clickable links
      .replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800 underline font-medium transition-colors duration-200">$1</a>'
      )
      // Convert phone numbers to clickable links
      .replace(
        /(\+?[\d\s\-\(\)]{10,})/g,
        '<a href="tel:$1" class="text-indigo-600 hover:text-indigo-800 underline font-medium transition-colors duration-200">$1</a>'
      )
      // Convert markdown-style formatting
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono">$1</code>')
      
      // Convert headers
      .replace(/^## (.+)$/gm, '<h3 class="text-lg font-semibold text-gray-900 mt-3 mb-1">$1</h3>')
      .replace(/^### (.+)$/gm, '<h4 class="text-md font-semibold text-gray-800 mt-2 mb-1">$1</h4>')
      
      // Handle numbered lists and bullet points more precisely
      .replace(/^(\d+)\.\s+(.+)$/gm, '<div class="mb-1"><span class="font-medium">$1.</span> $2</div>')
      .replace(/^•\s+(.+)$/gm, '<div class="mb-1 ml-3"><span class="text-indigo-600">•</span> $1</div>')
      .replace(/^-\s+(.+)$/gm, '<div class="mb-1 ml-3"><span class="text-indigo-600">•</span> $1</div>')
      
      // Clean up any remaining excessive spacing in formatted content
      .replace(/(<\/div>)\s*\n\s*(<div)/g, '$1$2') // Remove spacing between div elements
      .replace(/(<\/h[3-4]>)\s*\n\s*/g, '$1') // Remove spacing after headers
      
      // Convert remaining line breaks - be more conservative
      .replace(/\n\n+/g, '<div class="mb-2"></div>') // Double+ line breaks become spacing divs
      .replace(/\n/g, ' '); // Single line breaks become spaces

    return formattedContent;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { id: Date.now(), role: 'user', content: input };
    const currentInput = input;
    setInput('');
    
    // Add user message
    setMessages(prev => [...prev, userMessage]);
    
    // Scroll to show the new user query at the top of visible area
    setTimeout(() => {
      scrollToUserMessage(userMessage.id);
    }, 100);
    
    setIsLoading(true);

    try {
      // Send conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role === 'user' ? 'human' : 'assistant',
        content: msg.content
      }));

      const response = await axios.post('https://eventnet-production.up.railway.app/api/chatbot', {
        message: currentInput,
        chatHistory: conversationHistory
      });

      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.data.reply?.output || response.data.reply || 'I\'m having trouble connecting right now. Here are some steps you can take:\n\n1. Check your internet connection\n2. Refresh the page and try again\n3. For immediate assistance, contact our support team at contact@eventnet.pk\n\nThey\'ll be happy to help you with your query.'
      };

      setMessages(prev => [...prev, assistantMessage]);
      // Don't auto-scroll after response - let user read from where they are
      
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'I\'m having trouble connecting right now. Here are some steps you can take:\n\n1. Check your internet connection\n2. Refresh the page and try again\n3. For immediate assistance, contact our support team at contact@eventnet.pk\n\nThey\'ll be happy to help you with your query.'
      };
      setMessages(prev => [...prev, errorMessage]);
      // Don't auto-scroll after error message
      
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const clearInput = () => {
    setInput('');
  };

  // Scroll to show specific user message at the top of visible area
  const scrollToUserMessage = (messageId) => {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const messageTop = messageElement.offsetTop;
      const containerPadding = 16; // Account for container padding
      
      container.scrollTo({
        top: messageTop - containerPadding,
        behavior: 'smooth'
      });
    }
  };

  // Only scroll to bottom when chat first opens (for initial messages)
  useEffect(() => {
    if (messages.length === 0) {
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({
            behavior: 'auto',
            block: 'end',
            inline: 'nearest'
          });
        }
      }, 100);
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold">EventNet AI</h2>
              <p className="text-sm text-white text-opacity-90">Your event planning assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors duration-200"
            aria-label="Close chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
      >
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Welcome to EventNet AI!</h3>
            <p className="text-sm text-gray-600 mb-4">I can help you with:</p>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg">🎟️ Finding events</div>
              <div className="bg-purple-50 text-purple-700 px-3 py-2 rounded-lg">📅 Event planning</div>
              <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">💡 Recommendations</div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            data-message-id={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-md shadow-lg'
                  : 'bg-white text-gray-800 rounded-bl-md shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-200'
              }`}
            >
              {message.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none">
                  {(() => {
                    try {
                      const structuredData = JSON.parse(message.content);
                      if (structuredData && structuredData.type) {
                        return <StructuredResponse data={structuredData} />;
                      }
                    } catch (e) {
                      // Not a JSON object, or not the format we expect
                    }
                    
                    return (
                      <div
                        className="text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                      />
                    );
                  })()}
                </div>
              ) : (
                <div className="text-sm">{message.content}</div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
            <div className="bg-gradient-to-r from-gray-50 to-indigo-50 text-gray-800 rounded-2xl rounded-bl-md shadow-md border border-indigo-100 px-4 py-3">
              <div className="flex items-center space-x-3">
                <div className="typing-indicator flex space-x-1">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-indigo-700 font-medium">EventNet AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="border-t border-gray-200 p-4 bg-white rounded-b-lg">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Ask me about events, bookings, or planning..."
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200 text-sm placeholder-gray-500"
              autoComplete="off"
            />
            {input && (
              <button
                type="button"
                onClick={clearInput}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm">Sending...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span className="text-sm">Send</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;
