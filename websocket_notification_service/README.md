# WebSocket Notification Service

A real-time notification service built with Ballerina that enables bidirectional communication between clients and server using WebSockets, with a REST API for sending notifications.

## Overview

This integration provides:
- **WebSocket Server**: Real-time bidirectional communication on port 9090
- **REST API**: HTTP endpoint for sending notifications to connected clients on port 8080
- **Session Management**: In-memory registry tracking active WebSocket connections

## Architecture

The service consists of two main components:

1. **WebSocket Service** (`/ws` on port 9090)
   - Handles WebSocket connections with client identification
   - Maintains active session registry
   - Logs connection/disconnection events

2. **REST API** (`/notify` on port 8080)
   - Accepts notification requests via HTTP POST
   - Delivers messages to connected WebSocket clients
   - Returns success/error responses

## Prerequisites

- Ballerina Swan Lake (2201.x or later)
- A WebSocket client for testing (e.g., wscat, browser, or Postman)
- HTTP client for testing (e.g., curl, Postman)

## Running the Service

1. Navigate to the project directory:
```bash
cd websocket_notification_service
```

2. Run the service:
```bash
bal run
```

The service will start two listeners:
- WebSocket server on `ws://localhost:9090/ws`
- HTTP server on `http://localhost:8080/notify`

## Testing the Integration

### Step 1: Connect a WebSocket Client

Connect to the WebSocket endpoint with a unique `clientId`:

**Using wscat (Node.js tool):**
```bash
# Install wscat if not already installed
npm install -g wscat

# Connect with clientId "client1"
wscat -c "ws://localhost:9090/ws?clientId=client1"
```

**Using JavaScript (Browser Console):**
```javascript
const ws = new WebSocket('ws://localhost:9090/ws?clientId=client1');

ws.onopen = () => {
    console.log('WebSocket connected');
};

ws.onmessage = (event) => {
    console.log('Received:', event.data);
};

ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};

ws.onclose = () => {
    console.log('WebSocket disconnected');
};
```

**Expected Output:**
```
WebSocket connected: client1
```

### Step 2: Send a Notification via REST API

Send a notification to the connected client using the REST API:

**Using curl:**
```bash
curl -X POST http://localhost:8080/notify/send \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "client1",
    "message": "Hello from the notification service!"
  }'
```

**Using Postman:**
- Method: `POST`
- URL: `http://localhost:8080/notify/send`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "clientId": "client1",
  "message": "Hello from the notification service!"
}
```

**Expected Response (Success):**
```json
{
  "success": true,
  "clientId": "client1",
  "message": "Message sent via WebSocket successfully"
}
```

**WebSocket Client Receives:**
```
Hello from the notification service!
```

### Step 3: Test Error Scenarios

**Scenario 1: Client Not Connected**

Send a notification to a non-existent client:
```bash
curl -X POST http://localhost:8080/notify/send \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "nonexistent",
    "message": "This will fail"
  }'
```

**Expected Response (Error):**
```json
{
  "error": "WebSocket connection not found",
  "clientId": "nonexistent",
  "message": "Client nonexistent is not connected via WebSocket"
}
```

**Scenario 2: Multiple Clients**

Connect multiple clients and send targeted messages:

```bash
# Terminal 1
wscat -c "ws://localhost:9090/ws?clientId=client1"

# Terminal 2
wscat -c "ws://localhost:9090/ws?clientId=client2"

# Terminal 3 - Send to client1
curl -X POST http://localhost:8080/notify/send \
  -H "Content-Type: application/json" \
  -d '{"clientId": "client1", "message": "Message for client1"}'

# Terminal 3 - Send to client2
curl -X POST http://localhost:8080/notify/send \
  -H "Content-Type: application/json" \
  -d '{"clientId": "client2", "message": "Message for client2"}'
```

## API Reference

### WebSocket Endpoint

**URL:** `ws://localhost:9090/ws`

**Query Parameters:**
- `clientId` (required): Unique identifier for the client connection

**Events:**
- `onOpen`: Triggered when connection is established
- `onMessage`: Receives messages from server
- `onClose`: Triggered when connection is closed

### REST API Endpoint

**URL:** `POST http://localhost:8080/notify/send`

**Request Body:**
```json
{
  "clientId": "string",
  "message": "string"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "clientId": "string",
  "message": "Message sent via WebSocket successfully"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "error": "string",
  "clientId": "string",
  "message": "string"
}
```

## Project Structure

```
websocket_notification_service/
├── main.bal           # WebSocket and REST service implementations
├── types.bal          # Request/response type definitions
├── functions.bal      # Helper functions (currently empty)
├── config.bal         # Configuration (currently empty)
├── connections.bal    # Connection management (currently empty)
├── data_mappings.bal  # Data mappings (currently empty)
├── automation.bal     # Automation logic (currently empty)
├── agents.bal         # Agent definitions (currently empty)
└── README.md          # This file
```

## Key Features

- **Real-time Communication**: Instant message delivery via WebSockets
- **Client Identification**: Each WebSocket connection is identified by a unique clientId
- **Session Management**: In-memory registry with thread-safe operations
- **Error Handling**: Comprehensive error responses for connection and delivery failures
- **Logging**: Detailed logs for connection events and message delivery

## Troubleshooting

**Issue: WebSocket connection fails**
- Ensure the service is running on port 9090
- Check that the `clientId` query parameter is provided
- Verify firewall settings allow WebSocket connections

**Issue: Message not received**
- Confirm the WebSocket client is connected (check server logs)
- Verify the `clientId` in the REST request matches the connected client
- Check WebSocket client is listening for messages

**Issue: Port already in use**
- Stop any other services using ports 8080 or 9090
- Modify the listener ports in `main.bal` if needed

## Future Enhancements

- Persistent session storage (Redis, database)
- Message queuing for offline clients
- Authentication and authorization
- Message history and replay
- Broadcasting to multiple clients
- WebSocket heartbeat/ping-pong mechanism

## License

This project is provided as-is for demonstration purposes.
