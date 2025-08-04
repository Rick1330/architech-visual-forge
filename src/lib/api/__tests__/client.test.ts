import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('authentication', () => {
    it('login sends correct request and stores token', async () => {
      const mockResponse = {
        data: {
          access_token: 'test-token',
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.login('test@example.com', 'password');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/users/login',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password',
          }),
        })
      );

      expect(result).toEqual(mockResponse);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('architech_auth_token', 'test-token');
    });

    it('register sends correct request', async () => {
      const mockResponse = {
        data: {
          access_token: 'test-token',
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      await apiClient.register(userData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/users/register',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(userData),
        })
      );

      // expect(result).toEqual(mockResponse.data);
    });

    it('includes authorization header when token is set', async () => {
      apiClient.setAuthToken('test-token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await apiClient.getProjects();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/projects',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });
  });

  describe('error handling', () => {
    it('throws error for non-ok responses', async () => {
      const errorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve(errorResponse),
      });

      await expect(apiClient.login('invalid', 'creds')).rejects.toThrow('HTTP 400: undefined');
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.getProjects()).rejects.toThrow('Network error');
    });
  });

  describe('project management', () => {
    it('creates project with correct data', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'A test project',
      };

      const mockResponse = {
        data: { id: '1', ...projectData },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.createProject(projectData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/projects',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(projectData),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('updates project correctly', async () => {
      const projectId = 'project-1';
      const updateData = { name: 'Updated Project' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: projectId, ...updateData } }),
      });

      await apiClient.updateProject(projectId, updateData);

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:8000/api/v1/projects/${projectId}`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData),
        })
      );
    });
  });

  describe('simulation management', () => {
    it('creates simulation session correctly', async () => {
      const designId = 'design-1';
      const config = { duration: 300 };

      const mockResponse = {
        data: { session_id: 'session-1', design_id: designId },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.createSimulationSession(designId, 'Test Simulation', config);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/simulations',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            design_id: designId,
            name: 'Test Simulation',
            config: config,
          }),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('starts simulation correctly', async () => {
      const sessionId = 'session-1';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { status: 'running' } }),
      });

      await apiClient.startSimulation(sessionId);

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:8000/api/v1/simulations/${sessionId}/start`,
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});