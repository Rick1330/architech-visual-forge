import { create } from 'zustand';
import { Node, Edge, Connection } from '@xyflow/react';

export interface ComponentProperty {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea' | 'json' | 'slider' | 'code';
  value: string | number | boolean;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  validation?: {
    required?: boolean;
    pattern?: string;
    message?: string;
  };
}

export interface ComponentType {
  id: string;
  name: string;
  category: 'service' | 'database' | 'messaging' | 'networking' | 'cache';
  icon: string;
  color: string;
  properties_schema?: Record<string, unknown>; // JSON Schema for dynamic form generation
  default_properties?: Record<string, unknown>; // Default property values
  defaultProperties?: ComponentProperty[]; // Local default properties (deprecated)
}

export interface SimulationEvent {
  id: string;
  time: number;
  type: 'info' | 'warning' | 'error' | 'success';
  componentId?: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface SimulationState {
  isRunning: boolean;
  currentTime: number;
  speed: number;
  progress: number;
  duration: number;
  events: SimulationEvent[];
  snapshots: Array<{
    id: string;
    time: number;
    name: string;
    nodes: Node[];
    edges: Edge[];
  }>;
}

export interface NodeStatus {
  status: 'idle' | 'active' | 'warning' | 'error';
  metrics?: {
    cpu: number;
    memory: number;
    requests: number;
    latency: number;
  };
  logs?: Array<{
    timestamp: number;
    level: 'info' | 'warn' | 'error';
    message: string;
  }>;
}

interface ArchitectStore {
  // Canvas state
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  nodeStatuses: Record<string, NodeStatus>;
  
  // Component schemas from backend
  componentSchemas: ComponentType[];
  
  // Simulation state
  simulation: SimulationState;
  
  // Project state
  currentProject: {
    id: string;
    name: string;
    description?: string;
    lastModified: number;
  } | null;
  projects: Array<{
    id: string;
    name: string;
    description?: string;
    lastModified: number;
  }>;
  
  // UI state
  showPropertyPanel: boolean;
  showComponentPalette: boolean;
  showProjectSwitcher: boolean;
  canvasViewport: { x: number; y: number; zoom: number };
  componentPaletteSearch: string;
  componentPaletteCategory: string;
  
  // Actions
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  setComponentSchemas: (schemas: ComponentType[]) => void;
  onNodesChange: (changes: unknown[]) => void;
  onEdgesChange: (changes: unknown[]) => void;
  onConnect: (connection: Connection) => void;
  
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  
  updateNodeProperty: (nodeId: string, propertyId: string, value: string | number | boolean) => void;
  updateNodeStatus: (nodeId: string, status: NodeStatus) => void;
  
  // Auto-layout actions
  autoLayoutNodes: () => void;
  alignNodes: (alignment: 'left' | 'right' | 'top' | 'bottom' | 'center') => void;
  distributeNodes: (direction: 'horizontal' | 'vertical') => void;
  
  // Simulation actions
  startSimulation: () => void;
  pauseSimulation: () => void;
  stopSimulation: () => void;
  setSimulationSpeed: (speed: number) => void;
  setSimulationTime: (time: number) => void;
  addSimulationEvent: (event: Omit<SimulationEvent, 'id'>) => void;
  createSnapshot: (name: string) => void;
  loadSnapshot: (snapshotId: string) => void;
  
  // Project actions
  createProject: (name: string, description?: string) => void;
  loadProject: (projectId: string) => void;
  saveProject: () => void;
  deleteProject: (projectId: string) => void;
  
  // UI actions
  togglePropertyPanel: () => void;
  toggleComponentPalette: () => void;
  toggleProjectSwitcher: () => void;
  setCanvasViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  setComponentPaletteSearch: (search: string) => void;
  setComponentPaletteCategory: (category: string) => void;
}

export const useArchitectStore = create<ArchitectStore>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  nodeStatuses: {},
  
  // Component schemas from backend
  componentSchemas: [],
  
  simulation: {
    isRunning: false,
    currentTime: 0,
    speed: 1,
    progress: 0,
    duration: 300, // 5 minutes default
    events: [],
    snapshots: [],
  },
  
  currentProject: {
    id: 'default',
    name: 'New Architecture',
    description: 'A new distributed systems architecture',
    lastModified: Date.now(),
  },
  projects: [
    {
      id: 'default',
      name: 'New Architecture',
      description: 'A new distributed systems architecture',
      lastModified: Date.now(),
    }
  ],
  
  showPropertyPanel: true,
  showComponentPalette: true,
  showProjectSwitcher: false,
  canvasViewport: { x: 0, y: 0, zoom: 1 },
  componentPaletteSearch: '',
  componentPaletteCategory: 'all',
  
