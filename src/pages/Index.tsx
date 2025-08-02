
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
      
      <div className="flex-1 flex overflow-hidden relative">
        {/* Component Palette with beautiful slide animation */}
        <div className={`
          transition-all duration-500 ease-in-out
          ${showComponentPalette 
            ? 'translate-x-0 opacity-100' 
            : '-translate-x-64 opacity-20 hover:translate-x-0 hover:opacity-100'
          }
          ${!showComponentPalette ? 'absolute left-0 top-0 z-40 hover:shadow-2xl' : 'relative'}
          h-full
        `}>
          <div className={`
            ${!showComponentPalette ? 'hover:scale-105' : ''} 
            transition-transform duration-300 h-full
          `}>
            <ComponentPalette />
          </div>
        </div>
        
        <div className="flex-1 flex flex-col">
          <ArchitectCanvas />
          <SimulationTimeline />
        </div>
        
        {/* Property Panel with beautiful slide animation */}
        <div className={`
          transition-all duration-500 ease-in-out
          ${showPropertyPanel 
            ? 'translate-x-0 opacity-100' 
            : 'translate-x-64 opacity-20 hover:translate-x-0 hover:opacity-100'
          }
          ${!showPropertyPanel ? 'absolute right-0 top-0 z-40 hover:shadow-2xl' : 'relative'}
          h-full
        `}>
          <div className={`
            ${!showPropertyPanel ? 'hover:scale-105' : ''} 
            transition-transform duration-300 h-full
          `}>
            <PropertyPanel />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
