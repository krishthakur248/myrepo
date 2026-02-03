# Car Pulling Backend API

Real-time peer-to-peer ride-sharing system with dynamic route matching.

## Project Structure

```
car-pulling-backend/
├── src/
│   ├── config/          # Database configuration
│   ├── models/          # MongoDB schemas (User, Trip, Message)
│   ├── routes/          # API routes
│   ├── controllers/      # Route controllers (logic)
│   ├── middleware/      # Custom middleware
│   ├── utils/           # Utility functions
│   └── server.js        # Main server file
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Features

- ✅ Real-time GPS tracking
- ✅ Dynamic route matching
- ✅ Real-time messaging
- ✅ User authentication
- ✅ Fare calculation
- ✅ Safety verification

## Setup Instructions

### 1. Prerequisites

- Node.js (v14+)
- MongoDB Atlas account
- npm or yarn

### 2. Installation

```bash
# Navigate to backend directory
cd car-pulling-backend

# Install dependencies
npm install
```

### 3. Configuration

```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env with your MongoDB connection string and other configs
# Example MongoDB URI:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/car-pulling?retryWrites=true&w=majority
```

### 4. Run Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start at `http://localhost:5000`

## API Endpoints

### Health Check
```
GET /api/health
```

### Authentication (Phase 2)
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/verify-phone
POST /api/auth/verify-id
```

### Users (Phase 2)
```
GET /api/users/profile
PUT /api/users/profile
PUT /api/users/location
```

### Trips (Phase 3-4)
```
POST /api/trips/start-trip
GET /api/trips/matches
POST /api/trips/join-trip
POST /api/trips/complete-trip
GET /api/trips/history
```

### Messages (Phase 5)
```
GET /api/messages/trip/:tripId
POST /api/messages/send
```

## Real-Time Events (WebSocket)

```javascript
// User joins trip room
socket.emit('join_trip', tripId);

// Send location update
socket.emit('update_location', {
  tripId,
  latitude,
  longitude
});

// Send message
socket.emit('send_message', {
  tripId,
  message: 'Hello!'
});

// Receive location updates
socket.on('location_updated', (data) => {
  // Handle location update
});

// Receive messages
socket.on('receive_message', (data) => {
  // Handle incoming message
});
```

## Database Schema

### User Collection
- Personal info (name, email, phone)
- Location data
- Verification status
- Driver/Rider information
- Ratings & reviews

### Trip Collection
- Trip code and status
- Driver and riders info
- Route information
- Fare details
- Timeline data

### Message Collection
- Trip reference
- Sender & recipient
- Message content
- Read status

## Development Roadmap

- [x] Phase 1: Project Setup & Database
- [ ] Phase 2: Authentication
- [ ] Phase 3: GPS & Route Matching
- [ ] Phase 4: Fare Calculation
- [ ] Phase 5: Messaging
- [ ] Phase 6: Frontend Integration
- [ ] Phase 7: Testing & Deployment

## Environment Variables

See `.env.example` for all required variables.

## Troubleshooting

**MongoDB Connection Error:**
- Verify your MongoDB URI in .env
- Check MongoDB Atlas whitelist (allow 0.0.0.0/0 for development)
- Ensure database name matches

**Port Already in Use:**
- Change PORT in .env
- Or kill process on port: `lsof -ti:5000 | xargs kill -9`

## License

MIT

## Support

For issues and questions, please create an issue in the repository.
