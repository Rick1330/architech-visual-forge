import { AppHeader } from '@/components/AppHeader';
import { ComponentPalette } from '@/components/ComponentPalette';
import { ArchitectCanvas } from '@/components/ArchitectCanvas';
import { PropertyPanel } from '@/components/PropertyPanel';
import { SimulationTimeline } from '@/components/SimulationTimeline';
import { useArchitectStore } from '@/stores/useArchitectStore';

const Index = () => {
  const { showComponentPalette, showPropertyPanel } = useArchitectStore();

  return (
    <div className="h-screen flex flex-col bg-background">
      <AppHeader />
      
      <div className="flex-1 flex overflow-hidden">
        {showComponentPalette && <ComponentPalette />}
        
        <div className="flex-1 flex flex-col">
          <ArchitectCanvas />
          <SimulationTimeline />
        </div>
        
        {showPropertyPanel && <PropertyPanel />}
      </div>
    </div>
  );
};

export default Index;
