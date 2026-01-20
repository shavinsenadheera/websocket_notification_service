import ballerina/http;
import ballerina/websocket;
import ballerina/log;

// In-memory WebSocket session registry
final map<websocket:Caller> wsSessions = {};

// ---------------- WebSocket Service ----------------
service class WsService {
    *websocket:Service;
    final string clientId;

    function init(string clientId) {
        self.clientId = clientId;
    }

    remote function onOpen(websocket:Caller caller) returns error? {
        lock {
            wsSessions[self.clientId] = caller;
        }
        log:printInfo(string `WebSocket connected: ${self.clientId}`);
    }

    remote function onClose(websocket:Caller caller, int statusCode, string reason) returns error? {
        lock {
            _ = wsSessions.remove(self.clientId);
        }
        log:printInfo(string `WebSocket disconnected: ${self.clientId} (status: ${statusCode}, reason: ${reason})`);
    }
}

// WebSocket upgrade service
service /ws on new websocket:Listener(9090) {
    resource function get .(http:Request req) 
            returns websocket:Service|websocket:UpgradeError {
        map<string|string[]> queryParams = req.getQueryParams();
        string|string[]? clientIdParam = queryParams["clientId"];
        string clientIdValue = "unknown";
        if clientIdParam is string {
            clientIdValue = clientIdParam;
        } else if clientIdParam is string[] && clientIdParam.length() > 0 {
            clientIdValue = clientIdParam[0];
        }
        
        log:printInfo(string `WebSocket upgrade request for clientId: ${clientIdValue}`);
        return new WsService(clientIdValue);
    }
}

// ---------------- REST API ----------------
service /notify on new http:Listener(8080) {

    resource function post send(NotificationRequest payload) 
            returns SuccessResponse|ErrorResponse|error {
        
        string clientId = payload.clientId;
        string message = payload.message;

        websocket:Caller? wsConnection = ();
        lock {
            wsConnection = wsSessions[clientId];
        }

        if wsConnection is () {
            log:printError(string `WebSocket not connected for clientId: ${clientId}. Cannot deliver message.`);
            
            ErrorResponse errorResponse = {
                body: {
                    'error: "WebSocket connection not found",
                    clientId: clientId,
                    message: string `Client ${clientId} is not connected via WebSocket`
                }
            };
            return errorResponse;
        }

        error? sendResult = wsConnection->writeTextMessage(message);
        if sendResult is error {
            string errorMsg = sendResult.message();
            log:printError(string `Failed to send WebSocket message to clientId: ${clientId}, error: ${errorMsg}`);
            
            ErrorResponse errorResponse = {
                body: {
                    'error: "Failed to send message",
                    clientId: clientId,
                    message: errorMsg
                }
            };
            return errorResponse;
        }
        
        log:printInfo(string `Message sent successfully to WebSocket clientId: ${clientId}`);
        SuccessResponse successResponse = {
            body: {
                success: true,
                clientId: clientId,
                message: "Message sent via WebSocket successfully"
            }
        };
        return successResponse;
    }
}
