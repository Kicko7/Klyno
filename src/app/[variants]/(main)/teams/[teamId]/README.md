# Team Chat AI Integration

This feature allows team members to interact with AI assistants within their team channels, making the AI conversations visible to all team members for collaborative problem-solving.

## Features

### 1. AI Mode Toggle
- Users can toggle between regular team chat and AI-assisted chat using the "AI Mode" button in the channel header
- The button changes appearance to indicate the current mode

### 2. Team Chat with AI
- When in AI mode, messages are sent to the AI assistant
- All team members can see both user queries and AI responses
- AI messages are clearly marked with:
  - Robot icon avatar
  - "AI Assistant" name
  - Special background color for AI responses
  - "AI Response" tag

### 3. Message Types
The system supports two types of messages:
- `text`: Regular team messages
- `ai_chat`: AI-related messages (marked with metadata)

### 4. Components

#### TeamChatInput
- Handles message input and sending
- Shows AI mode indicator when active
- Processes AI requests and responses
- Location: `./components/TeamChatInput.tsx`

#### TeamMessageList
- Renders team messages with special formatting for AI messages
- Shows loading states and empty states
- Handles message styling based on type
- Location: `./components/TeamMessageList.tsx`

## Implementation Details

### Store Updates
The team store (`src/store/team/store.ts`) has been updated to support AI chat:
- `sendMessage` now accepts an `isAIChat` parameter
- Messages with `isAIChat=true` are sent with type `ai_chat`
- AI messages include metadata for proper rendering

### Message Flow
1. User toggles AI mode using the button in channel header
2. User types a message and sends it
3. If in AI mode:
   - Message is sent as a user message with AI metadata
   - AI service is called to generate a response
   - AI response is sent as a team message with AI metadata
4. All team members see both messages in real-time

### Styling
- AI responses have a distinct background color
- Robot icon for AI assistant avatar
- Special tags to identify AI-related messages
- Border color changes in input when in AI mode

## Future Enhancements

### 1. Real AI Integration
Currently using simulated responses. To integrate real AI:
1. Update `TeamChatInput` to use the actual chat service
2. Configure AI models and providers
3. Handle streaming responses
4. Add error handling for AI service failures

### 2. Context Management
- Add team context to AI prompts
- Include channel history for better responses
- Allow custom system prompts per team/channel

### 3. Advanced Features
- AI command shortcuts
- File attachments for AI analysis
- Code highlighting in AI responses
- Reaction support for AI messages
- Thread support for AI conversations

### 4. Permissions
- Team admin controls for AI features
- Per-channel AI settings
- Usage limits and quotas

## Usage Example

```typescript
// Enable AI mode
setIsAIMode(true);

// Send message - it will be processed by AI
await sendMessage(channelId, "How can we improve our deployment process?", true);

// AI response will appear automatically
// All team members can see and interact with the conversation
```

## Testing

To test the AI integration:
1. Navigate to a team channel
2. Click the "AI Mode" button
3. Send a message
4. Observe the AI response appears after ~1 second
5. Verify all team members can see the conversation

## Notes

- AI conversations are persistent and searchable
- AI mode state is per-user, not per-channel
- All AI interactions follow the same permissions as regular messages
- AI responses are marked in the database for analytics
