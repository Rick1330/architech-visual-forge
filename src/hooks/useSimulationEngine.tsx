import { useEffect } from 'react';
import { useArchitectStore } from '@/stores/useArchitectStore';

// Mock simulation engine for demonstration
export const useSimulationEngine = () => {
  const {
    simulation,
    nodes,
    updateNodeStatus,
    addSimulationEvent,
    setSimulationTime,
  } = useArchitectStore();

  useEffect(() => {
    if (!simulation.isRunning) return;

    const interval = setInterval(() => {
      const newTime = simulation.currentTime + simulation.speed;
      
      if (newTime >= simulation.duration) {
        // Simulation complete
        return;
      }

      setSimulationTime(newTime);

      // Simulate random events and status changes
      nodes.forEach((node) => {
        // Random status changes
        if (Math.random() < 0.1) { // 10% chance per interval
          const statuses = ['idle', 'active', 'warning', 'error'];
          const randomStatus = statuses[Math.floor(Math.random() * statuses.length)] as any;
          
          updateNodeStatus(node.id, {
            status: randomStatus,
            metrics: {
              cpu: Math.random() * 100,
              memory: Math.random() * 100,
              requests: Math.random() * 1000,
              latency: Math.random() * 500,
            },
            logs: [
              {
                timestamp: Date.now(),
                level: randomStatus === 'error' ? 'error' : randomStatus === 'warning' ? 'warn' : 'info',
                message: `${randomStatus.charAt(0).toUpperCase() + randomStatus.slice(1)} status detected`,
              }
            ],
          });

          // Add simulation event
          if (randomStatus === 'error' || randomStatus === 'warning') {
            addSimulationEvent({
              time: newTime,
              type: randomStatus === 'error' ? 'error' : 'warning',
              componentId: node.id,
              message: `Component ${Array.isArray(node.data?.properties) && 
                       node.data.properties.find((p: any) => p.id === 'name')?.value || node.id} status: ${randomStatus}`,
            });
          }
        }
      });
    }, 1000 / simulation.speed); // Adjust interval based on speed

    return () => clearInterval(interval);
  }, [simulation.isRunning, simulation.speed, simulation.currentTime, nodes]);

  return null;
};