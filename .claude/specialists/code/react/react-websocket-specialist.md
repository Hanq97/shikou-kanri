# React WebSocket Specialist
# React WebSocket スペシャリスト
# Chuyên Gia React WebSocket

**Version**: 1.0.0
**Stack**: React 19 + TypeScript 5 + SignalR (@microsoft/signalr)
**Architecture**: Real-Time Communication Pattern
**Integration**: C# ASP.NET Core SignalR Backend
**Last Updated**: 2025-12-31

---

## 🎯 PURPOSE

This specialist provides **25 WebSocket patterns** using SignalR for building real-time communication features with C# ASP.NET Core backends. Focus on connection management, message handling, reconnection strategies, and React hooks integration.

**Key Constraints**:
- ✅ **SignalR for WebSocket** (official ASP.NET Core integration)
- ✅ **Custom React hooks** (useSignalR, useNotifications)
- ✅ **Automatic reconnection** with exponential backoff
- ✅ **TypeScript for type safety**
- ❌ **NO Socket.IO** (use SignalR for .NET backends)
- ❌ **NO manual WebSocket API** (use SignalR abstraction)
- ❌ **NO polling** (use WebSocket for real-time)

---

## 📚 PATTERN INDEX (25 Patterns)

### **Connection Management** (5 patterns)
1. signalr-connection-creation
2. automatic-reconnection
3. connection-lifecycle-events
4. connection-state-management
5. connection-error-handling

### **Custom Hooks** (5 patterns)
6. use-signalr-hook
7. use-notifications-hook
8. use-chat-hook
9. use-presence-hook
10. use-realtime-data-hook

### **Message Handling** (5 patterns)
11. server-to-client-events
12. client-to-server-methods
13. typed-message-handling
14. message-acknowledgment
15. message-buffering

### **Group & User Management** (5 patterns)
16. join-leave-groups
17. user-specific-messages
18. broadcast-to-group
19. private-messaging
20. presence-tracking

### **Advanced Patterns** (5 patterns)
21. streaming-data
22. hub-proxy-pattern
23. multiple-hubs
24. authentication-integration
25. offline-message-queue

---

## 📖 PATTERN DETAILS

### Pattern 1: signalr-connection-creation
**Category**: Connection Management
**Description**: Create and configure SignalR connection

```typescript
// services/signalRService.ts
import * as signalR from '@microsoft/signalr';

export function createSignalRConnection(hubUrl: string): signalR.HubConnection {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => getAccessToken() || '',
    })
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: (retryContext) => {
        // Exponential backoff: 0s, 2s, 10s, 30s, 60s
        if (retryContext.previousRetryCount === 0) return 0;
        if (retryContext.previousRetryCount === 1) return 2000;
        if (retryContext.previousRetryCount === 2) return 10000;
        if (retryContext.previousRetryCount === 3) return 30000;
        return 60000;
      },
    })
    .configureLogging(signalR.LogLevel.Information)
    .build();

  return connection;
}

function getAccessToken(): string | null {
  // Token from httpOnly cookie (sent automatically)
  return null;
}
```

**Why This Pattern**:
- ✅ Automatic token injection
- ✅ Exponential backoff for reconnection
- ✅ Configurable logging
- ✅ Type-safe connection

---

### Pattern 2: automatic-reconnection
**Category**: Connection Management
**Description**: Handle automatic reconnection with state updates

```typescript
// hooks/useSignalR.ts
import { useState, useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';

export function useSignalR(hubUrl: string) {
  const [connectionState, setConnectionState] = useState<signalR.HubConnectionState>(
    signalR.HubConnectionState.Disconnected
  );
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    const connection = createSignalRConnection(hubUrl);

    connection.onreconnecting(() => {
      setConnectionState(signalR.HubConnectionState.Reconnecting);
    });

    connection.onreconnected(() => {
      setConnectionState(signalR.HubConnectionState.Connected);
      console.log('SignalR reconnected');
    });

    connection.onclose(() => {
      setConnectionState(signalR.HubConnectionState.Disconnected);
      console.log('SignalR connection closed');
    });

    connection.start()
      .then(() => {
        setConnectionState(signalR.HubConnectionState.Connected);
        console.log('SignalR connected');
      })
      .catch((err) => {
        console.error('SignalR connection failed', err);
      });

    connectionRef.current = connection;

    return () => {
      connection.stop();
    };
  }, [hubUrl]);

  return { connection: connectionRef.current, connectionState };
}
```

**Why This Pattern**:
- ✅ Automatic reconnection on disconnect
- ✅ Connection state tracking
- ✅ Lifecycle event handling
- ✅ Cleanup on unmount

---

### Pattern 3: connection-lifecycle-events
**Category**: Connection Management
**Description**: Handle all connection lifecycle events

```typescript
// hooks/useConnectionLifecycle.ts
import { useEffect } from 'react';
import * as signalR from '@microsoft/signalr';

export function useConnectionLifecycle(
  connection: signalR.HubConnection | null,
  callbacks: {
    onConnected?: () => void;
    onReconnecting?: () => void;
    onReconnected?: () => void;
    onDisconnected?: () => void;
  }
) {
  useEffect(() => {
    if (!connection) return;

    const handleReconnecting = () => {
      console.log('Reconnecting...');
      callbacks.onReconnecting?.();
    };

    const handleReconnected = (connectionId?: string) => {
      console.log('Reconnected', connectionId);
      callbacks.onReconnected?.();
    };

    const handleClose = (error?: Error) => {
      console.log('Disconnected', error);
      callbacks.onDisconnected?.();
    };

    connection.onreconnecting(handleReconnecting);
    connection.onreconnected(handleReconnected);
    connection.onclose(handleClose);

    return () => {
      connection.off('reconnecting', handleReconnecting);
      connection.off('reconnected', handleReconnected);
      connection.off('close', handleClose);
    };
  }, [connection, callbacks]);
}
```

**Why This Pattern**:
- ✅ Centralized lifecycle management
- ✅ Callback-based event handling
- ✅ Proper cleanup

---

### Pattern 4: connection-state-management
**Category**: Connection Management
**Description**: Track and display connection state in UI

```typescript
// components/ConnectionStatus.tsx
import { useMemo } from 'react';
import * as signalR from '@microsoft/signalr';

interface ConnectionStatusProps {
  state: signalR.HubConnectionState;
}

export function ConnectionStatus({ state }: ConnectionStatusProps) {
  const { color, label } = useMemo(() => {
    switch (state) {
      case signalR.HubConnectionState.Connected:
        return { color: 'bg-green-500', label: 'Connected' };
      case signalR.HubConnectionState.Connecting:
        return { color: 'bg-yellow-500', label: 'Connecting...' };
      case signalR.HubConnectionState.Reconnecting:
        return { color: 'bg-orange-500', label: 'Reconnecting...' };
      case signalR.HubConnectionState.Disconnected:
        return { color: 'bg-red-500', label: 'Disconnected' };
      default:
        return { color: 'bg-gray-500', label: 'Unknown' };
    }
  }, [state]);

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Visual connection status
- ✅ User awareness of connectivity
- ✅ Responsive UI

---

### Pattern 5: connection-error-handling
**Category**: Connection Management
**Description**: Handle connection errors gracefully

```typescript
// hooks/useSignalRWithErrorHandling.ts
import { useState } from 'react';
import { toast } from '@/components/ui/use-toast';

export function useSignalRWithErrorHandling(hubUrl: string) {
  const [error, setError] = useState<Error | null>(null);
  const { connection, connectionState } = useSignalR(hubUrl);

  useEffect(() => {
    if (!connection) return;

    connection.onclose((error) => {
      if (error) {
        setError(error);
        toast({
          title: 'Connection Error',
          description: error.message || 'Failed to connect to server',
          variant: 'destructive',
        });
      }
    });
  }, [connection]);

  return { connection, connectionState, error };
}
```

**Why This Pattern**:
- ✅ User-friendly error messages
- ✅ Error state tracking
- ✅ Toast notifications

---

### Pattern 6: use-signalr-hook
**Category**: Custom Hooks
**Description**: Reusable SignalR hook with full lifecycle

```typescript
// hooks/useSignalR.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';

