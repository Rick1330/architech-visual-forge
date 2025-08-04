/**
 * WebSocket Client for Real-time Simulation Communication
 * Handles direct connection to Simulation Orchestration Service
 */

import { logger } from '@/lib/logger';
import { errorHandler, ErrorType } from '@/lib/errorHandler';

export interface SimulationMessage {
  type: 'simulation_started' | 'simulation_stopped' | 'simulation_event' | 'simulation_metric' | 'error';
  session_id: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebSocketConfig {
  baseUrl?: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

type MessageHandler = (message: SimulationMessage) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (error: Event) => void;

class SimulationWebSocketClient {
  private ws: WebSocket | null = null;
  private baseUrl: string;
  private reconnectAttempts: number;
  private reconnectDelay: number;
  private currentAttempts = 0;
  private sessionId: string | null = null;
  private authToken: string | null = null;
  
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private disconnectionHandlers: Set<ConnectionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();

  constructor(config: WebSocketConfig = {}) {
    this.baseUrl = config.baseUrl || import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/api/v1';
    this.reconnectAttempts = config.reconnectAttempts || 5;
    this.reconnectDelay = config.reconnectDelay || 3000;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string) {
    this.authToken = token;
    logger.info('WebSocket auth token set', { 
      componentName: 'SimulationWebSocketClient',
      action: 'auth_token_set' 
    });
  }

  /**
   * Connect to simulation session WebSocket
   */
  connect(sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.sessionId = sessionId;
        const wsUrl = `${this.baseUrl}/simulations/${sessionId}/ws${this.authToken ? `?token=${this.authToken}` : ''}`;
        
        logger.info('Connecting to WebSocket', {
          componentName: 'SimulationWebSocketClient',
          action: 'websocket_connect',
          payload: { sessionId, wsUrl: wsUrl.replace(/token=[^&]+/, 'token=***') }
        });

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.currentAttempts = 0;
          logger.info('WebSocket connected', {
            componentName: 'SimulationWebSocketClient',
            action: 'websocket_connected',
            payload: { sessionId }
          });
          
          this.connectionHandlers.forEach(handler => handler());
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: SimulationMessage = JSON.parse(event.data);
            logger.debug('WebSocket message received', {
              componentName: 'SimulationWebSocketClient',
              action: 'websocket_message',
              payload: { messageType: message.type, sessionId: message.session_id }
            });
            
            this.messageHandlers.forEach(handler => handler(message));
          } catch (error) {
            logger.error('Failed to parse WebSocket message', {
              componentName: 'SimulationWebSocketClient',
              errorDetails: {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
              },
              payload: { rawMessage: event.data }
            });
          }
        };

        this.ws.onclose = (event) => {
          logger.warn('WebSocket connection closed', {
            componentName: 'SimulationWebSocketClient',
            action: 'websocket_closed',
            payload: { code: event.code, reason: event.reason, sessionId }
          });
          
          this.disconnectionHandlers.forEach(handler => handler());
          
          // Attempt reconnection if not a normal closure
          if (event.code !== 1000 && this.currentAttempts < this.reconnectAttempts) {
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          logger.error('WebSocket error', {
            componentName: 'SimulationWebSocketClient',
            action: 'websocket_error',
            payload: { sessionId }
          });
          
          this.errorHandlers.forEach(handler => handler(error));
          reject(new Error('WebSocket connection failed'));
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.ws) {
      logger.info('Disconnecting WebSocket', {
        componentName: 'SimulationWebSocketClient',
        action: 'websocket_disconnect',
        payload: { sessionId: this.sessionId }
      });
      
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  /**
   * Send message to WebSocket
   */
  send(message: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      logger.debug('WebSocket message sent', {
        componentName: 'SimulationWebSocketClient',
        action: 'websocket_send',
        payload: { messageType: message.type, sessionId: this.sessionId }
      });
    } else {
      logger.warn('Attempted to send message on closed WebSocket', {
        componentName: 'SimulationWebSocketClient',
        action: 'websocket_send_failed',
        payload: { sessionId: this.sessionId }
      });
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect() {
    if (this.currentAttempts >= this.reconnectAttempts || !this.sessionId) {
      return;
    }

    this.currentAttempts++;
    logger.info('Attempting WebSocket reconnection', {
      componentName: 'SimulationWebSocketClient',
      action: 'websocket_reconnect_attempt',
      payload: { 
        attempt: this.currentAttempts, 
        maxAttempts: this.reconnectAttempts,
        sessionId: this.sessionId
      }
    });

    setTimeout(() => {
      if (this.sessionId) {
        this.connect(this.sessionId).catch(() => {
          // Reconnection failed, will try again if attempts remain
        });
      }
    }, this.reconnectDelay);
  }

  /**
   * Add message handler
   */
  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Add connection handler
   */
  onConnect(handler: ConnectionHandler) {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  /**
   * Add disconnection handler
   */
  onDisconnect(handler: ConnectionHandler) {
    this.disconnectionHandlers.add(handler);
    return () => this.disconnectionHandlers.delete(handler);
  }

  /**
   * Add error handler
   */
  onError(handler: ErrorHandler) {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  /**
   * Get connection state
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get current session ID
   */
  get currentSessionId(): string | null {
    return this.sessionId;
  }
}

// Export singleton instance
export const simulationWebSocket = new SimulationWebSocketClient();
export default simulationWebSocket;