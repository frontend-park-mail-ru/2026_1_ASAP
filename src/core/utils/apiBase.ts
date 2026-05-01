const host = window.location.hostname;
const protocol = window.location.protocol;
const wsProtocol = protocol === 'https:' ? 'wss' : 'ws';

export const BASE_URL = __LOCAL_API__
    ? `${protocol}//${host}:8080`
    : `${protocol}//${host}`;

export const WS_BASE_URL = __LOCAL_API__
    ? `${wsProtocol}://${host}:8080`
    : `${wsProtocol}://${host}`;