interface UseSignalROptions {
  onConnected?: () => void;
  onDisconnected?: () => void;
  autoConnect?: boolean;
}

export function useSignalR(hubUrl: string, options: UseSignalROptions = {}) {
  const [connectionState, setConnectionState] = useState<signalR.HubConnectionState>(
    signalR.HubConnectionState.Disconnected
  );
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const connect = useCallback(async () => {
    if (!connectionRef.current) {
      connectionRef.current = createSignalRConnection(hubUrl);
      setupConnectionEvents(connectionRef.current);
    }

    if (connectionRef.current.state === signalR.HubConnectionState.Disconnected) {
      await connectionRef.current.start();
      setConnectionState(signalR.HubConnectionState.Connected);
      options.onConnected?.();
    }
  }, [hubUrl, options]);

  const disconnect = useCallback(async () => {
    if (connectionRef.current) {
      await connectionRef.current.stop();
      setConnectionState(signalR.HubConnectionState.Disconnected);
      options.onDisconnected?.();
    }
  }, [options]);

  const setupConnectionEvents = (connection: signalR.HubConnection) => {
    connection.onreconnecting(() => {
      setConnectionState(signalR.HubConnectionState.Reconnecting);
    });

    connection.onreconnected(() => {
      setConnectionState(signalR.HubConnectionState.Connected);
    });

    connection.onclose(() => {
      setConnectionState(signalR.HubConnectionState.Disconnected);
      options.onDisconnected?.();
    });
  };

  useEffect(() => {
    if (options.autoConnect !== false) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, options.autoConnect]);

  return {
    connection: connectionRef.current,
    connectionState,
    connect,
    disconnect,
  };
}
```

**Why This Pattern**:
- ✅ Reusable across components
- ✅ Manual connect/disconnect control
- ✅ Lifecycle callbacks

---

### Pattern 7: use-notifications-hook
**Category**: Custom Hooks
**Description**: Hook for real-time notifications

```typescript
// hooks/useNotifications.ts
import { useState, useEffect } from 'react';
import { useSignalR } from './useSignalR';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { connection, connectionState } = useSignalR('/hubs/notifications');

  useEffect(() => {
    if (!connection) return;

    // Server → Client: New notification
    connection.on('ReceiveNotification', (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      toast({
        title: notification.title,
        description: notification.message,
      });
    });

    // Server → Client: Unread count updated
    connection.on('UnreadCountUpdated', (count: number) => {
      setUnreadCount(count);
    });

    return () => {
      connection.off('ReceiveNotification');
      connection.off('UnreadCountUpdated');
    };
  }, [connection]);

  const markAsRead = async (notificationId: string) => {
    if (!connection) return;

    await connection.invoke('MarkAsRead', notificationId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  return {
    notifications,
    unreadCount,
    connectionState,
    markAsRead,
  };
}
```

**Why This Pattern**:
- ✅ Encapsulates notification logic
- ✅ Real-time updates
- ✅ Two-way communication (Client → Server RPC)

---

### Pattern 8: use-chat-hook
**Category**: Custom Hooks
**Description**: Hook for real-time chat

```typescript
// hooks/useChat.ts
import { useState, useEffect } from 'react';
import { useSignalR } from './useSignalR';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
}

