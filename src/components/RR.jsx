import { useState, useEffect } from "react";

const processColors = {
  P1: "#FF5733",
  P2: "#33FF57",
  P3: "#3357FF",
  P4: "#FF33A8",
  P5: "#33FFF9",
  P6: "#FFD700",
  P7: "#FF69B4",
  P8: "#00CED1",
  P9: "#FF4500",
  P10: "#9370DB",
};

const RoundRobin = ({ processes, timeQuantum = 2 }) => {
  const [pendingProcesses, setPendingProcesses] = useState([]);
  const [readyQueue, setReadyQueue] = useState([]);
  const [completedProcesses, setCompletedProcesses] = useState([]);
  const [currentProcess, setCurrentProcess] = useState(null);
  const [ganttChart, setGanttChart] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [animatingTimeJump, setAnimatingTimeJump] = useState(false);
  const [timeJumpTarget, setTimeJumpTarget] = useState(0);
  const [remainingTime, setRemainingTime] = useState({});
  const [quantumProgress, setQuantumProgress] = useState(0);
  const [enteringProcess, setEnteringProcess] = useState(null);
  const [exitingProcess, setExitingProcess] = useState(null);
  const [simulationState, setSimulationState] = useState({
    initialized: false,
    executingProcess: null,
    processStartTime: null,
    processEndTime: null,
    executionProgress: 0
  });

  // Initialize simulation
  const startSimulation = () => {
    if (!simulationState.initialized) {
      // Create processes with remaining time
      const processesWithRemaining = processes.map(p => ({
        ...p,
        remainingTime: parseInt(p.burstTime),
        burstTime: parseInt(p.burstTime),
        arrivalTime: parseInt(p.arrivalTime)
      }));
      
      // Initialize remaining time
      const initialRemaining = {};
      processesWithRemaining.forEach(p => {
        initialRemaining[p.name] = parseInt(p.burstTime);
      });
      
      setRemainingTime(initialRemaining);
      setPendingProcesses([...processesWithRemaining]);
      setReadyQueue([]);
      setCompletedProcesses([]);
      setGanttChart([]);
      setCurrentProcess(null);
      setCurrentTime(0);
      setAnimatingTimeJump(false);
      setTimeJumpTarget(0);
      setQuantumProgress(0);
      setSimulationState({
        initialized: true,
        executingProcess: null,
        processStartTime: null,
        processEndTime: null,
        executionProgress: 0
      });
    }
    setIsSimulating(true);
    setIsPaused(false);
  };

  // Stop simulation
  const stopSimulation = () => {
    setIsSimulating(false);
    setIsPaused(true);
  };

  // Reset simulation
  const resetSimulation = () => {
    setPendingProcesses([]);
    setReadyQueue([]);
    setCompletedProcesses([]);
    setGanttChart([]);
    setCurrentProcess(null);
    setCurrentTime(0);
    setAnimatingTimeJump(false);
    setTimeJumpTarget(0);
    setQuantumProgress(0);
    setIsSimulating(false);
    setIsPaused(false);
    setSimulationState({
      initialized: false,
      executingProcess: null,
      processStartTime: null,
      processEndTime: null,
      executionProgress: 0
    });
  };

  // Calculate delay based on animation speed
  const getAnimationDelay = (baseDelay) => {
    return baseDelay / animationSpeed;
  };

  // Handle simulation steps
  useEffect(() => {
    if (!isSimulating || isPaused) return;

    const simulationStep = async () => {
      // Check for new arrivals
      const newArrivals = pendingProcesses.filter(p => p.arrivalTime <= currentTime);
      
      if (newArrivals.length > 0) {
        // Animate new arrivals entering ready queue
        for (const process of newArrivals) {
          setEnteringProcess(process.name);
          await new Promise(resolve => setTimeout(resolve, getAnimationDelay(300)));
          setEnteringProcess(null);
        }
        
        // Update queues
        setPendingProcesses(prev => prev.filter(p => p.arrivalTime > currentTime));
        setReadyQueue(prev => [...prev, ...newArrivals]);
      }

      // If CPU is idle and ready queue has processes
      if (!currentProcess && readyQueue.length > 0) {
        // Get next process from ready queue (FIFO)
        const nextProcess = readyQueue[0];
        setCurrentProcess(nextProcess);
        setQuantumProgress(0);
        
        // Remove from ready queue
        setReadyQueue(prev => prev.slice(1));
        
        // Calculate execution time (minimum of quantum or remaining time)
        const executeTime = Math.min(timeQuantum, remainingTime[nextProcess.name]);
        
        // Create Gantt entry
        const ganttEntry = {
          ...nextProcess,
          startTime: currentTime,
          endTime: currentTime + executeTime,
          quantum: executeTime,
          isComplete: (remainingTime[nextProcess.name] - executeTime) <= 0
        };
        
        // Animate execution
        setAnimatingTimeJump(true);
        setTimeJumpTarget(currentTime + executeTime);
        
        for (let t = 1; t <= executeTime; t++) {
          if (!isSimulating || isPaused) break;
          setQuantumProgress((t / executeTime) * 100);
          setCurrentTime(prev => prev + 1);
          await new Promise(resolve => setTimeout(resolve, getAnimationDelay(300)));
        }
        
        setAnimatingTimeJump(false);
        setQuantumProgress(0);
        
        // Update Gantt chart
        setGanttChart(prev => [...prev, ganttEntry]);
        
        // Update remaining time
        const newRemaining = remainingTime[nextProcess.name] - executeTime;
        setRemainingTime(prev => ({
          ...prev,
          [nextProcess.name]: newRemaining
        }));
        
        // Check if process completed
        if (newRemaining <= 0) {
          // Process completed
          setExitingProcess(nextProcess.name);
          await new Promise(resolve => setTimeout(resolve, getAnimationDelay(300)));
          setCompletedProcesses(prev => [...prev, nextProcess]);
        } else {
          // Process not completed, add back to ready queue
          setExitingProcess(nextProcess.name);
          await new Promise(resolve => setTimeout(resolve, getAnimationDelay(300)));
          setReadyQueue(prev => [...prev, {
            ...nextProcess,
            remainingTime: newRemaining
          }]);
        }
        
        setCurrentProcess(null);
        setExitingProcess(null);
      } else if (readyQueue.length === 0 && pendingProcesses.length > 0) {
        // CPU idle but processes still pending - jump to next arrival
        const nextArrivalTime = Math.min(...pendingProcesses.map(p => p.arrivalTime));
        
        setAnimatingTimeJump(true);
        setTimeJumpTarget(nextArrivalTime);
        
        for (let t = currentTime + 1; t <= nextArrivalTime; t++) {
          if (!isSimulating || isPaused) break;
          setCurrentTime(t);
          await new Promise(resolve => setTimeout(resolve, getAnimationDelay(100)));
        }
        
        setAnimatingTimeJump(false);
        
        // Add idle time to Gantt chart
        if (nextArrivalTime > currentTime) {
          setGanttChart(prev => [
            ...prev,
            {
              name: "Idle",
              startTime: currentTime,
              endTime: nextArrivalTime,
              isIdle: true
            }
          ]);
        }
      }
    };

    const timer = setTimeout(simulationStep, getAnimationDelay(500));
    return () => clearTimeout(timer);
  }, [currentTime, isSimulating, isPaused, pendingProcesses, readyQueue, currentProcess, remainingTime, animationSpeed, timeQuantum]);
  
  // Stop simulation when all processes complete
  useEffect(() => {
    if (isSimulating && pendingProcesses.length === 0 && readyQueue.length === 0 && !currentProcess) {
      setIsSimulating(false);
    }
  }, [pendingProcesses, readyQueue, currentProcess, isSimulating]);

  // Calculate process statistics
  const calculateProcessStats = () => {
    const stats = {};
    
    // Initialize stats for each process
    processes.forEach(p => {
      stats[p.name] = {
        arrivalTime: parseInt(p.arrivalTime),
        burstTime: parseInt(p.burstTime),
        completionTime: 0,
        turnaroundTime: 0,
        waitingTime: 0,
        responseTime: -1 // -1 means not responded yet
      };
    });
    
    // Find first and last execution for each process
    ganttChart.forEach(entry => {
      if (entry.isIdle) return;
      
      // Set completion time to the last execution end time
      stats[entry.name].completionTime = entry.endTime;
      
      // Set response time to first execution start time - arrival time
      if (stats[entry.name].responseTime === -1) {
        stats[entry.name].responseTime = entry.startTime - stats[entry.name].arrivalTime;
      }
    });
    
    // Calculate turnaround and waiting times
    Object.keys(stats).forEach(name => {
      stats[name].turnaroundTime = stats[name].completionTime - stats[name].arrivalTime;
      stats[name].waitingTime = stats[name].turnaroundTime - stats[name].burstTime;
    });
    
    return stats;
  };

  const processStats = ganttChart.length > 0 ? calculateProcessStats() : {};

  return (
    <div className="mt-10 mb-10 flex flex-col items-center p-6 bg-black rounded-lg border border-white text-white min-w-[80vw] mx-auto">
      <h2 className="text-2xl font-bold mb-6">Round Robin Scheduling Visualization</h2>

      <div className="w-full flex justify-between items-center mb-8">
        <div className="flex space-x-4">
          <button
            onClick={startSimulation}
            disabled={isSimulating && !isPaused}
            className={`px-6 py-3 rounded-lg border border-white font-bold transition-all duration-300 ${
              isSimulating && !isPaused
                ? "bg-gray-800 text-gray-400 cursor-not-allowed" 
                : "bg-black text-white hover:bg-gray-900"
            }`}
          >
            {isSimulating && !isPaused ? "Simulation Running..." : 
             isPaused ? "Resume Simulation" : "Start Round Robin"}
          </button>
          
          <button
            onClick={stopSimulation}
            disabled={!isSimulating || isPaused}
            className={`px-6 py-3 rounded-lg border border-white font-bold transition-all duration-300 ${
              !isSimulating || isPaused
                ? "bg-gray-800 text-gray-400 cursor-not-allowed" 
                : "bg-orange-600 text-white hover:bg-orange-700"
            }`}
          >
            Stop Simulation
          </button>
          
          <button
            onClick={resetSimulation}
            className="px-6 py-3 rounded-lg border border-white font-bold transition-all duration-300 bg-red-600 text-white hover:bg-red-700"
          >
            Reset
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Time Quantum Control */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Time Quantum:</span>
            <input
              type="number"
              min="1"
              max="10"
              value={timeQuantum}
              onChange={(e) => timeQuantum = parseInt(e.target.value)}
              disabled={isSimulating}
              className="w-16 px-2 py-1 bg-black text-white border border-white rounded text-center"
            />
          </div>
          
          {/* Animation Speed Control */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Speed:</span>
            <div className="flex space-x-1">
              <button 
                onClick={() => setAnimationSpeed(0.5)} 
                className={`px-2 py-1 rounded border transition-all duration-300 ${
                  animationSpeed === 0.5 ? "bg-white text-black" : "bg-black text-white"
                }`}
                disabled={isSimulating && !isPaused}
              >
                0.5x
              </button>
              <button 
                onClick={() => setAnimationSpeed(1)} 
                className={`px-2 py-1 rounded border transition-all duration-300 ${
                  animationSpeed === 1 ? "bg-white text-black" : "bg-black text-white"
                }`}
                disabled={isSimulating && !isPaused}
              >
                1x
              </button>
              <button 
                onClick={() => setAnimationSpeed(2)} 
                className={`px-2 py-1 rounded border transition-all duration-300 ${
                  animationSpeed === 2 ? "bg-white text-black" : "bg-black text-white"
                }`}
                disabled={isSimulating && !isPaused}
              >
                2x
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Simulation Status */}
      {simulationState.initialized && (
        <div className="w-full mb-4 text-center">
          <div className="inline-block px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-600">
            <span className="font-semibold">Status:</span> 
            <span className={`ml-2 ${
              isSimulating && !isPaused ? "text-green-400" : 
              isPaused ? "text-orange-400" : "text-gray-400"
            }`}>
              {isSimulating && !isPaused ? "Running" : 
               isPaused ? "Paused" : "Stopped"}
            </span>
            {currentProcess && (
              <span className="ml-4 text-blue-400">
                Executing: {currentProcess.name}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Current Time Display */}
      <div className="w-full mb-6 text-center">
        <div className="inline-block px-4 py-2 bg-black text-white rounded-lg border border-white overflow-hidden relative">
          <span className="font-semibold">Current Time:</span> 
          <span className={`inline-block min-w-[3ch] text-center ${animatingTimeJump ? "animate-pulse text-yellow-400" : ""}`}>
            {currentTime}
          </span>
          {animatingTimeJump && (
            <span className="text-xs text-yellow-400 ml-2">
              → {timeJumpTarget}
            </span>
          )}
        </div>
      </div>

      {/* Process Visualization */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Pending Processes */}
        <div className="bg-black p-4 rounded-lg border border-white">
          <h3 className="text-lg font-semibold mb-3 border-b border-white pb-2">
            Pending Processes ({pendingProcesses.length})
          </h3>
          <div className="flex flex-wrap gap-4 justify-center">
            {pendingProcesses.map((p) => (
              <div
                key={p.name}
                className={`p-3 rounded-lg border text-center w-28 transition-all duration-300 ${
                  enteringProcess === p.name ? "scale-110 border-yellow-500 border-2" : "border-white"
                }`}
                style={{
                  borderLeft: `5px solid ${processColors[p.name] || "#3498db"}`
                }}
              >
                <p className="font-bold text-lg">{p.name}</p>
                <div className="grid grid-cols-1 gap-1 mt-2 text-xs">
                  <p className="bg-gray-900 rounded p-1">Arrival: {p.arrivalTime}</p>
                  <p className="bg-gray-900 rounded p-1">Burst: {p.burstTime}</p>
                </div>
              </div>
            ))}
            {pendingProcesses.length === 0 && (
              <p className="text-gray-400 italic">No pending processes</p>
            )}
          </div>
        </div>

        {/* Ready Queue */}
        <div className="bg-black p-4 rounded-lg border border-white">
          <h3 className="text-lg font-semibold mb-3 border-b border-white pb-2">
            Ready Queue ({readyQueue.length})
          </h3>
          <div className="flex flex-wrap gap-4 justify-center">
            {readyQueue.map((p, index) => (
              <div
                key={`${p.name}-${index}`}
                className={`p-3 rounded-lg border text-center w-28 transition-all duration-300 ${
                  exitingProcess === p.name ? "opacity-50 scale-95" : "border-white"
                }`}
                style={{
                  borderLeft: `5px solid ${processColors[p.name] || "#3498db"}`
                }}
              >
                <p className="font-bold text-lg">{p.name}</p>
                <div className="grid grid-cols-1 gap-1 mt-2 text-xs">
                  <p className="bg-gray-900 rounded p-1">Remaining: {p.remainingTime}</p>
                  <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden mt-1">
                    <div 
                      className="h-full"
                      style={{
                        width: `${((p.burstTime - p.remainingTime) / p.burstTime) * 100}%`,
                        backgroundColor: processColors[p.name] || "#3498db"
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
            {readyQueue.length === 0 && (
              <p className="text-gray-400 italic">Ready queue is empty</p>
            )}
          </div>
        </div>

        {/* CPU Execution */}
        <div className="bg-black p-4 rounded-lg border border-white">
          <h3 className="text-lg font-semibold mb-3 border-b border-white pb-2">CPU Execution</h3>
          <div className="flex justify-center">
            {currentProcess ? (
              <div className="p-4 rounded-lg border-2 text-center w-40 relative overflow-hidden"
                style={{
                  borderColor: processColors[currentProcess.name] || "#3498db",
                  background: `${processColors[currentProcess.name] || "#3498db"}10`
                }}
              >
                <p className="font-bold text-xl">{currentProcess.name}</p>
                <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
                  <p className="bg-gray-900 rounded p-1">Remaining: {remainingTime[currentProcess.name]}</p>
                  <p className="bg-gray-900 rounded p-1">Quantum: {timeQuantum}</p>
                </div>
                
                {/* Quantum progress bar */}
                <div className="w-full h-2 bg-gray-800 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${quantumProgress}%`,
                      backgroundColor: processColors[currentProcess.name] || "#3498db"
                    }}
                  ></div>
                </div>
                
                {/* CPU activity animation */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-30"
                  style={{
                    animation: "cpuActivity 1.5s infinite",
                    backgroundSize: "200% 100%"
                  }}
                ></div>
                
                <style jsx>{`
                  @keyframes cpuActivity {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                  }
                `}</style>
              </div>
            ) : (
              <p className="text-gray-400 italic py-4">CPU is idle</p>
            )}
          </div>
        </div>
      </div>

      {/* Completed Processes */}
      <div className="w-full bg-black p-4 rounded-lg border border-white mb-8">
        <h3 className="text-lg font-semibold mb-3 border-b border-white pb-2">
          Completed Processes ({completedProcesses.length})
        </h3>
        <div className="flex flex-wrap gap-4 justify-center">
          {completedProcesses.map((p) => (
            <div
              key={p.name}
              className="p-3 rounded-lg border border-white text-center w-28 transition-all duration-300 hover:scale-105"
              style={{
                borderLeft: `5px solid ${processColors[p.name] || "#3498db"}`,
                background: `${processColors[p.name] || "#3498db"}10`
              }}
            >
              <p className="font-bold text-lg">{p.name}</p>
              <p className="text-xs mt-1">Completed</p>
            </div>
          ))}
          {completedProcesses.length === 0 && (
            <p className="text-gray-400 italic">No completed processes</p>
          )}
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="w-full bg-black p-4 rounded-lg border border-white mb-8">
        <h3 className="text-lg font-semibold mb-4 border-b border-white pb-2">Gantt Chart</h3>
        
        {ganttChart.length > 0 ? (
          <div className="relative">
            {/* Time Axis */}
            <div className="absolute left-0 right-0 bottom-0 h-8 border-t border-white"></div>
            
            {/* Process Blocks */}
            <div className="flex h-20 mb-12 relative">
              {ganttChart.map((entry, index) => {
                // Calculate total timeline length for scaling
                const totalTime = ganttChart[ganttChart.length - 1].endTime;
                
                // Calculate width as percentage of total time
                const blockWidth = ((entry.endTime - entry.startTime) / totalTime) * 100;
                
                return (
                  <div key={`${entry.name}-${index}`} className="flex h-full group">
                    {/* Process block */}
                    <div className="relative h-full">
                      {/* Process box */}
                      <div
                        className={`h-4/5 mt-2 flex items-center justify-center text-white font-bold rounded-md shadow-md transition-all duration-300 hover:h-full hover:mt-0 ${
                          entry.isIdle ? "opacity-70" : ""
                        }`}
                        style={{
                          width: `${blockWidth}%`,
                          backgroundColor: entry.isIdle ? "#555" : (processColors[entry.name] || "#3498db"),
                          minWidth: '40px'
                        }}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-bold">{entry.isIdle ? "Idle" : entry.name}</span>
                          <span className="text-xs">{entry.endTime - entry.startTime}u</span>
                        </div>
                      </div>
                      
                      {/* Vertical timeline connector */}
                      <div className="absolute left-0 -bottom-8 w-px h-8 bg-gray-600"></div>
                      
                      {/* Time label */}
                      <div className="absolute left-0 -bottom-8 text-xs font-medium bg-gray-800 px-1 py-1 rounded-md transform -translate-x-1/2">
                        {entry.startTime}
                      </div>
                      
                      {index === ganttChart.length - 1 && (
                        <div className="absolute right-0 -bottom-8 text-xs font-medium bg-gray-800 px-1 py-1 rounded-md transform translate-x-1/2">
                          {entry.endTime}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Timeline base */}
              <div className="absolute left-0 right-0 -bottom-8 h-px bg-gray-500"></div>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 italic text-center py-8">Gantt chart will appear here after simulation starts</p>
        )}
      </div>

      {/* Performance Metrics */}
      {Object.keys(processStats).length > 0 && (
        <div className="w-full bg-black p-4 rounded-lg border border-white">
          <h3 className="text-lg font-semibold mb-3 border-b border-white pb-2">Performance Metrics</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-black">
              <thead>
                <tr className="bg-gray-900">
                  <th className="py-2 px-4 border border-white">Process</th>
                  <th className="py-2 px-4 border border-white">Arrival Time</th>
                  <th className="py-2 px-4 border border-white">Burst Time</th>
                  <th className="py-2 px-4 border border-white">Completion Time</th>
                  <th className="py-2 px-4 border border-white">Turnaround Time</th>
                  <th className="py-2 px-4 border border-white">Waiting Time</th>
                  <th className="py-2 px-4 border border-white">Response Time</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(processStats).map(([name, stats]) => (
                  <tr key={name}>
                    <td className="py-2 px-4 border border-white font-medium" style={{color: processColors[name] || "#3498db"}}>{name}</td>
                    <td className="py-2 px-4 border border-white text-center">{stats.arrivalTime}</td>
                    <td className="py-2 px-4 border border-white text-center">{stats.burstTime}</td>
                    <td className="py-2 px-4 border border-white text-center">{stats.completionTime}</td>
                    <td className="py-2 px-4 border border-white text-center">{stats.turnaroundTime}</td>
                    <td className="py-2 px-4 border border-white text-center">{stats.waitingTime}</td>
                    <td className="py-2 px-4 border border-white text-center">{stats.responseTime}</td>
                  </tr>
                ))}
                
                {/* Average metrics row */}
                <tr className="bg-gray-900 font-semibold">
                  <td className="py-2 px-4 border border-white text-right" colSpan="4">Average</td>
                  <td className="py-2 px-4 border border-white text-center">
                    {(Object.values(processStats).reduce((sum, stats) => sum + stats.turnaroundTime, 0) / Object.keys(processStats).length.toFixed(2))}
                  </td>
                  <td className="py-2 px-4 border border-white text-center">
                    {(Object.values(processStats).reduce((sum, stats) => sum + stats.waitingTime, 0) / Object.keys(processStats).length.toFixed(2))}
                  </td>
                  <td className="py-2 px-4 border border-white text-center">
                    {(Object.values(processStats).reduce((sum, stats) => sum + stats.responseTime, 0) / Object.keys(processStats).length.toFixed(2))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
            <h4 className="font-semibold mb-2">Round Robin Characteristics:</h4>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>Each process gets a fixed time slice (quantum) to execute</li>
              <li>Preemptive - Processes can be interrupted when quantum expires</li>
              <li>Fair scheduling - No process gets starved</li>
              <li>Performance depends heavily on quantum size</li>
              <li>Good for time-sharing systems</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoundRobin;