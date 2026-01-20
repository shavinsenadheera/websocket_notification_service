import express from 'express';
import axios from 'axios';

const app = express();
const PORT = 3000;
const BALLERINA_API_URL = 'http://localhost:8080/notify/send';

// In-memory storage for failed messages
const pendingMessages = new Map();

// Middleware to parse JSON
app.use(express.json());

/**
 * Sends a notification to the Ballerina API
 * @param {Object} messageData - The message data to send
 * @returns {Promise<Object>} - Response from the API
 */
async function sendNotification(messageData) {
    try {
        // Ensure we only send clientId and message (defensive check)
        const payload = {
            clientId: messageData.clientId,
            message: messageData.message
        };
        const response = await axios.post(BALLERINA_API_URL, payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        if (error.response) {
            // Server responded with error status
            return {
                success: false,
                status: error.response.status,
                data: error.response.data,
                error: error.message
            };
        } else {
            // Network error or other issues
            return {
                success: false,
                status: null,
                data: null,
                error: error.message
            };
        }
    }
}

/**
 * Checks if the error is a WebSocket connection not found error
 * @param {Object} responseData - The response data from the API
 * @returns {boolean} - True if it's a WebSocket connection error
 */
function isWebSocketConnectionError(responseData) {
    return (
        responseData &&
        responseData.error === 'WebSocket connection not found' &&
        responseData.message &&
        responseData.message.includes('is not connected via WebSocket')
    );
}

/**
 * Extracts clean message data (only clientId and message) for sending to API
 * @param {Object} storedMessage - The stored message which may include timestamp
 * @returns {Object} - Clean message data with only clientId and message
 */
function getCleanMessageData(storedMessage) {
    // Explicitly extract only clientId and message, ignoring any other fields like timestamp
    const cleanData = {
        clientId: storedMessage.clientId,
        message: storedMessage.message
    };
    // Debug: log if we're removing fields
    if (Object.keys(storedMessage).length > 2) {
        console.log(`Cleaning message data - Removing extra fields: ${Object.keys(storedMessage).filter(k => k !== 'clientId' && k !== 'message').join(', ')}`);
    }
    return cleanData;
}

/**
 * Stores a message in memory for retry
 * @param {string} clientId - The client ID
 * @param {Object} messageData - The message data to store
 */
function storeMessageForRetry(clientId, messageData) {
    if (!pendingMessages.has(clientId)) {
        pendingMessages.set(clientId, []);
    }
    pendingMessages.get(clientId).push({
        ...messageData,
        timestamp: new Date().toISOString()
    });
    console.log(`Stored message for retry - ClientId: ${clientId}, Total pending: ${pendingMessages.get(clientId).length}`);
}

/**
 * Retries sending pending messages for a specific client
 * @param {string} clientId - The client ID to retry messages for
 */
async function retryPendingMessages(clientId) {
    if (!pendingMessages.has(clientId) || pendingMessages.get(clientId).length === 0) {
        return;
    }

    const messages = [...pendingMessages.get(clientId)];
    console.log(`Retrying ${messages.length} pending messages for clientId: ${clientId}`);

    const successfulMessages = [];
    
    for (const storedMessage of messages) {
        // Extract only clientId and message (exclude timestamp)
        const cleanMessageData = getCleanMessageData(storedMessage);
        const result = await sendNotification(cleanMessageData);
        
        if (result.success) {
            console.log(`Successfully sent retry message to clientId: ${clientId}`);
            successfulMessages.push(storedMessage);
        } else if (result.status === 500 && isWebSocketConnectionError(result.data)) {
            // Still not connected, keep the message
            console.log(`Client ${clientId} still not connected, keeping message for retry`);
        } else {
            // Different error, might want to handle differently
            console.log(`Unexpected error for clientId ${clientId}:`, result);
            successfulMessages.push(storedMessage); // Remove from retry queue
        }
    }

    // Remove successfully sent messages
    if (successfulMessages.length > 0) {
        const remaining = pendingMessages.get(clientId).filter(
            msg => !successfulMessages.some(success => 
                success.clientId === msg.clientId && 
                success.message === msg.message &&
                success.timestamp === msg.timestamp
            )
        );
        if (remaining.length === 0) {
            pendingMessages.delete(clientId);
        } else {
            pendingMessages.set(clientId, remaining);
        }
    }
}

/**
 * Retries all pending messages for all clients
 */
async function retryAllPendingMessages() {
    const clientIds = Array.from(pendingMessages.keys());
    console.log(`Retrying messages for ${clientIds.length} clients`);
    
    for (const clientId of clientIds) {
        await retryPendingMessages(clientId);
    }
}

// API endpoint to send notifications
app.post('/send-notification', async (req, res) => {
    try {
        const { clientId, message } = req.body;

        if (!clientId || !message) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Both clientId and message are required'
            });
        }

        const messageData = { clientId, message };
        const result = await sendNotification(messageData);

        if (result.success) {
            // Successfully sent, also retry any pending messages for this client
            await retryPendingMessages(clientId);
            return res.status(200).json({
                success: true,
                message: 'Notification sent successfully',
                data: result.data
            });
        } else if (result.status === 500 && isWebSocketConnectionError(result.data)) {
            // WebSocket not connected, store for retry
            storeMessageForRetry(clientId, messageData);
            return res.status(202).json({
                success: false,
                message: 'Message stored for retry - WebSocket not connected',
                stored: true,
                clientId: clientId,
                pendingCount: pendingMessages.get(clientId)?.length || 0
            });
        } else {
            // Other error
            return res.status(result.status || 500).json({
                success: false,
                error: 'Failed to send notification',
                details: result.data || result.error
            });
        }
    } catch (error) {
        console.error('Error in /send-notification:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// API endpoint to get pending messages for a client
app.get('/pending-messages/:clientId', (req, res) => {
    const { clientId } = req.params;
    const messages = pendingMessages.get(clientId) || [];
    
    return res.status(200).json({
        clientId,
        count: messages.length,
        messages: messages
    });
});

// API endpoint to get all pending messages
app.get('/pending-messages', (req, res) => {
    const allPending = {};
    pendingMessages.forEach((messages, clientId) => {
        allPending[clientId] = {
            count: messages.length,
            messages: messages
        };
    });
    
    return res.status(200).json({
        totalClients: pendingMessages.size,
        pending: allPending
    });
});

// API endpoint to manually trigger retry for a specific client
app.post('/retry/:clientId', async (req, res) => {
    const { clientId } = req.params;
    
    if (!pendingMessages.has(clientId)) {
        return res.status(404).json({
            error: 'No pending messages found',
            clientId: clientId
        });
    }

    await retryPendingMessages(clientId);
    
    const remaining = pendingMessages.get(clientId)?.length || 0;
    return res.status(200).json({
        message: 'Retry completed',
        clientId: clientId,
        remainingPending: remaining
    });
});

// API endpoint to manually trigger retry for all clients
app.post('/retry-all', async (req, res) => {
    await retryAllPendingMessages();
    
    const totalPending = Array.from(pendingMessages.values())
        .reduce((sum, messages) => sum + messages.length, 0);
    
    return res.status(200).json({
        message: 'Retry completed for all clients',
        totalPending: totalPending,
        clientsWithPending: pendingMessages.size
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        pendingMessagesCount: Array.from(pendingMessages.values())
            .reduce((sum, messages) => sum + messages.length, 0)
    });
});

// Start periodic retry mechanism (every 30 seconds)
setInterval(() => {
    retryAllPendingMessages();
}, 30000);

// Start the server
app.listen(PORT, () => {
    console.log(`Node.js backend server running on http://localhost:${PORT}`);
    console.log(`Ballerina API URL: ${BALLERINA_API_URL}`);
    console.log(`Retry interval: 30 seconds`);
    console.log('\nAvailable endpoints:');
    console.log('  POST   /send-notification  - Send a notification');
    console.log('  GET    /pending-messages   - Get all pending messages');
    console.log('  GET    /pending-messages/:clientId - Get pending messages for a client');
    console.log('  POST   /retry/:clientId    - Manually retry messages for a client');
    console.log('  POST   /retry-all          - Manually retry all pending messages');
    console.log('  GET    /health             - Health check');
});