export function useChat(roomId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState<string[]>([]);
  const { connection, connectionState } = useSignalR('/hubs/chat');

  useEffect(() => {
    if (!connection) return;

    // Join room
    connection.invoke('JoinRoom', roomId);

    // Server → Client: New message
    connection.on('ReceiveMessage', (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    // Server → Client: User typing
    connection.on('UserTyping', (userId: string, userName: string) => {
      setIsTyping((prev) => [...prev, userName]);
    });

    // Server → Client: User stopped typing
    connection.on('UserStoppedTyping', (userId: string, userName: string) => {
      setIsTyping((prev) => prev.filter((name) => name !== userName));
    });

    return () => {
      connection.invoke('LeaveRoom', roomId);
      connection.off('ReceiveMessage');
      connection.off('UserTyping');
      connection.off('UserStoppedTyping');
    };
  }, [connection, roomId]);

  const sendMessage = async (message: string) => {
    if (!connection) return;
    await connection.invoke('SendMessage', roomId, message);
  };

  const notifyTyping = async () => {
    if (!connection) return;
    await connection.invoke('NotifyTyping', roomId);
  };

  return {
    messages,
    isTyping,
    connectionState,
    sendMessage,
    notifyTyping,
  };
}
```

**Why This Pattern**:
- ✅ Chat room management
- ✅ Typing indicators
- ✅ Message history

---

### Pattern 9: use-presence-hook
**Category**: Custom Hooks
**Description**: Track online/offline user presence

```typescript
// hooks/usePresence.ts
import { useState, useEffect } from 'react';
import { useSignalR } from './useSignalR';

interface UserPresence {
  userId: string;
  userName: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: string;
}

export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const { connection, connectionState } = useSignalR('/hubs/presence');

  useEffect(() => {
    if (!connection) return;

    // Server → Client: User went online
    connection.on('UserOnline', (user: UserPresence) => {
      setOnlineUsers((prev) => [...prev.filter((u) => u.userId !== user.userId), user]);
    });

    // Server → Client: User went offline
    connection.on('UserOffline', (userId: string) => {
      setOnlineUsers((prev) => prev.filter((u) => u.userId !== userId));
    });

    // Server → Client: Initial online users list
    connection.on('OnlineUsersList', (users: UserPresence[]) => {
      setOnlineUsers(users);
    });

    // Request initial list
    connection.invoke('GetOnlineUsers');

    return () => {
      connection.off('UserOnline');
      connection.off('UserOffline');
      connection.off('OnlineUsersList');
    };
  }, [connection]);

  return {
    onlineUsers,
    connectionState,
  };
}
```

**Why This Pattern**:
- ✅ User presence tracking
- ✅ Real-time status updates
- ✅ Online user list

---

### Pattern 10: use-realtime-data-hook
**Category**: Custom Hooks
**Description**: Hook for real-time data updates

```typescript
// hooks/useRealtimeData.ts
import { useState, useEffect } from 'react';
import { useSignalR } from './useSignalR';

interface DataUpdate<T> {
  type: 'create' | 'update' | 'delete';
  data: T;
}

export function useRealtimeData<T>(hubUrl: string, entityName: string) {
  const [data, setData] = useState<T[]>([]);
  const { connection, connectionState } = useSignalR(hubUrl);

  useEffect(() => {
    if (!connection) return;

    // Server → Client: Data updated
    connection.on(`${entityName}Updated`, (update: DataUpdate<T>) => {
      setData((prev) => {
        switch (update.type) {
          case 'create':
            return [...prev, update.data];
          case 'update':
            return prev.map((item: any) =>
              item.id === (update.data as any).id ? update.data : item
            );
          case 'delete':
            return prev.filter((item: any) => item.id !== (update.data as any).id);
          default:
            return prev;
        }
      });
    });

    return () => {
      connection.off(`${entityName}Updated`);
    };
  }, [connection, entityName]);

  return {
    data,
    connectionState,
  };
}
```

**Why This Pattern**:
- ✅ Generic real-time data sync
- ✅ CRUD operation handling
- ✅ Optimistic UI updates

---

### Pattern 11: server-to-client-events
**Category**: Message Handling
**Description**: Handle server-to-client event messages

```typescript
// components/LiveDashboard.tsx
import { useEffect } from 'react';
import { useSignalR } from '@/hooks/useSignalR';

export function LiveDashboard() {
  const { connection } = useSignalR('/hubs/dashboard');

  useEffect(() => {
    if (!connection) return;

    // Server → Client: Stats updated
    connection.on('StatsUpdated', (stats: DashboardStats) => {
      console.log('Stats updated', stats);
      // Update UI with new stats
    });

    // Server → Client: Alert triggered
    connection.on('AlertTriggered', (alert: Alert) => {
      toast({
        title: alert.title,
        description: alert.message,
        variant: 'destructive',
      });
    });

    return () => {
      connection.off('StatsUpdated');
      connection.off('AlertTriggered');
    };
  }, [connection]);

  return <div>Dashboard content</div>;
}
```

**Why This Pattern**:
- ✅ Event-driven architecture
- ✅ Clean separation of concerns
- ✅ Type-safe event handling

---

### Pattern 12: client-to-server-methods
**Category**: Message Handling
**Description**: Invoke server methods from client (RPC)

```typescript
// services/chatService.ts
import * as signalR from '@microsoft/signalr';

export async function sendChatMessage(
  connection: signalR.HubConnection,
  roomId: string,
  message: string
) {
  try {
    // Client → Server RPC call
    await connection.invoke('SendMessage', roomId, message);
  } catch (error) {
    console.error('Failed to send message', error);
    throw error;
  }
}

export async function joinChatRoom(
  connection: signalR.HubConnection,
  roomId: string
) {
  try {
    await connection.invoke('JoinRoom', roomId);
  } catch (error) {
    console.error('Failed to join room', error);
    throw error;
  }
}
```

**Why This Pattern**:
- ✅ Type-safe RPC calls
- ✅ Error handling
- ✅ Clean service abstraction

---

### Pattern 13: typed-message-handling
**Category**: Message Handling
**Description**: Use TypeScript interfaces for message types

```typescript
// types/signalr.ts
export interface NotificationMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  read: boolean;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
}

