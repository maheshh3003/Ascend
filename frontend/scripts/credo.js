// Import auth functions
import { auth, logout } from './auth.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Gemini API configuration
const GEMINI_API_KEY = Gemini_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

// Conversation history
let conversationHistory = [];

// System prompt for credit score advisor
const SYSTEM_PROMPT = `You are Credo, an expert AI Credit Score Advisor. Your role is to help users understand and improve their credit scores. You should:

1. Provide accurate, actionable advice about credit score improvement
2. Explain credit concepts in simple, easy-to-understand terms
3. Be encouraging and supportive while being realistic
4. Focus specifically on credit score topics including:
   - Credit utilization (keeping it below 30%, ideally under 10%)
   - Payment history (importance of on-time payments)
   - Credit history length
   - Credit mix (types of credit accounts)
   - New credit inquiries
   - Credit score ranges (300-579 High Risk, 580-669 Needs Improvement, 670-739 Moderate Risk, 740-799 Low Risk, 800-850 Prime)
5. Provide specific, step-by-step action plans when requested
6. Be concise but thorough in your responses
7. Use emojis occasionally to make responses more engaging
8. If asked about topics outside credit scores, politely redirect to credit-related topics

Remember: You're helping people build better financial futures through improved credit scores.`;

// Check authentication
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        console.log('User authenticated:', user.email);
    } else {
        console.log('No user authenticated, redirecting to login');
        window.location.href = '../index.html';
    }
});

// Logout handler
window.handleLogout = async function() {
    try {
        await logout();
        window.location.href = '../index.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
    }
};

// Initialize chat
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const charCount = document.getElementById('char-count');
    
    // Auto-resize textarea
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        
        // Update character count
        charCount.textContent = `${this.value.length} / 2000`;
        
        // Enable/disable send button
        sendButton.disabled = this.value.trim().length === 0;
    });
    
    // Handle Enter key (without Shift)
    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendButton.disabled) {
                document.getElementById('chat-form').dispatchEvent(new Event('submit'));
            }
        }
    });
    
    // Load chat history from localStorage
    loadChatHistory();
});

// Handle form submission
window.handleSubmit = async function(event) {
    event.preventDefault();
    
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    // Disable input while processing
    chatInput.disabled = true;
    document.getElementById('send-button').disabled = true;
    
    // Add user message to chat
    addMessage(message, 'user');
    
    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    document.getElementById('char-count').textContent = '0 / 2000';
    
    // Hide suggested prompts after first message
    document.getElementById('suggested-prompts').style.display = 'none';
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        // Get AI response
        const response = await getGeminiResponse(message);
        
        // Hide typing indicator
        hideTypingIndicator();
        
        // Add AI response to chat
        addMessage(response, 'ai');
        
        // Save to conversation history
        conversationHistory.push(
            { role: 'user', content: message },
            { role: 'assistant', content: response }
        );
        
        // Save chat history
        saveChatHistory();
        
    } catch (error) {
        console.error('Error getting response:', error);
        hideTypingIndicator();
        addErrorMessage('Sorry, I encountered an error. Please try again.');
    } finally {
        // Re-enable input
        chatInput.disabled = false;
        chatInput.focus();
    }
};

// Send suggested prompt
window.sendSuggestedPrompt = function(button) {
    const message = button.textContent.trim();
    document.getElementById('chat-input').value = message;
    document.getElementById('send-button').disabled = false;
    document.getElementById('char-count').textContent = `${message.length} / 2000`;
    document.getElementById('chat-form').dispatchEvent(new Event('submit'));
};

// Get response from Gemini API
async function getGeminiResponse(userMessage) {
    // Build the prompt with system instructions and conversation history
    let fullPrompt = SYSTEM_PROMPT + '\n\n';
    
    // Add conversation history (last 10 messages for context)
    const recentHistory = conversationHistory.slice(-10);
    recentHistory.forEach(msg => {
        if (msg.role === 'user') {
            fullPrompt += `User: ${msg.content}\n`;
        } else {
            fullPrompt += `Assistant: ${msg.content}\n`;
        }
    });
    
    // Add current user message
    fullPrompt += `User: ${userMessage}\nAssistant:`;
    
    const requestBody = {
        contents: [{
            parts: [{
                text: fullPrompt
            }]
        }],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
        }
    };
    
    const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', errorData);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response from API');
    }
    
    return data.candidates[0].content.parts[0].text;
}

