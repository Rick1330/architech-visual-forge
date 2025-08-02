import { create } from 'zustand';
import { Node, Edge, Connection } from '@xyflow/react';

export interface ComponentProperty {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea' | 'json';
  value: any;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

export interface ComponentType {
  id: string;
  name: string;
  category: 'service' | 'database' | 'messaging' | 'networking' | 'cache';
  icon: string;
  color: string;
  defaultProperties: ComponentProperty[];
}

export interface SimulationState {
  isRunning: boolean;
  currentTime: number;
  speed: number;
  progress: number;
}

interface ArchitectStore {
  // Canvas state
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  
  // Simulation state
  simulation: SimulationState;
  
  // UI state
  showPropertyPanel: boolean;
  showComponentPalette: boolean;
  canvasViewport: { x: number; y: number; zoom: number };
  
  // Actions
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  onNodesChange: (changes: any[]) => void;
  onEdgesChange: (changes: any[]) => void;
  onConnect: (connection: Connection) => void;
  
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  
  updateNodeProperty: (nodeId: string, propertyId: string, value: any) => void;
  
  // Simulation actions
  startSimulation: () => void;
  pauseSimulation: () => void;
  stopSimulation: () => void;
  setSimulationSpeed: (speed: number) => void;
  
  // UI actions
  togglePropertyPanel: () => void;
  toggleComponentPalette: () => void;
  setCanvasViewport: (viewport: { x: number; y: number; zoom: number }) => void;
}

export const useArchitectStore = create<ArchitectStore>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  
  simulation: {
    isRunning: false,
    currentTime: 0,
    speed: 1,
    progress: 0,
  },
  
  showPropertyPanel: true,
  showComponentPalette: true,
  canvasViewport: { x: 0, y: 0, zoom: 1 },
  
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
  
  onNodesChange: (changes) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        const change = changes.find((c) => c.id === node.id);
        if (change) {
          return { ...node, ...change };
        }
        return node;
      }),
    }));
  },
  
  onEdgesChange: (changes) => {
    set((state) => ({
      edges: state.edges.map((edge) => {
        const change = changes.find((c) => c.id === edge.id);
        if (change) {
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
}));