// hooks/useTypedNotifications.ts
import { useEffect, useState } from 'react';
import { useSignalR } from './useSignalR';
import { NotificationMessage } from '@/types/signalr';

export function useTypedNotifications() {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const { connection } = useSignalR('/hubs/notifications');

  useEffect(() => {
    if (!connection) return;

    connection.on('ReceiveNotification', (notification: NotificationMessage) => {
      setNotifications((prev) => [notification, ...prev]);
    });

    return () => {
      connection.off('ReceiveNotification');
    };
  }, [connection]);

  return { notifications };
}
```

**Why This Pattern**:
- ✅ Type safety
- ✅ IDE autocomplete
- ✅ Compile-time error checking

---

### Pattern 14: message-acknowledgment
**Category**: Message Handling
**Description**: Acknowledge message receipt

```typescript
// hooks/useAcknowledgedMessages.ts
export function useAcknowledgedMessages() {
  const { connection } = useSignalR('/hubs/messages');

  useEffect(() => {
    if (!connection) return;

    connection.on('ReceiveMessage', async (message: Message) => {
      // Process message
      console.log('Received message', message);

      // Send acknowledgment
      await connection.invoke('AcknowledgeMessage', message.id);
    });

    return () => {
      connection.off('ReceiveMessage');
    };
  }, [connection]);
}
```

**Why This Pattern**:
- ✅ Reliable message delivery
- ✅ Server can track delivery status
- ✅ Prevents duplicate processing

---

### Pattern 15: message-buffering
**Category**: Message Handling
**Description**: Buffer messages when disconnected, send on reconnect

```typescript
// hooks/useBufferedMessages.ts
import { useRef } from 'react';

