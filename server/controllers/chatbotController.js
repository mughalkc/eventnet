const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { HumanMessage } = require('@langchain/core/messages');
const { TavilySearchResults } = require('@langchain/community/tools/tavily_search');
const { createGoogleGenerativeAI } = require('@langchain/google-genai');
const { AgentExecutor, createToolCallingAgent } = require('langchain/agents');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { MongoClient } = require('mongodb');
const { MongoDBAtlasVectorSearch } = require('@langchain/mongodb');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { createRetrieverTool } = require('langchain/tools/retriever');
const { DynamicTool } = require('langchain/tools');
const allTools = require('../services/toolService');

// Initialize the Gemini model only if API key is available
let model = null;
if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
  model = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    model: 'gemini-2.5-flash',
    maxOutputTokens: 2048,
  });
} else {
  console.warn('Google Generative AI API key not found. Chatbot functionality will be limited.');
}

// Connect to MongoDB
const client = new MongoClient(process.env.MONGODB_URI);
const dbName = 'event-management'; // Replace with your database name
const collectionName = 'events'; // Replace with your collection name
const collection = client.db(dbName).collection(collectionName);

// Set up vector store
const vectorStore = new MongoDBAtlasVectorSearch(
  new GoogleGenerativeAIEmbeddings({ apiKey: process.env.GEMINI_API_KEY }),
  {
    collection,
    indexName: 'vector_index', // Replace with your Atlas Vector Search index name
    textKey: 'description', // Field to use for vector search
    embeddingKey: 'embedding', // Field to store embeddings
  }
);

const retriever = vectorStore.asRetriever();

const retrieverTool = createRetrieverTool(retriever, {
  name: 'event_search',
  description: 'Search for information about events. For any questions about events, you must use this tool!',
});

// Create LangChain tools from our service functions
const createDynamicTool = (toolConfig) => {
  return new DynamicTool({
    name: toolConfig.name,
    description: toolConfig.description,
    func: async (input) => {
      try {
        const result = await toolConfig.func(input);
        return JSON.stringify(result);
      } catch (error) {
        return JSON.stringify({ error: error.message });
      }
    }
  });
};

const listUpcomingEventsTool = createDynamicTool(allTools.listUpcomingEvents);
const checkSeatAvailabilityTool = createDynamicTool(allTools.checkSeatAvailability);
const getEventRegistrationsTool = createDynamicTool(allTools.getEventRegistrations);
const getEventRevenueTool = createDynamicTool(allTools.getEventRevenue);

const attendeeTools = [
  listUpcomingEventsTool,
  checkSeatAvailabilityTool,
  retrieverTool,
];

const organizerTools = [
  listUpcomingEventsTool,
  checkSeatAvailabilityTool,
  getEventRegistrationsTool,
  getEventRevenueTool,
  retrieverTool,
];

const chat = async (req, res) => {
  const { message, chatHistory = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const userRole = req.user?.role || 'attendee';
    
    const systemPrompt = `You are EventNet AI, an intelligent assistant for the EventNet platform - a comprehensive event management system. You are knowledgeable, helpful, and specialized in event management.

**About EventNet Platform:**
EventNet is a complete event management solution that provides:

**Core Features:**
- Event Creation & Management: Create, edit, and manage events with detailed information
- Ticket Booking System: Book tickets, manage capacity, pricing tiers
- Vendor Management: Connect with and manage event vendors and suppliers
- User Management: Handle attendees, organizers, and vendor accounts
- Payment Processing: Secure payment handling for ticket sales
- Event Discovery: Browse and search for events by category, location, date
- Registration Management: Track attendee registrations and check-ins
- Revenue Tracking: Monitor ticket sales and event profitability
- Event Analytics: Detailed insights on event performance

**User Roles:**
- Attendees: Can browse events, book tickets, manage their registrations
- Organizers: Can create events, manage tickets, track revenue, handle registrations
- Vendors: Can offer services to event organizers
- Admins: Full platform management capabilities

**Platform Capabilities:**
- Real-time seat availability checking
- Multiple ticket types and pricing
- Event categorization and filtering
- Mobile-responsive design
- Secure payment processing
- Email notifications
- Event promotion tools

**Your Role:**
${userRole === 'organizer' ?
  'You are assisting an EVENT ORGANIZER. Help them with event creation, management, vendor coordination, ticket sales tracking, and revenue analysis.' :
  'You are assisting an EVENT ATTENDEE. Help them discover events, book tickets, manage registrations, and learn about platform features.'}

**Response Guidelines:**
- Always be helpful and provide specific, actionable information
- Use available tools to fetch real event data when asked about events
- Explain EventNet features clearly and guide users on how to use them
- For event-related queries, always use the event_search tool first
- Provide step-by-step guidance when explaining platform usage
- Be conversational but professional
- Remember previous conversation context and refer to previously mentioned events
- When users ask about booking tickets, provide specific booking instructions with event details
- For booking questions, always reference the specific event name and provide direct guidance
- If you don't have specific information, use available tools or explain what the user can do on the platform

**IMPORTANT FORMATTING RULES:**
- Use bullet points (•) instead of asterisks (*) for lists
- Use numbered lists (1., 2., 3.) for step-by-step instructions
- Use headers with ## instead of **bold** for main sections
- Keep responses clean and readable without excessive formatting symbols

**Error Handling:**
When you cannot fulfill a request or don't have specific information:
- NEVER apologize or say "sorry"
- Instead, provide helpful alternative steps the user can take
- Always offer to contact EventNet support at contact@eventnet.pk for additional assistance
- Guide users to specific platform features that might help them

**Example Response for Unable to Help:**
"Here are some steps you can take to resolve this:
1. [Provide specific actionable steps]
2. Check the [relevant platform section]
3. For additional assistance with [specific query], please contact our support team at contact@eventnet.pk - they'll be happy to help you with [specific issue]."

**Booking Instructions:**
When users want to book tickets for an event:
1. Confirm the event name and details
2. Explain they need to visit the event details page
3. Guide them through the ticket selection process
4. Mention available ticket types and pricing
5. Explain the payment process`;

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt],
      ['placeholder', '{chat_history}'],
      ['human', '{input}'],
      ['placeholder', '{agent_scratchpad}'],
    ]);

    const selectedTools = userRole === 'organizer' ? organizerTools : attendeeTools;

    const agent = await createToolCallingAgent({
      llm: model,
      tools: selectedTools,
      prompt,
    });

    const agentExecutor = new AgentExecutor({
      agent,
      tools: selectedTools,
    });

    const result = await agentExecutor.invoke({
      input: message,
      chat_history: chatHistory
    });

    res.json({ reply: result });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
};

module.exports = { chat };
