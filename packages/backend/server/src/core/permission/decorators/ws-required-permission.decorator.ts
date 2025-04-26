import { SetMetadata } from '@nestjs/common';

export const WS_REQUIRED_PERMISSION_KEY = 'ws_required_permission';

/**
 * Decorator for setting the required permission level for WebSocket handlers
 * @param permission The required permission level
 */
export const WsRequiredPermission = (permission: string) =>
  SetMetadata(WS_REQUIRED_PERMISSION_KEY, permission);