export function useBufferedMessages() {
  const { connection, connectionState } = useSignalR('/hubs/messages');
  const messageBuffer = useRef<string[]>([]);

  const sendMessage = async (message: string) => {
    if (connectionState === signalR.HubConnectionState.Connected && connection) {
      await connection.invoke('SendMessage', message);
    } else {
      // Buffer message if disconnected
      messageBuffer.current.push(message);
    }
  };

  useEffect(() => {
    if (connectionState === signalR.HubConnectionState.Connected && connection) {
      // Send buffered messages on reconnect
      while (messageBuffer.current.length > 0) {
        const message = messageBuffer.current.shift()!;
        connection.invoke('SendMessage', message);
      }
    }
  }, [connectionState, connection]);

  return { sendMessage };
}
```

**Why This Pattern**:
- ✅ Handles offline scenarios
- ✅ No message loss
- ✅ Automatic retry on reconnect

---

### Pattern 16: join-leave-groups
**Category**: Group & User Management
**Description**: Join and leave SignalR groups

```typescript
// hooks/useRoomManagement.ts
export function useRoomManagement(roomId: string) {
  const { connection } = useSignalR('/hubs/chat');

  useEffect(() => {
    if (!connection) return;

    // Join room on mount
    connection.invoke('JoinRoom', roomId);

    return () => {
      // Leave room on unmount
      connection.invoke('LeaveRoom', roomId);
    };
  }, [connection, roomId]);
}
```

**Why This Pattern**:
- ✅ Automatic group management
- ✅ Cleanup on unmount
- ✅ Room-specific messages

---

### Pattern 17: user-specific-messages
**Category**: Group & User Management
**Description**: Send messages to specific users

```typescript
// services/messageService.ts
export async function sendDirectMessage(
  connection: signalR.HubConnection,
  userId: string,
  message: string
) {
  await connection.invoke('SendDirectMessage', userId, message);
}

// C# Backend Hub
public async Task SendDirectMessage(string userId, string message)
{
    await Clients.User(userId).SendAsync("ReceiveDirectMessage", message);
}
```

**Why This Pattern**:
- ✅ Private messaging
- ✅ User-specific notifications
- ✅ Targeted communication

---

### Pattern 18: broadcast-to-group
**Category**: Group & User Management
**Description**: Broadcast messages to all group members

```typescript
// services/groupService.ts
export async function broadcastToGroup(
  connection: signalR.HubConnection,
  groupName: string,
  message: string
) {
  await connection.invoke('BroadcastToGroup', groupName, message);
}

// C# Backend Hub
public async Task BroadcastToGroup(string groupName, string message)
{
    await Clients.Group(groupName).SendAsync("ReceiveGroupMessage", message);
}
```

**Why This Pattern**:
- ✅ Group-wide notifications
- ✅ Team chat
- ✅ Multi-user collaboration

---

### Pattern 19: private-messaging
**Category**: Group & User Management
**Description**: One-to-one private messaging

```typescript
// hooks/usePrivateMessages.ts
export function usePrivateMessages(recipientId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const { connection } = useSignalR('/hubs/messages');

  useEffect(() => {
    if (!connection) return;

    connection.on('ReceivePrivateMessage', (message: Message) => {
      if (message.senderId === recipientId || message.recipientId === recipientId) {
        setMessages((prev) => [...prev, message]);
      }
    });

    return () => {
      connection.off('ReceivePrivateMessage');
    };
  }, [connection, recipientId]);

  const sendPrivateMessage = async (message: string) => {
    if (!connection) return;
    await connection.invoke('SendPrivateMessage', recipientId, message);
  };

  return { messages, sendPrivateMessage };
}
```

**Why This Pattern**:
- ✅ Secure private messaging
- ✅ Conversation history
- ✅ Real-time delivery

---

### Pattern 20: presence-tracking
**Category**: Group & User Management
**Description**: Track user online/offline status

```typescript
// hooks/useUserPresence.ts
export function useUserPresence(userId: string) {
  const [isOnline, setIsOnline] = useState(false);
  const { connection } = useSignalR('/hubs/presence');

  useEffect(() => {
    if (!connection) return;

    connection.on('UserStatusChanged', (changedUserId: string, status: boolean) => {
      if (changedUserId === userId) {
        setIsOnline(status);
      }
    });

    // Check initial status
    connection.invoke('GetUserStatus', userId).then(setIsOnline);

    return () => {
      connection.off('UserStatusChanged');
    };
  }, [connection, userId]);

  return { isOnline };
}
```

**Why This Pattern**:
- ✅ User availability tracking
- ✅ Online indicators
- ✅ Real-time status updates

---

### Pattern 21: streaming-data
**Category**: Advanced Patterns
**Description**: Stream large data from server

```typescript
// hooks/useDataStream.ts
export function useDataStream() {
  const [streamData, setStreamData] = useState<number[]>([]);
  const { connection } = useSignalR('/hubs/stream');

  const startStream = async () => {
    if (!connection) return;

    const stream = connection.stream<number>('StreamData');

    stream.subscribe({
      next: (value) => {
        setStreamData((prev) => [...prev, value]);
      },
      error: (err) => {
        console.error('Stream error', err);
      },
      complete: () => {
        console.log('Stream complete');
      },
    });
  };

  return { streamData, startStream };
}

