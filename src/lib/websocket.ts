export enum ResponseName {
    AuthenticationSuccessEvent = "authentication success",
    AuthenticationExpiredEvent = "authentication expired",

    ErrorEvent = "error",
}

export enum EventName {
    AuthenticationErrorEvent = "auth error",

    RequestUserDataEvent = "req user data",
    UserSetStatusEvent = "user set status",
    UserSendFriendRequestEvent = "user send friend request",

    CloseEvent = "close",
}

export interface Event {
    event: ResponseName | EventName;
    value: string[];
}

export enum Status {
    Offline = 0,
    Online = 1,
    Idle = 2,
    DoNotDisturb = 3,
    Invisible = 4,
}