import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';

// --- Mathematical Helpers ---

const generateCities = (count, width, height) => {
  const cities = [];
  const padding = 40;
  for (let i = 0; i < count; i++) {
    cities.push({
      x: padding + Math.random() * (width - padding * 2),
      y: padding + Math.random() * (height - padding * 2),
    });
  }
  return cities;
};

const calculateTotalDistance = (cities, order) => {
  let sum = 0;
  for (let i = 0; i < order.length - 1; i++) {
    const cityA = cities[order[i]];
    const cityB = cities[order[i + 1]];
    const dX = cityA.x - cityB.x;
    const dY = cityA.y - cityB.y;
    sum += Math.sqrt(dX * dX + dY * dY);
  }
  // Return to start
  const endCity = cities[order[order.length - 1]];
  const startCity = cities[order[0]];
  const dX = endCity.x - startCity.x;
  const dY = endCity.y - startCity.y;
  sum += Math.sqrt(dX * dX + dY * dY);
  
  return sum;
};

const shuffle = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const TSPVisualizer = () => {
  // --- Configuration ---
  const [numCities, setNumCities] = useState(30);
  const [initialTemp, setInitialTemp] = useState(1000);
  const [coolingRate, setCoolingRate] = useState(0.995);
  
  // --- State ---
  const [cities, setCities] = useState([]);
  const [currentOrder, setCurrentOrder] = useState([]);
  const [bestOrder, setBestOrder] = useState([]);
  const [bestDistance, setBestDistance] = useState(Infinity);
  const [currentDistance, setCurrentDistance] = useState(0);
  const [temperature, setTemperature] = useState(initialTemp);
  const [isRunning, setIsRunning] = useState(false);
  const [iteration, setIteration] = useState(0);
  
  const canvasRef = useRef(null);
  const requestRef = useRef(null);

  // Initialize Canvas Size
  const width = 600;
  const height = 400;

  // --- Algorithm Logic ---

  const reset = useCallback(() => {
    setIsRunning(false);
    const newCities = generateCities(numCities, width, height);
    setCities(newCities);
    
    // Create initial random order: [0, 1, 2, ... N] shuffled
    const initialOrder = shuffle([...Array(numCities).keys()]);
    
    const dist = calculateTotalDistance(newCities, initialOrder);
    
    setCurrentOrder(initialOrder);
    setBestOrder(initialOrder);
    setCurrentDistance(dist);
    setBestDistance(dist);
    setTemperature(initialTemp);
    setIteration(0);
  }, [numCities, initialTemp]);

  // Run on mount
  useEffect(() => {
    reset();
  }, [reset]);

  const step = () => {
    if (temperature < 0.1) {
      setIsRunning(false);
      return;
    }

    // 1. Create neighbor by swapping two random cities
    const newOrder = [...currentOrder];
    const i = Math.floor(Math.random() * newOrder.length);
    const j = Math.floor(Math.random() * newOrder.length);
    [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];

    // 2. Calculate energy (distance)
    const currentDist = calculateTotalDistance(cities, currentOrder);
    const newDist = calculateTotalDistance(cities, newOrder);
    
    // 3. Decide whether to accept
    const delta = newDist - currentDist;
    
    // Accept if better, OR randomly accept if worse based on temp
    if (newDist < currentDist || Math.random() < Math.exp(-delta / temperature)) {
      setCurrentOrder(newOrder);
      setCurrentDistance(newDist);

      // Update global best if this is the best ever seen
      if (newDist < bestDistance) {
        setBestDistance(newDist);
        setBestOrder(newOrder);
      }
    }

    // 4. Cool down
    setTemperature(prev => prev * coolingRate);
    setIteration(prev => prev + 1);
  };

  // Animation Loop
  useEffect(() => {
    if (isRunning) {
      const animate = () => {
        // Run multiple steps per frame to speed up visualization
        for(let k=0; k<50; k++) {
             step();
        }
        requestRef.current = requestAnimationFrame(animate);
      };
      requestRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(requestRef.current);
    }
  }, [isRunning, currentOrder, temperature, cities]); // Dependencies for the closure

  // --- Drawing ---

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear
    ctx.clearRect(0, 0, width, height);
    
    // Draw Background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    if (cities.length === 0) return;

    // Draw Connections (Current Path)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)'; // Faint grey
    ctx.lineWidth = 1;
    for (let i = 0; i < currentOrder.length - 1; i++) {
      const c1 = cities[currentOrder[i]];
      const c2 = cities[currentOrder[i+1]];
      ctx.moveTo(c1.x, c1.y);
      ctx.lineTo(c2.x, c2.y);
    }
    // Loop back
    const start = cities[currentOrder[0]];
    const end = cities[currentOrder[currentOrder.length-1]];
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // Draw Best Path (Thick Green/Accent)
    ctx.beginPath();
    ctx.strokeStyle = '#34d399'; // Emerald 400
    ctx.lineWidth = 2;
    for (let i = 0; i < bestOrder.length - 1; i++) {
      const c1 = cities[bestOrder[i]];
      const c2 = cities[bestOrder[i+1]];
      ctx.moveTo(c1.x, c1.y);
      ctx.lineTo(c2.x, c2.y);
    }
    // Loop back
    const bStart = cities[bestOrder[0]];
    const bEnd = cities[bestOrder[bestOrder.length-1]];
    ctx.moveTo(bStart.x, bStart.y);
    ctx.lineTo(bEnd.x, bEnd.y);
    ctx.stroke();

    // Draw Cities
    cities.forEach(city => {
      ctx.beginPath();
      ctx.arc(city.x, city.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#60a5fa'; // Blue 400
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

  }, [cities, currentOrder, bestOrder]);


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 font-sans">
      <h1 className="text-3xl font-bold mb-6 text-blue-400">TSP Simulated Annealing</h1>
      
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Canvas Container */}
        <div className="relative rounded-xl overflow-hidden shadow-2xl border border-gray-700">
           <canvas 
             ref={canvasRef} 
             width={width} 
             height={height} 
             className="block bg-gray-800"
           />
           {/* Overlay Stats */}
           <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md p-3 rounded-lg text-xs space-y-1 border border-white/10">
             <div className="flex justify-between gap-4">
               <span className="text-gray-400">Temperature:</span>
               <span className="font-mono text-orange-400">{temperature.toFixed(2)}</span>
             </div>
             <div className="flex justify-between gap-4">
               <span className="text-gray-400">Best Distance:</span>
               <span className="font-mono text-green-400">{bestDistance.toFixed(0)}</span>
             </div>
             <div className="flex justify-between gap-4">
               <span className="text-gray-400">Iteration:</span>
               <span className="font-mono text-blue-300">{iteration}</span>
             </div>
           </div>
        </div>

        {/* Controls */}
        <div className="w-full lg:w-72 bg-gray-800 p-6 rounded-xl border border-gray-700 h-fit">
          <div className="flex items-center gap-2 mb-6 text-gray-300">
             <Settings size={20} />
             <h2 className="font-semibold">Configuration</h2>
          </div>

          <div className="space-y-6">
            
            {/* Parameter Sliders */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 uppercase tracking-wider">City Count: {numCities}</label>
              <input 
                type="range" min="5" max="100" value={numCities}
                onChange={(e) => setNumCities(parseInt(e.target.value))}
                disabled={isRunning}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 uppercase tracking-wider">Init Temp: {initialTemp}</label>
              <input 
                type="range" min="100" max="5000" step="100" value={initialTemp}
                onChange={(e) => setInitialTemp(parseInt(e.target.value))}
                disabled={isRunning}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>

             <div className="space-y-2">
              <label className="text-xs text-gray-400 uppercase tracking-wider">Cooling Rate: {coolingRate}</label>
              <input 
                type="range" min="0.900" max="0.999" step="0.001" value={coolingRate}
                onChange={(e) => setCoolingRate(parseFloat(e.target.value))}
                disabled={isRunning}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-4">
               <button 
                 onClick={() => setIsRunning(!isRunning)}
                 className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                   isRunning 
                     ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                     : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                 }`}
               >
                 {isRunning ? <Pause size={18} /> : <Play size={18} />}
                 {isRunning ? "Pause" : "Start"}
               </button>

               <button 
                 onClick={reset}
                 className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all"
               >
                 <RotateCcw size={18} />
                 Reset
               </button>
            </div>
            
            <div className="text-xs text-gray-500 leading-relaxed pt-4 border-t border-gray-700">
              <p className="mb-2"><strong className="text-gray-400">Tip:</strong> Higher temperature allows random jumps (exploration). As it cools, the algorithm settles into an optimized path (exploitation).</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default TSPVisualizer;