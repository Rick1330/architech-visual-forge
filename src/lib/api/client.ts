/**
 * API Client for Architech Backend Integration
 * Handles RESTful API communication via API Gateway
 */

import { logger } from '@/lib/logger';
import { errorHandler, ErrorType } from '@/lib/errorHandler';

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
}

class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1') {
    this.baseUrl = baseUrl;
    this.loadAuthToken();
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string) {
    this.authToken = token;
    localStorage.setItem('architech_auth_token', token);
    logger.info('Authentication token set', { action: 'auth_token_set' });
  }

  /**
   * Clear authentication token
   */
  clearAuthToken() {
    this.authToken = null;
    localStorage.removeItem('architech_auth_token');
    logger.info('Authentication token cleared', { action: 'auth_token_cleared' });
  }

  /**
   * Load auth token from localStorage
   */
  private loadAuthToken() {
    const token = localStorage.getItem('architech_auth_token');
    if (token) {
      this.authToken = token;
    }
  }

  /**
   * Get default headers with authentication
   */
  private getDefaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Make HTTP request
   */
  private async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: config.method || 'GET',
        headers: {
          ...this.getDefaultHeaders(),
          ...config.headers,
        },
        body: config.body ? JSON.stringify(config.body) : undefined,
      });

      const duration = Date.now() - startTime;
      logger.apiCall(endpoint, config.method || 'GET', duration, response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw errorHandler.handleNetworkError(
          new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`),
          endpoint
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.apiCall(endpoint, config.method || 'GET', duration, 0);
      
      if (error instanceof Error) {
        throw errorHandler.handleNetworkError(error, endpoint);
      }
      throw error;
    }
  }

  // User Management API
  async login(email: string, password: string) {
    return this.request<{ token: string; user: any }>('/users/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  async register(userData: { email: string; password: string; name: string }) {
    return this.request<{ token: string; user: any }>('/users/register', {
      method: 'POST',
      body: userData,
    });
  }

  async getCurrentUser() {
    return this.request<any>('/users/me');
  }

  // Project Management API
  async getProjects() {
    return this.request<any[]>('/projects');
  }

  async getProject(projectId: string) {
    return this.request<any>(`/projects/${projectId}`);
  }

  async createProject(projectData: { name: string; description?: string }) {
    return this.request<any>('/projects', {
      method: 'POST',
      body: projectData,
    });
  }

  async updateProject(projectId: string, projectData: Partial<{ name: string; description: string }>) {
    return this.request<any>(`/projects/${projectId}`, {
      method: 'PUT',
      body: projectData,
    });
  }

  async deleteProject(projectId: string) {
    return this.request<void>(`/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  // Design Management API
  async getDesigns(projectId?: string) {
    const endpoint = projectId ? `/designs?project_id=${projectId}` : '/designs';
    return this.request<any[]>(endpoint);
  }

  async getDesign(designId: string) {
    return this.request<any>(`/designs/${designId}`);
  }

  async createDesign(designData: { 
    name: string; 
    project_id: string; 
    design_data: any;
    description?: string;
  }) {
    return this.request<any>('/designs', {
      method: 'POST',
      body: designData,
    });
  }

  async updateDesign(designId: string, designData: Partial<{
    name: string;
    design_data: any;
    description: string;
  }>) {
    return this.request<any>(`/designs/${designId}`, {
      method: 'PUT',
      body: designData,
    });
  }

  async deleteDesign(designId: string) {
    return this.request<void>(`/designs/${designId}`, {
      method: 'DELETE',
    });
  }

  // Simulation Management API
  async createSimulationSession(designId: string, config?: any) {
    return this.request<{ session_id: string }>('/simulations', {
      method: 'POST',
      body: { design_id: designId, config },
    });
  }

  async getSimulationSession(sessionId: string) {
    return this.request<any>(`/simulations/${sessionId}`);
  }

  async startSimulation(sessionId: string) {
    return this.request<void>(`/simulations/${sessionId}/start`, {
      method: 'POST',
    });
  }

  async stopSimulation(sessionId: string) {
    return this.request<void>(`/simulations/${sessionId}/stop`, {
      method: 'POST',
    });
  }

  // AI Service API
  async getAIRecommendations(designData: any) {
    return this.request<any>('/ai/recommendations', {
      method: 'POST',
      body: { design_data: designData },
    });
  }

  // Observability API
  async getMetrics(sessionId?: string) {
    const endpoint = sessionId ? `/observability/metrics?session_id=${sessionId}` : '/observability/metrics';
    return this.request<any[]>(endpoint);
  }

  async getLogs(sessionId?: string) {
    const endpoint = sessionId ? `/observability/logs?session_id=${sessionId}` : '/observability/logs';
    return this.request<any[]>(endpoint);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;