// Add message to chat
function addMessage(text, type) {
    const messagesContainer = document.getElementById('chat-messages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    
    if (type === 'ai') {
        avatarDiv.innerHTML = `
            <svg fill="currentColor" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-88a16,16,0,1,1-16-16A16,16,0,0,1,144,128Zm-84,0a12,12,0,1,1,12,12A12,12,0,0,1,60,128Zm144,0a12,12,0,1,1,12,12A12,12,0,0,1,204,128Z"></path>
            </svg>
        `;
    } else {
        avatarDiv.innerHTML = `
            <svg fill="currentColor" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"></path>
            </svg>
        `;
    }
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.innerHTML = formatMessage(text);
    
    contentDiv.appendChild(textDiv);
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// IMPROVED deterministic formatter (markdown-lite)
function formatMessage(text) {
    if (!text || typeof text !== 'string') return '';

    // 1. Normalise line endings
    let src = text.replace(/\r\n?/g, '\n').trim();

    // 2. Extract fenced code blocks first to protect them from later regex passes
    const codeBlocks = [];
    src = src.replace(/```([\s\S]*?)```/g, (m, code) => {
        const idx = codeBlocks.length;
        codeBlocks.push(code);
        return `__CODE_BLOCK_${idx}__`;
    });

    // 3. Escape HTML (except code blocks we replaced)
    src = src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // 4. Split into lines for structural parsing
    const lines = src.split('\n');
    const out = [];
    let listBuffer = [];
    let listType = null; // 'ul' | 'ol'

    const flushList = () => {
        if (listBuffer.length === 0) return;        
        if (listType === 'ul') {
            out.push('<ul class="bullet-list">' + listBuffer.map(i => `<li class="bullet-item">${i}</li>`).join('') + '</ul>');
        } else if (listType === 'ol') {
            out.push('<ol class="numbered-list">' + listBuffer.map(i => `<li class="numbered-item">${i}</li>`).join('') + '</ol>');
        }
        listBuffer = [];
        listType = null;
    };

    for (let rawLine of lines) {
        const line = rawLine.trim();

        // Blank line => paragraph/list boundary
        if (line === '') {
            flushList();
            out.push('');
            continue;
        }

        // Headings
        let headingMatch = line.match(/^(#{1,3})\s+(.+)/);
        if (headingMatch) {
            flushList();
            const level = headingMatch[1].length;
            const hText = headingMatch[2].trim();
            const tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
            out.push(`<${tag} class="msg-${tag}">${hText}</${tag}>`);
            continue;
        }

        // Blockquote
        const bq = line.match(/^>\s+(.*)/);
        if (bq) {
            flushList();
            out.push(`<blockquote class="msg-quote">${bq[1]}</blockquote>`);
            continue;
        }

        // Horizontal rule
        if (/^---+$/.test(line)) {
            flushList();
            out.push('<hr class="msg-divider" />');
            continue;
        }

        // Ordered list item
        const ol = line.match(/^\d+\.\s+(.*)/);
        if (ol) {
            if (listType && listType !== 'ol') flushList();
            listType = 'ol';
            listBuffer.push(ol[1]);
            continue;
        }

        // Unordered list item
        const ul = line.match(/^[*-]\s+(.*)/);
        if (ul) {
            if (listType && listType !== 'ul') flushList();
            listType = 'ul';
            listBuffer.push(ul[1]);
            continue;
        }

        // Normal line -> flush any pending list first
        flushList();
        out.push(line);
    }
    // Flush at end
    flushList();

    // 5. Rejoin preserving blank lines as paragraph separators
    let joined = out.join('\n');

    // 6. Restore code blocks (escaped separately)
    joined = joined.replace(/__CODE_BLOCK_(\d+)__/g, (m, id) => {
        const code = codeBlocks[Number(id)]
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return `<pre class="code-block"><code>${code}</code></pre>`;
    });

    // 7. Shield code blocks for inline formatting
    const codePlaceholders = [];
    joined = joined.replace(/<pre class="code-block"><code>[\s\S]*?<\/code><\/pre>/g, m => {
        const idx = codePlaceholders.length;
        codePlaceholders.push(m);
        return `__CODE_FENCE_${idx}__`;
    });

    // Bold **text**
    joined = joined.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic *text* or _text_
    joined = joined.replace(/(^|[\s\p{P}])\*(?!\*)([^*]+?)\*(?=($|[\s\p{P}]))/gu, '$1<em>$2</em>');
    joined = joined.replace(/(^|[\s\p{P}])_([^_]+?)_(?=($|[\s\p{P}]))/g, '$1<em>$2</em>');
    // Inline code
    joined = joined.replace(/`([^`]+?)`/g, '<code class="inline-code">$1</code>');
    // Links
    joined = joined.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" class="msg-link">$1</a>');
    // Emojis
    joined = joined.replace(/:\)/g, '�').replace(/:\(/g, '�');

    // Restore code placeholders
    joined = joined.replace(/__CODE_FENCE_(\d+)__/g, (m, id) => codePlaceholders[Number(id)]);

    // 8. Paragraph wrapping
    const blockRegex = /^(<(?:h[1-3]|ul|ol|li|pre|blockquote|hr)\b)/;
    const paragraphs = joined.split(/\n{2,}/).map(chunk => {
        const trimmed = chunk.trim();
        if (!trimmed) return '';
        if (blockRegex.test(trimmed)) return trimmed;
        return `<p class="msg-paragraph">${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).filter(Boolean);

    let finalHtml = paragraphs.join('');
    finalHtml = finalHtml.replace(/<p class="msg-paragraph">(<(?:ul|ol)[^>]*>)/g, '$1')
                         .replace(/(<\/ul>|<\/ol>)<\/p>/g, '$1');
    return finalHtml;
}

// Show typing indicator
function showTypingIndicator() {
    document.getElementById('typing-indicator').style.display = 'block';
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Hide typing indicator
function hideTypingIndicator() {
    document.getElementById('typing-indicator').style.display = 'none';
}

// Add error message
function addErrorMessage(message) {
    const messagesContainer = document.getElementById('chat-messages');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <svg fill="currentColor" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
            <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-8,56a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm8,104a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z"></path>
        </svg>
        <span>${message}</span>
    `;
    
    messagesContainer.appendChild(errorDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Clear chat
window.clearChat = function() {
    const confirmed = confirm('Are you sure you want to clear the conversation?');
    
    if (confirmed) {
        // Clear messages (keep welcome message)
        const messagesContainer = document.getElementById('chat-messages');
        const welcomeMessage = messagesContainer.querySelector('.ai-message');
        messagesContainer.innerHTML = '';
        messagesContainer.appendChild(welcomeMessage);
        
        // Clear history
        conversationHistory = [];
        localStorage.removeItem('credoChatHistory');
        
        // Show suggested prompts again
        document.getElementById('suggested-prompts').style.display = 'flex';
    }
};

// Save chat history to localStorage
function saveChatHistory() {
    try {
        localStorage.setItem('credoChatHistory', JSON.stringify(conversationHistory));
    } catch (error) {
        console.error('Error saving chat history:', error);
    }
}

// Load chat history from localStorage
function loadChatHistory() {
    try {
        const saved = localStorage.getItem('credoChatHistory');
        if (saved) {
            conversationHistory = JSON.parse(saved);
            
            // Restore messages (skip system prompt)
            conversationHistory.forEach(msg => {
                if (msg.role === 'user') {
                    addMessage(msg.content, 'user');
                } else if (msg.role === 'assistant') {
                    addMessage(msg.content, 'ai');
                }
            });
            
            // Hide suggested prompts if there's history
            if (conversationHistory.length > 0) {
                document.getElementById('suggested-prompts').style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}