// C# Backend Hub
public async IAsyncEnumerable<int> StreamData()
{
    for (int i = 0; i < 10; i++)
    {
        await Task.Delay(1000);
        yield return i;
    }
}
```

**Why This Pattern**:
- ✅ Efficient large data transfer
- ✅ Real-time data streaming
- ✅ Backpressure handling

---

### Pattern 22: hub-proxy-pattern
**Category**: Advanced Patterns
**Description**: Create type-safe hub proxy

```typescript
// services/hubProxy.ts
import * as signalR from '@microsoft/signalr';

export class NotificationHubProxy {
  constructor(private connection: signalR.HubConnection) {}

  // Client → Server methods
  async markAsRead(notificationId: string): Promise<void> {
    await this.connection.invoke('MarkAsRead', notificationId);
  }

  async getNotifications(): Promise<Notification[]> {
    return await this.connection.invoke<Notification[]>('GetNotifications');
  }

  // Server → Client event listeners
  onNotificationReceived(callback: (notification: Notification) => void): void {
    this.connection.on('ReceiveNotification', callback);
  }

  offNotificationReceived(): void {
    this.connection.off('ReceiveNotification');
  }
}

// Usage
const proxy = new NotificationHubProxy(connection);
proxy.onNotificationReceived((notification) => {
  console.log('Notification received', notification);
});
```

**Why This Pattern**:
- ✅ Type-safe API
- ✅ Encapsulation
- ✅ Easier testing

---

### Pattern 23: multiple-hubs
**Category**: Advanced Patterns
**Description**: Connect to multiple SignalR hubs

```typescript
// hooks/useMultipleHubs.ts
export function useMultipleHubs() {
  const notifications = useSignalR('/hubs/notifications');
  const chat = useSignalR('/hubs/chat');
  const presence = useSignalR('/hubs/presence');

  return {
    notifications,
    chat,
    presence,
  };
}
```

**Why This Pattern**:
- ✅ Separate concerns
- ✅ Independent connection management
- ✅ Modular architecture

---

### Pattern 24: authentication-integration
**Category**: Advanced Patterns
**Description**: Integrate authentication with SignalR

```typescript
// services/signalRService.ts
export function createAuthenticatedConnection(hubUrl: string): signalR.HubConnection {
  return new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: async () => {
        // Token from httpOnly cookie (automatic)
        // Or get from auth service
        const token = await getAccessToken();
        return token || '';
      },
    })
    .withAutomaticReconnect()
    .build();
}
```

**Why This Pattern**:
- ✅ Secure authentication
- ✅ Token-based access
- ✅ Automatic token refresh

---

### Pattern 25: offline-message-queue
**Category**: Advanced Patterns
**Description**: Queue messages when offline, send when online

```typescript
// hooks/useOfflineQueue.ts
import { useRef, useEffect } from 'react';

interface QueuedMessage {
  method: string;
  args: any[];
}