  // Actions
  setNodes: (nodes) => {
    set((state) => ({
      nodes: typeof nodes === 'function' ? nodes(state.nodes) : nodes,
    }));
  },
  
  setEdges: (edges) => {
    set((state) => ({
      edges: typeof edges === 'function' ? edges(state.edges) : edges,
    }));
  },

  setComponentSchemas: (schemas) => {
    set({ componentSchemas: schemas });
  },
  
  onNodesChange: (changes) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        const change = changes.find((c: any) => c.id === node.id);
        if (change && typeof change === 'object') {
          return { ...node, ...change };
        }
        return node;
      }),
    }));
  },
  
  onEdgesChange: (changes) => {
    set((state) => ({
      edges: state.edges.map((edge) => {
        const change = changes.find((c: any) => c.id === edge.id);
        if (change && typeof change === 'object') {
          return { ...edge, ...change };
        }
        return edge;
      }),
    }));
  },
  
  onConnect: (connection) => {
    const newEdge: Edge = {
      id: `edge-${Date.now()}`,
      source: connection.source!,
      target: connection.target!,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: 'architech',
      animated: false,
    };
    
    set((state) => ({
      edges: [...state.edges, newEdge],
    }));
  },
  
  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId, selectedEdgeId: null });
  },
  
  selectEdge: (edgeId) => {
    set({ selectedEdgeId: edgeId, selectedNodeId: null });
  },
  
  updateNodeProperty: (nodeId, propertyId, value) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === nodeId) {
          const properties = (node.data?.properties as ComponentProperty[]) || [];
          const updatedProperties = properties.map((prop: ComponentProperty) => 
            prop.id === propertyId ? { ...prop, value } : prop
          );
          return {
            ...node,
            data: {
              ...node.data,
              properties: updatedProperties,
            },
          };
        }
        return node;
      }),
    }));
  },

  updateNodeStatus: (nodeId, status) => {
    set((state) => ({
      nodeStatuses: {
        ...state.nodeStatuses,
        [nodeId]: status,
      },
    }));
  },

  // Auto-layout actions
  autoLayoutNodes: () => {
    // Basic auto-layout implementation
    const state = get();
    const nodes = state.nodes;
    if (nodes.length === 0) return;

    const layoutNodes = nodes.map((node, index) => {
      const row = Math.floor(index / 4);
      const col = index % 4;
      return {
        ...node,
        position: {
          x: col * 250 + 50,
          y: row * 150 + 50,
        },
      };
    });

    set({ nodes: layoutNodes });
  },

  alignNodes: (alignment) => {
    const state = get();
    const selectedNodes = state.nodes.filter(node => node.selected);
    if (selectedNodes.length < 2) return;

    const alignValue = selectedNodes.reduce((acc, node) => {
      switch (alignment) {
        case 'left':
          return Math.min(acc, node.position.x);
        case 'right':
          return Math.max(acc, node.position.x + (node.measured?.width || 200));
        case 'top':
          return Math.min(acc, node.position.y);
        case 'bottom':
          return Math.max(acc, node.position.y + (node.measured?.height || 100));
        case 'center':
          return alignment === 'center' ? 
            selectedNodes.reduce((sum, n) => sum + n.position.x, 0) / selectedNodes.length :
            acc;
        default:
          return acc;
      }
    }, alignment === 'left' || alignment === 'top' ? Infinity : -Infinity);

    const alignedNodes = state.nodes.map(node => {
      if (node.selected) {
        switch (alignment) {
          case 'left':
            return { ...node, position: { ...node.position, x: alignValue } };
          case 'right':
            return { ...node, position: { ...node.position, x: alignValue - (node.measured?.width || 200) } };
          case 'top':
            return { ...node, position: { ...node.position, y: alignValue } };
          case 'bottom':
            return { ...node, position: { ...node.position, y: alignValue - (node.measured?.height || 100) } };
          case 'center':
            return { ...node, position: { ...node.position, x: alignValue } };
        }
      }
      return node;
    });

    set({ nodes: alignedNodes });
  },

  distributeNodes: (direction) => {
    const state = get();
    const selectedNodes = state.nodes.filter(node => node.selected).sort((a, b) => 
      direction === 'horizontal' ? a.position.x - b.position.x : a.position.y - b.position.y
    );
    
    if (selectedNodes.length < 3) return;

    const first = selectedNodes[0];
    const last = selectedNodes[selectedNodes.length - 1];
    const totalSpace = direction === 'horizontal' ? 
      last.position.x - first.position.x : 
      last.position.y - first.position.y;
    
    const spacing = totalSpace / (selectedNodes.length - 1);

    const distributedNodes = state.nodes.map(node => {
      const index = selectedNodes.findIndex(n => n.id === node.id);
      if (index > 0 && index < selectedNodes.length - 1) {
        const newPosition = direction === 'horizontal' ?
          { ...node.position, x: first.position.x + spacing * index } :
          { ...node.position, y: first.position.y + spacing * index };
        return { ...node, position: newPosition };
      }
      return node;
    });

    set({ nodes: distributedNodes });
  },
  
  // Simulation actions
  startSimulation: () => {
    set((state) => ({
      simulation: { ...state.simulation, isRunning: true },
    }));
  },
  
  pauseSimulation: () => {
    set((state) => ({
      simulation: { ...state.simulation, isRunning: false },
    }));
  },
  
  stopSimulation: () => {
    set((state) => ({
      simulation: {
        ...state.simulation,
        isRunning: false,
        currentTime: 0,
        progress: 0,
      },
    }));
  },
  
  setSimulationSpeed: (speed) => {
    set((state) => ({
      simulation: { ...state.simulation, speed },
    }));
  },

  setSimulationTime: (time) => {
    set((state) => ({
      simulation: { ...state.simulation, currentTime: time },
    }));
  },

  addSimulationEvent: (event) => {
    const newEvent: SimulationEvent = {
      ...event,
      id: `event-${Date.now()}`,
    };
    set((state) => ({
      simulation: {
        ...state.simulation,
        events: [...state.simulation.events, newEvent],
      },
    }));
  },

  createSnapshot: (name) => {
    const state = get();
    const snapshot = {
      id: `snapshot-${Date.now()}`,
      time: state.simulation.currentTime,
      name,
      nodes: [...state.nodes],
      edges: [...state.edges],
    };
    set((currentState) => ({
      simulation: {
        ...currentState.simulation,
        snapshots: [...currentState.simulation.snapshots, snapshot],
      },
    }));
  },

  loadSnapshot: (snapshotId) => {
    const state = get();
    const snapshot = state.simulation.snapshots.find(s => s.id === snapshotId);
    if (snapshot) {
      set({
        nodes: [...snapshot.nodes],
        edges: [...snapshot.edges],
        simulation: {
          ...state.simulation,
          currentTime: snapshot.time,
        },
      });
    }
  },

  // Project actions
  createProject: (name, description) => {
    const newProject = {
      id: `project-${Date.now()}`,
      name,
      description,
      lastModified: Date.now(),
    };
    set((state) => ({
      projects: [...state.projects, newProject],
      currentProject: newProject,
      nodes: [],
      edges: [],
      nodeStatuses: {},
      simulation: {
        ...state.simulation,
        currentTime: 0,
        progress: 0,
        events: [],
        snapshots: [],
      },
    }));
  },

  loadProject: (projectId) => {
    const state = get();
    const project = state.projects.find(p => p.id === projectId);
    if (project) {
      set({
        currentProject: project,
        nodes: [],
        edges: [],
        nodeStatuses: {},
        simulation: {
          ...state.simulation,
          currentTime: 0,
          progress: 0,
          events: [],
          snapshots: [],
        },
      });
    }
  },

  saveProject: () => {
    const state = get();
    if (state.currentProject) {
      set((currentState) => ({
        projects: currentState.projects.map(p => 
          p.id === currentState.currentProject?.id 
            ? { ...p, lastModified: Date.now() }
            : p
        ),
        currentProject: state.currentProject ? {
          ...state.currentProject,
          lastModified: Date.now(),
        } : null,
      }));
    }
  },

  deleteProject: (projectId) => {
    set((state) => ({
      projects: state.projects.filter(p => p.id !== projectId),
      currentProject: state.currentProject?.id === projectId ? 
        state.projects.find(p => p.id !== projectId) || null : 
        state.currentProject,
    }));
  },
  
  // UI actions
  togglePropertyPanel: () => {
    set((state) => ({ showPropertyPanel: !state.showPropertyPanel }));
  },
  
  toggleComponentPalette: () => {
    set((state) => ({ showComponentPalette: !state.showComponentPalette }));
  },
  
  setCanvasViewport: (viewport) => {
    set({ canvasViewport: viewport });
  },

  toggleProjectSwitcher: () => {
    set((state) => ({ showProjectSwitcher: !state.showProjectSwitcher }));
  },

  setComponentPaletteSearch: (search) => {
    set({ componentPaletteSearch: search });
  },

  setComponentPaletteCategory: (category) => {
    set({ componentPaletteCategory: category });
  },
}));