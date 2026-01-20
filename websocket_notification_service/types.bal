import ballerina/http;

// Request and response types for the notification service

type NotificationRequest record {|
    string clientId;
    string message;
|};

type SuccessResponse record {|
    *http:Ok;
    record {|
        boolean success;
        string clientId;
        string message;
    |} body;
|};



type ErrorResponse record {|
    *http:InternalServerError;
    record {|
        string 'error;
        string clientId;
        string message;
    |} body;
|};
