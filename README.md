# WebSocket Notification System

A comprehensive real-time notification system combining Ballerina WebSocket services with a Node.js backend client, enabling bidirectional communication and reliable message delivery.

## Project Overview

This project integrates two main components:

1. **WebSocket Notification Service** (Ballerina)
   - Real-time WebSocket server for client-server communication
   - REST API for notification delivery
   - Session management for connected clients

2. **Node.js Backend**
   - REST API client for the Ballerina service
   - Automatic message queuing and retry logic
   - Handles offline scenarios gracefully

## Architecture

```
┌─────────────────────┐
│  Node.js Backend    │
│  (Port 3000)        │
└──────────┬──────────┘
           │
           ↓
┌──────────────────────────────────────┐
│ Ballerina WebSocket Service          │
├──────────────────────────────────────┤
│ - WebSocket Server (Port 9090)       │
│ - REST API Server (Port 8080)        │
└──────────────────────────────────────┘
           ↓
┌──────────────────────┐
│  WebSocket Clients   │
│  (Connected via WS)  │
└──────────────────────┘
```

## System Features

### WebSocket Notification Service (Ballerina)
- **Real-time Communication**: WebSocket endpoint at `ws://localhost:9090/ws`
- **REST API Endpoint**: HTTP endpoint at `http://localhost:8080/notify`
- **Client Identification**: Automatic client tracking via `clientId` parameter
- **Session Management**: In-memory registry of active connections
- **Event Logging**: Connection/disconnection events logging

### Node.js Backend
- **Send Notifications**: POST endpoint for sending notifications to the Ballerina API
- **Automatic Retry**: Queues messages when WebSocket connections are unavailable
- **Periodic Retry**: Automatically retries pending messages every 30 seconds
- **Manual Retry**: Endpoints for triggering retries on-demand
- **Pending Messages Management**: View and manage queued messages

## Getting Started

### Prerequisites
- Ballerina Swan Lake (2201.x or later)
- Node.js (v14 or later)
- npm package manager
- A WebSocket client for testing (e.g., wscat, browser DevTools, Postman)

### Installation

#### Ballerina WebSocket Service
```bash
cd websocket_notification_service
bal build
```

#### Node.js Backend
```bash
cd node-backend
npm install
```

### Running the Services

#### 1. Start the Ballerina WebSocket Service
```bash
cd websocket_notification_service
bal run
```
- WebSocket server: `ws://localhost:9090/ws`
- REST API: `http://localhost:8080/notify`

#### 2. Start the Node.js Backend (in a new terminal)
```bash
cd node-backend
npm start
```
- Backend server: `http://localhost:3000`

## API Documentation

### Ballerina REST API (`http://localhost:8080/notify`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/send` | Send a notification to a connected WebSocket client |

**Example Request:**
```bash
curl -X POST http://localhost:8080/notify/send \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "client1",
    "message": "Hello from notification service!"
  }'
```

### Node.js Backend API (`http://localhost:3000`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/send-notification` | Send a notification (with automatic queuing) |
| GET | `/pending-messages` | Get all pending messages |
| GET | `/pending-messages/:clientId` | Get pending messages for a specific client |
| POST | `/retry/:clientId` | Retry messages for a specific client |
| POST | `/retry-all` | Retry all pending messages |
| GET | `/health` | Health check endpoint |

**Example Request:**
```bash
curl -X POST http://localhost:3000/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "client1",
    "message": "Hello from Node.js backend!"
  }'
```

## Testing

### Connect a WebSocket Client

**Using wscat:**
```bash
wscat -c "ws://localhost:9090/ws?clientId=client1"
```

**Using JavaScript (Browser Console):**
```javascript
const ws = new WebSocket('ws://localhost:9090/ws?clientId=client1');

ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => console.log('Message:', event.data);
ws.onerror = (error) => console.error('Error:', error);
ws.onclose = () => console.log('Disconnected');
```

### Send Test Notifications

```bash
# Via Ballerina REST API
curl -X POST http://localhost:8080/notify/send \
  -H "Content-Type: application/json" \
  -d '{"clientId":"client1","message":"Test message from Ballerina"}'

# Via Node.js Backend
curl -X POST http://localhost:3000/send-notification \
  -H "Content-Type: application/json" \
  -d '{"clientId":"client1","message":"Test message from Node.js"}'
```

## Project Structure

```
Project/
├── README.md                              # This file
├── .gitignore                             # Git ignore rules
├── node-backend/                          # Node.js backend service
│   ├── package.json
│   ├── README.md
│   ├── server.js
│   └── node_modules/
├── websocket_notification_service/        # Ballerina WebSocket service
│   ├── main.bal
│   ├── agents.bal
│   ├── automation.bal
│   ├── config.bal
│   ├── connections.bal
│   ├── data_mappings.bal
│   ├── functions.bal
│   ├── types.bal
│   ├── Ballerina.toml
│   ├── Dependencies.toml
│   ├── README.md
│   └── target/
└── README.md
```

## Error Handling

### Node.js Backend

**When WebSocket is unavailable:**
- Messages are automatically queued in memory
- Automatic retry occurs every 30 seconds
- User can manually trigger retries via API

**Response with queued message:**
```json
{
  "success": false,
  "message": "Message stored for retry - WebSocket not connected",
  "stored": true,
  "clientId": "client1",
  "pendingCount": 1
}
```

**Response when sent successfully:**
```json
{
  "success": true,
  "message": "Notification sent successfully",
  "data": {
    "success": true,
    "clientId": "client1",
    "message": "Message sent via WebSocket successfully"
  }
}
```

## Troubleshooting

### WebSocket Connection Issues
- Ensure the Ballerina service is running on port 9090
- Check firewall settings for WebSocket port 9090
- Verify `clientId` is provided in the connection URL

### Message Delivery Issues
- Check if WebSocket clients are properly connected
- Monitor pending messages via `/pending-messages` endpoint
- Manually trigger retry via `/retry-all` endpoint

### Service Communication Issues
- Verify Node.js backend has access to Ballerina REST API (port 8080)
- Check for network connectivity between services
- Review server logs for detailed error messages

## Performance Considerations

- In-memory message queue: Suitable for moderate message volume
- Automatic retry interval: 30 seconds (configurable)
- WebSocket connections: Maintain real-time communication overhead
- Consider database persistence for production use

## Future Enhancements

- Database persistence for message queuing
- Message delivery acknowledgments
- Client-side auto-reconnect mechanisms
- Message retry policy customization
- Comprehensive logging and monitoring
- Load balancing for multiple service instances

## Support

For issues or questions related to this project, refer to:
- Ballerina Documentation: https://ballerina.io/learn/
- Node.js Documentation: https://nodejs.org/docs/
- WebSocket Documentation: https://html.spec.whatwg.org/multipage/web-sockets/the-websocket-api.html
