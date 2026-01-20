# Node.js Backend for Ballerina REST API

This Node.js backend acts as a client to the Ballerina REST API endpoint. It handles sending notifications and automatically stores failed messages in memory when the WebSocket connection is not available, with automatic retry functionality.

## Features

- **Send Notifications**: POST endpoint to send notifications to the Ballerina API
- **Automatic Retry**: Stores messages in memory when WebSocket connection is not found (500 error)
- **Periodic Retry**: Automatically retries pending messages every 30 seconds
- **Manual Retry**: Endpoints to manually trigger retry for specific clients or all clients
- **Pending Messages Management**: View pending messages for specific clients or all clients

## Installation

```bash
cd node-backend
npm install
```

## Usage

### Start the server

```bash
npm start
```

The server will start on `http://localhost:3000`

### Send a notification

```bash
curl -X POST http://localhost:3000/send-notification \
  -H "Content-Type: application/json" \
  -d '{"clientId":"client2","message":"For client 2: Hello from REST! ---  3"}'
```

**Response when WebSocket is not connected (stored for retry):**
```json
{
  "success": false,
  "message": "Message stored for retry - WebSocket not connected",
  "stored": true,
  "clientId": "client2",
  "pendingCount": 1
}
```

**Response when successfully sent:**
```json
{
  "success": true,
  "message": "Notification sent successfully",
  "data": {
    "success": true,
    "clientId": "client2",
    "message": "Message sent via WebSocket successfully"
  }
}
```

### Get pending messages for a client

```bash
curl http://localhost:3000/pending-messages/client2
```

### Get all pending messages

```bash
curl http://localhost:3000/pending-messages
```

### Manually retry messages for a specific client

```bash
curl -X POST http://localhost:3000/retry/client2
```

### Manually retry all pending messages

```bash
curl -X POST http://localhost:3000/retry-all
```

### Health check

```bash
curl http://localhost:3000/health
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/send-notification` | Send a notification to the Ballerina API |
| GET | `/pending-messages` | Get all pending messages for all clients |
| GET | `/pending-messages/:clientId` | Get pending messages for a specific client |
| POST | `/retry/:clientId` | Manually retry messages for a specific client |
| POST | `/retry-all` | Manually retry all pending messages |
| GET | `/health` | Health check endpoint |

## How It Works

1. When you send a notification via `/send-notification`, it calls the Ballerina API at `http://localhost:8080/notify/send`
2. If the response is a 500 error with the message "WebSocket connection not found", the message is stored in memory
3. The system automatically retries pending messages every 30 seconds
4. When a message is successfully sent, any pending messages for that client are also retried
5. Messages are removed from the pending queue once successfully sent

## Configuration

You can modify the following constants in `server.js`:

- `PORT`: Server port (default: 3000)
- `BALLERINA_API_URL`: Ballerina API endpoint (default: http://localhost:8080/notify/send)
- Retry interval: Currently set to 30 seconds in the `setInterval` call