export function useOfflineQueue() {
  const { connection, connectionState } = useSignalR('/hubs/messages');
  const queue = useRef<QueuedMessage[]>([]);

  const invoke = async (method: string, ...args: any[]) => {
    if (connectionState === signalR.HubConnectionState.Connected && connection) {
      await connection.invoke(method, ...args);
    } else {
      queue.current.push({ method, args });
    }
  };

  useEffect(() => {
    if (connectionState === signalR.HubConnectionState.Connected && connection) {
      // Process queue
      while (queue.current.length > 0) {
        const { method, args } = queue.current.shift()!;
        connection.invoke(method, ...args);
      }
    }
  }, [connectionState, connection]);

  return { invoke };
}
```

**Why This Pattern**:
- ✅ Offline resilience
- ✅ No message loss
- ✅ Automatic sync on reconnect

---

## ❌ PROHIBITED PATTERNS

### 1. Using Socket.IO instead of SignalR
```typescript
// ❌ BAD
import io from 'socket.io-client';
const socket = io('http://localhost:5000');

// ✅ GOOD
import * as signalR from '@microsoft/signalr';
const connection = createSignalRConnection('/hubs/notifications');
```

### 2. Manual WebSocket API
```typescript
// ❌ BAD
const ws = new WebSocket('ws://localhost:5000/hub');

// ✅ GOOD
const connection = createSignalRConnection('/hubs/notifications');
```

### 3. Polling instead of WebSocket
```typescript
// ❌ BAD
setInterval(() => {
  fetch('/api/notifications').then(/*...*/);
}, 5000);

// ✅ GOOD
connection.on('ReceiveNotification', (notification) => {/*...*/});
```

### 4. No reconnection handling
```typescript
// ❌ BAD
const connection = new signalR.HubConnectionBuilder()
  .withUrl('/hubs/chat')
  .build();

// ✅ GOOD
const connection = new signalR.HubConnectionBuilder()
  .withUrl('/hubs/chat')
  .withAutomaticReconnect()
  .build();
```

---

## 🎯 INTEGRATION WITH C# BACKEND

### Backend SignalR Hub
```csharp
// Hubs/NotificationHub.cs
using Microsoft.AspNetCore.SignalR;

public class NotificationHub : Hub
{
    // Client → Server
    public async Task MarkAsRead(string notificationId)
    {
        // Mark notification as read in database
        await Clients.Caller.SendAsync("NotificationMarkedAsRead", notificationId);
    }

    // Server → Client (triggered from backend service)
    public async Task SendNotification(string userId, Notification notification)
    {
        await Clients.User(userId).SendAsync("ReceiveNotification", notification);
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{userId}");
        await base.OnConnectedAsync();
    }
}
```

### Frontend Integration
```typescript
// hooks/useNotifications.ts
export function useNotifications() {
  const { connection } = useSignalR('/hubs/notifications');

  useEffect(() => {
    if (!connection) return;

    connection.on('ReceiveNotification', (notification: Notification) => {
      console.log('Notification received', notification);
    });

    return () => {
      connection.off('ReceiveNotification');
    };
  }, [connection]);

  const markAsRead = async (id: string) => {
    await connection?.invoke('MarkAsRead', id);
  };

  return { markAsRead };
}
```

---

## 📊 PERFORMANCE CONSIDERATIONS

### Connection Pooling
- ✅ Reuse connection across components
- ✅ Context provider for shared connection
- ❌ Don't create multiple connections to same hub

### Message Batching
- ✅ Batch multiple updates into single message
- ✅ Debounce frequent updates
- ❌ Don't send individual updates for high-frequency data

### Selective Subscriptions
- ✅ Only subscribe to needed events
- ✅ Unsubscribe when component unmounts
- ❌ Don't subscribe to all events globally

---

## 🔒 SECURITY BEST PRACTICES

### Authentication
- ✅ Use JWT tokens in accessTokenFactory
- ✅ Validate tokens on server
- ✅ Implement user groups for authorization

### Authorization
- ✅ Check user permissions in hub methods
- ✅ Use [Authorize] attribute on hub
- ✅ Implement user-specific message filtering

### Data Validation
- ✅ Validate all client inputs on server
- ✅ Sanitize HTML content
- ✅ Rate limit hub method calls

---

**END OF DOCUMENT**
