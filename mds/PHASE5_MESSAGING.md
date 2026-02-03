# Phase 5: Messaging & Notifications 💬

## Overview
Phase 5 implements real-time messaging and notifications between drivers and riders, enabling instant communication and status updates.

## Features Implemented

### 1. **In-App Chat System**
- **Chat Interface**: Modal-based chat UI with message display and input
- **Real-time Messages**: Messages sent via REST API with immediate display
- **Message History**: Load and display all previous messages for a trip
- **Read Status**: Track which messages have been read
- **User Identification**: Shows sender name for each message

### 2. **Accept/Reject Request Handler**
When a driver clicks **Accept** or **Reject** on a rider request:
- **Accept**: Rider status updated to 'accepted', driver and rider receive notification
- **Reject**: Rider removed from trip
- Auto-opens chat with rider after accepting
- Automatically reloads rider requests

### 3. **Real-time Notifications** 🔔
Notifications are sent for:
- **Ride Accepted**: Rider notified when driver accepts their request
- **Ride Rejected**: Rider notified when request is declined
- **New Messages**: Real-time notification when new message arrives
- **Status Updates**: Trip status changes and updates

### 4. **Socket.io Integration**
- User-specific rooms: `user_{userId}` for personal notifications
- Trip-specific rooms: `trip_{tripId}` and `trip_{tripId}_user_{userId}` for group/personal messages
- JWT authentication for socket connections
- Real-time location updates support

## Backend Implementation

### Message Controller (`message.controller.js`)
Endpoints:
- `POST /messages/send` - Send a message to recipient
- `GET /messages/trip/:tripId` - Get all messages for a trip
- `GET /messages/unread/:tripId` - Get unread message count
- `PUT /messages/mark-read/:tripId` - Mark messages as read

### Message Model
```javascript
{
  tripId: ObjectId,
  senderId: ObjectId (User),
  recipientId: ObjectId (User),
  messageText: String (max 500 chars),
  messageType: 'text' | 'location_share' | 'photo',
  isRead: Boolean,
  readAt: Date,
  createdAt: Date
}
```

### Trip Controller Updates
`respondToRider` function now:
- Updates rider status to 'accepted' or removes if rejected
- Emits real-time notification via Socket.io
- Notifies both driver and rider in real-time

### Socket.io Server (`server.js`)
Events handled:
- `join-trip-room` - Join trip-specific notification room
- `leave-trip-room` - Leave trip room
- `join-user-room` - Join personal notification room
- `leave-user-room` - Leave personal room
- `update-location` - Real-time location sharing
- `send-message` - Send message via socket
- Authentication via JWT token

## Frontend Implementation

### Message Service (`message-service.js`)
API wrapper for messaging operations:
```javascript
MessageService.sendMessage(tripId, recipientId, messageText)
MessageService.getMessages(tripId)
MessageService.getUnreadCount(tripId)
MessageService.markAsRead(tripId)
```

### Notification Manager (`notification-manager.js`)
Centralized notification handling:
- Initialize socket connection with authentication
- Handle different notification types
- Display toast notifications with animations
- Maintain notification history
- Join/leave user and trip rooms

### Chat Modal Features
- **Header**: Shows rider name and trip ID
- **Messages Area**: Displays all messages with timestamps
  - Own messages: Right-aligned, blue background
  - Received messages: Left-aligned, gray background
  - Shows sender name for received messages
- **Input Area**: Type message and send with Enter key or button
- **Auto-scroll**: Automatically scrolls to latest message

### Accept/Reject Workflow
1. Driver views rider requests with distance and map
2. Clicks **Accept** or **Reject**
3. On Accept:
   - API call to `/trips/respond-rider` with action='accept'
   - Real-time notification sent to rider
   - Chat modal automatically opens
   - Shows "Waiting for driver" notification to rider
4. On Reject:
   - API call with action='reject'
   - Notification sent to rider
   - Rider removed from requests list

## Real-time Flow

### Message Notification Flow:
1. Driver types message and clicks Send
2. `sendMessage()` sends POST to `/messages/send`
3. Backend saves message and emits to recipient socket room
4. Rider receives real-time notification
5. Chat updates automatically with new message
6. Backend emits notification event with message preview

### Ride Acceptance Flow:
1. Driver clicks Accept on rider request
2. `acceptRiderRequest()` sends POST to `/trips/respond-rider`
3. Backend updates rider status and emits Socket.io event
4. Rider receives notification: "Driver accepted your ride!"
5. Driver's chat modal opens with rider
6. Both can now message each other

## Files Added/Modified

### New Files:
- `message-service.js` - Frontend API wrapper for messages
- `notification-manager.js` - Notification system with Socket.io
- `car-pulling-backend/src/controllers/message.controller.js` - Backend message handler

### Modified Files:
- `car-pulling-backend/src/routes/message.routes.js` - Implemented message endpoints
- `car-pulling-backend/src/controllers/trip.controller.js` - Added Socket.io notifications to respondToRider
- `car-pulling-backend/src/server.js` - Enhanced Socket.io with authentication and user/trip rooms
- `AddRide-Connected.html` - Added chat UI, message handling, and notification integration

## Testing Checklist

- [ ] Driver accepts rider request
- [ ] Rider receives acceptance notification
- [ ] Chat modal opens with rider
- [ ] Send message from driver to rider
- [ ] Message appears in real-time for rider
- [ ] Rider replies to driver
- [ ] Driver receives reply notification
- [ ] Message history loads correctly
- [ ] Read status updates properly
- [ ] Reject request sends notification to rider
- [ ] Multiple riders can message simultaneously
- [ ] Socket connection maintains with page refresh
- [ ] Notification toasts display and auto-dismiss

## Next Steps (Phase 6)

- Trip completion workflow
- Payment integration
- Ratings and reviews
- Driver earnings dashboard
- Enhanced location tracking
- Incident reporting

## Technical Notes

- Socket.io uses JWT authentication from `AuthService.getToken()`
- All Socket.io events use kebab-case (hyphens) for consistency
- Messages are stored in MongoDB for persistence
- Notifications are ephemeral (not stored, only real-time)
- Maximum message length: 500 characters
- Toast notifications auto-dismiss after 5 seconds
