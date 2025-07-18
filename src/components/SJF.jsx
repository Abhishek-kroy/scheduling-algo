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

const SJF = ({ processes }) => {
  const [pendingProcesses, setPendingProcesses] = useState([]);
  const [completedProcesses, setCompletedProcesses] = useState([]);
  const [currentProcess, setCurrentProcess] = useState(null);
  const [ganttChart, setGanttChart] = useState([]);
  const [comparingProcess, setComparingProcess] = useState(null);
  const [fadeOutProcess, setFadeOutProcess] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [animatingTimeJump, setAnimatingTimeJump] = useState(false);
  const [timeJumpTarget, setTimeJumpTarget] = useState(0);
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
      setPendingProcesses([...processes]);
      setCompletedProcesses([]);
      setGanttChart([]);
      setCurrentProcess(null);
      setComparingProcess(null);
      setFadeOutProcess(null);
      setCurrentTime(0);
      setAnimatingTimeJump(false);
      setTimeJumpTarget(0);
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

  const stopSimulation = () => {
    setIsSimulating(false);
    setIsPaused(true);
  };

  const resetSimulation = () => {
    setPendingProcesses([]);
    setCompletedProcesses([]);
    setGanttChart([]);
    setCurrentProcess(null);
    setComparingProcess(null);
    setFadeOutProcess(null);
    setCurrentTime(0);
    setAnimatingTimeJump(false);
    setTimeJumpTarget(0);
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

  const addNewProcesses = (newProcesses) => {
    const filteredNewProcesses = newProcesses.filter(newProcess => 
      newProcess.arrivalTime >= currentTime &&
      !pendingProcesses.some(p => p.name === newProcess.name) &&
      !completedProcesses.some(p => p.name === newProcess.name)
    );

    if (filteredNewProcesses.length > 0) {
      setPendingProcesses(prev => [...prev, ...filteredNewProcesses]);
    }
  };

  useEffect(() => {
    if (simulationState.initialized && processes.length > 0) {
      addNewProcesses(processes);
    }
  }, [processes, simulationState.initialized]);

  const getAnimationDelay = (baseDelay) => {
    return baseDelay / animationSpeed;
  };

  useEffect(() => {
    if (!isSimulating || isPaused || pendingProcesses.length === 0) return;
    
    const simulationStep = async () => {
      if (simulationState.executingProcess) {
        const process = simulationState.executingProcess;
        const remainingTime = simulationState.processEndTime - currentTime;
        
        setAnimatingTimeJump(true);
        setTimeJumpTarget(simulationState.processEndTime);
        
        const continueExecution = async () => {
          for (let t = currentTime + 1; t <= simulationState.processEndTime; t++) {
            if (!isSimulating || isPaused) break;
            setCurrentTime(t);
            await new Promise(resolve => setTimeout(resolve, getAnimationDelay(100)));
          }
          setAnimatingTimeJump(false);
        };
        
        await continueExecution();
        
        if (isSimulating && !isPaused) {
          setGanttChart(prev => [...prev, {
            ...process,
            startTime: simulationState.processStartTime,
            endTime: simulationState.processEndTime
          }]);
          setCompletedProcesses(prev => [...prev, process]);
          setPendingProcesses(prev => prev.filter(p => p.name !== process.name));
          setCurrentProcess(null);
          setFadeOutProcess(null);
          setSimulationState(prev => ({
            ...prev,
            executingProcess: null,
            processStartTime: null,
            processEndTime: null,
            executionProgress: 0
          }));
        }
        return;
      }
      
      const arrivedProcesses = pendingProcesses.filter(p => parseInt(p.arrivalTime) <= currentTime);
      
      if (arrivedProcesses.length === 0) {
        const nextArrival = Math.min(...pendingProcesses.map(p => parseInt(p.arrivalTime)));
        setAnimatingTimeJump(true);
        setTimeJumpTarget(nextArrival);
        
        const incrementTime = async () => {
          for (let t = currentTime + 1; t <= nextArrival; t++) {
            if (!isSimulating || isPaused) break;
            setCurrentTime(t);
            await new Promise(resolve => setTimeout(resolve, getAnimationDelay(100)));
          }
          setAnimatingTimeJump(false);
        };
        
        await incrementTime();
        return;
      }
      
      let minProcess = arrivedProcesses[0];
      setCurrentProcess(minProcess);
      
      await new Promise(resolve => setTimeout(resolve, getAnimationDelay(500)));
      
      for (let i = 1; i < arrivedProcesses.length; i++) {
        if (!isSimulating || isPaused) break;
        
        const processToCompare = arrivedProcesses[i];
        setComparingProcess(processToCompare);
        
        await new Promise(resolve => setTimeout(resolve, getAnimationDelay(500)));
        
        if (parseInt(processToCompare.burstTime) < parseInt(minProcess.burstTime)) {
          minProcess = processToCompare;
          setCurrentProcess(minProcess);
          await new Promise(resolve => setTimeout(resolve, getAnimationDelay(300)));
        }
      }
      
      if (!isSimulating || isPaused) return;
      
      setComparingProcess(null);
      
      const nextProcess = minProcess;
      
      await new Promise(resolve => setTimeout(resolve, getAnimationDelay(500)));
      
      setFadeOutProcess(nextProcess.name);
      
      const startTime = Math.max(currentTime, parseInt(minProcess.arrivalTime));
      const endTime = startTime + parseInt(minProcess.burstTime);
      
      if (startTime > currentTime) {
        setAnimatingTimeJump(true);
        setTimeJumpTarget(startTime);
        
        const incrementTime = async () => {
          for (let t = currentTime + 1; t <= startTime; t++) {
            if (!isSimulating || isPaused) break;
            setCurrentTime(t);
            await new Promise(resolve => setTimeout(resolve, getAnimationDelay(100)));
          }
          setAnimatingTimeJump(false);
        };
        
        await incrementTime();
      }
      
      if (!isSimulating || isPaused) return;
      
      setSimulationState(prev => ({
        ...prev,
        executingProcess: nextProcess,
        processStartTime: startTime,
        processEndTime: endTime,
        executionProgress: 0
      }));
      
      setAnimatingTimeJump(true);
      setTimeJumpTarget(endTime);
      
      const executeProcess = async () => {
        for (let t = startTime + 1; t <= endTime; t++) {
          if (!isSimulating || isPaused) break;
          setCurrentTime(t);
          await new Promise(resolve => setTimeout(resolve, getAnimationDelay(100)));
        }
        setAnimatingTimeJump(false);
      };
      
      await executeProcess();
      
      if (!isSimulating || isPaused) return;
      
      setGanttChart(prev => [...prev, {
        ...nextProcess,
        startTime,
        endTime
      }]);
      setCompletedProcesses(prev => [...prev, nextProcess]);
      setPendingProcesses(prev => prev.filter(p => p.name !== nextProcess.name));
      setCurrentProcess(null);
      setFadeOutProcess(null);
      setSimulationState(prev => ({
        ...prev,
        executingProcess: null,
        processStartTime: null,
        processEndTime: null,
        executionProgress: 0
      }));
    };
    
    const timer = setTimeout(simulationStep, getAnimationDelay(500));
    return () => clearTimeout(timer);
  }, [pendingProcesses, currentTime, isSimulating, isPaused, animationSpeed, simulationState]);
  
  useEffect(() => {
    if (isSimulating && pendingProcesses.length === 0 && !simulationState.executingProcess) {
      setIsSimulating(false);
      setIsPaused(false);
    }
  }, [pendingProcesses, isSimulating, simulationState.executingProcess]);

  return (
    <div className="mt-10 mb-10 flex flex-col items-center p-6 bg-black rounded-lg border border-white text-white min-w-[80vw] mx-auto">
      <h2 className="text-2xl font-bold mb-6">SJF Scheduling Visualization</h2>

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
             isPaused ? "Resume Simulation" : "Start SJF Simulation"}
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
        
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium">Animation Speed:</span>
          <div className="flex space-x-2">
            <button 
              onClick={() => setAnimationSpeed(0.5)} 
              className={`px-3 py-1 rounded border transition-all duration-300 ${
                animationSpeed === 0.5 ? "bg-white text-black" : "bg-black text-white"
              }`}
              disabled={isSimulating && !isPaused}
            >
              0.5x
            </button>
            <button 
              onClick={() => setAnimationSpeed(1)} 
              className={`px-3 py-1 rounded border transition-all duration-300 ${
                animationSpeed === 1 ? "bg-white text-black" : "bg-black text-white"
              }`}
              disabled={isSimulating && !isPaused}
            >
              1x
            </button>
            <button 
              onClick={() => setAnimationSpeed(2)} 
              className={`px-3 py-1 rounded border transition-all duration-300 ${
                animationSpeed === 2 ? "bg-white text-black" : "bg-black text-white"
              }`}
              disabled={isSimulating && !isPaused}
            >
              2x
            </button>
          </div>
        </div>
      </div>

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
            {simulationState.executingProcess && (
              <span className="ml-4 text-blue-400">
                Executing: {simulationState.executingProcess.name}
              </span>
            )}
          </div>
        </div>
      )}

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

      <div className="w-full flex flex-col gap-8 mb-8">
        <div className="w-full bg-black p-4 rounded-lg border border-white">
          <h3 className="text-lg font-semibold mb-3 border-b border-white pb-2">
            Pending Processes ({pendingProcesses.length})
          </h3>
          <div className="flex flex-wrap gap-4 justify-center">
            {pendingProcesses.map((p) => (
              <div
                key={p.name}
                className={`p-4 rounded-lg border text-center transition-all duration-500 w-32 ${
                  fadeOutProcess === p.name
                    ? "opacity-0 scale-75 transform translate-y-4"
                    : currentProcess && currentProcess.name === p.name
                      ? "scale-110 border-yellow-500 border-2 bg-yellow-900 bg-opacity-30"
                      : comparingProcess && comparingProcess.name === p.name
                        ? "scale-105 border-red-500 border-2 bg-red-900 bg-opacity-30"
                        : "border-white"
                }`}
                style={{
                  borderLeft: `5px solid ${processColors[p.name] || "#3498db"}`
                }}
              >
                <p className="font-bold text-lg">{p.name}</p>
                <div className="grid grid-cols-2 gap-1 mt-2 text-sm">
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

        <div className="w-full bg-black p-4 rounded-lg border border-white">
          <h3 className="text-lg font-semibold mb-3 border-b border-white pb-2">
            Completed Processes ({completedProcesses.length})
          </h3>
          <div className="flex flex-wrap gap-4 justify-center">
            {completedProcesses.map((p) => (
              <div
                key={p.name}
                className="p-4 rounded-lg border border-white text-center w-32"
                style={{ 
                  borderLeftColor: processColors[p.name] || "#3498db",
                  borderLeftWidth: "5px"
                }}
              >
                <p className="font-bold text-lg">{p.name}</p>
                <p className="text-sm mt-1">Completed</p>
              </div>
            ))}
            {completedProcesses.length === 0 && (
              <p className="text-gray-400 italic">No completed processes</p>
            )}
          </div>
        </div>
      </div>

      <div className="w-full bg-black p-4 rounded-lg border border-white">
        <h3 className="text-lg font-semibold mb-4 border-b border-white pb-2">Gantt Chart</h3>
        
        {ganttChart.length > 0 ? (
          <div className="relative">
            <div className="absolute left-0 right-0 bottom-0 h-8 border-t border-white"></div>
            
            <div className="flex h-20 mb-12 relative">
              {ganttChart.map((p, index) => {
                const prevEndTime = index > 0 ? ganttChart[index - 1].endTime : 0;
                const idleTime = p.startTime - prevEndTime;
                const totalTime = ganttChart[ganttChart.length - 1].endTime;
                const idleWidth = (idleTime / totalTime) * 100;
                const processWidth = ((p.endTime - p.startTime) / totalTime) * 100;
                
                return (
                  <div key={p.name} className="flex h-full group">
                    {idleTime > 0 && (
                      <div 
                        className="h-full flex items-center justify-center bg-gray-900 border-r border-white bg-opacity-50"
                        style={{ 
                          width: `${idleWidth}%`,
                          minWidth: idleTime > 0 ? '30px' : '0'
                        }}
                      >
                        <span className="text-gray-300 text-xs font-medium">Idle</span>
                      </div>
                    )}
                    
                    <div className="relative h-full px-1">
                      <div
                        className="h-4/5 mt-2 flex items-center justify-center text-white font-bold rounded-md shadow-md transition-all duration-300 hover:h-full hover:mt-0 hover:scale-105"
                        style={{
                          width: `${processWidth}%`,
                          backgroundColor: processColors[p.name] || "#3498db",
                          minWidth: '50px'
                        }}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-bold">{p.name}</span>
                          <span className="text-xs">{p.endTime - p.startTime}u</span>
                        </div>
                      </div>
                      
                      <div className="absolute left-1/2 -bottom-8 w-px h-8 bg-gray-600 transform -translate-x-1/2"></div>
                      
                      <div className="absolute left-0 -bottom-8 text-xs font-medium bg-gray-800 px-2 py-1 rounded-md transform -translate-x-1/2">
                        {p.startTime}
                      </div>
                      
                      {index === ganttChart.length - 1 && (
                        <div className="absolute right-0 -bottom-8 text-xs font-medium bg-gray-800 px-2 py-1 rounded-md transform translate-x-1/2">
                          {p.endTime}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              <div className="absolute left-0 right-0 -bottom-8 h-px bg-gray-500"></div>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 italic text-center py-8">Gantt chart will appear here after simulation starts</p>
        )}
      </div>

      {completedProcesses.length > 0 && ganttChart.length > 0 && (
        <div className="w-full bg-black p-4 rounded-lg border border-white mt-8">
          <h3 className="text-lg font-semibold mb-3 border-b border-white pb-2">Performance Metrics</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-black">
              <thead>
                <tr className="bg-gray-900">
                  <th className="py-2 px-4 border border-white">Process</th>
                  <th className="py-2 px-4 border border-white">Arrival Time</th>
                  <th className="py-2 px-4 border border-white">Burst Time</th>
                  <th className="py-2 px-4 border border-white">Start Time</th>
                  <th className="py-2 px-4 border border-white">Completion Time</th>
                  <th className="py-2 px-4 border border-white">Turnaround Time</th>
                  <th className="py-2 px-4 border border-white">Waiting Time</th>
                </tr>
              </thead>
              <tbody>
                {ganttChart.map(p => {
                  const turnaroundTime = p.endTime - parseInt(p.arrivalTime);
                  const waitingTime = p.startTime - parseInt(p.arrivalTime);
                  
                  return (
                    <tr key={p.name}>
                      <td className="py-2 px-4 border border-white font-medium" style={{color: processColors[p.name] || "#3498db"}}>{p.name}</td>
                      <td className="py-2 px-4 border border-white text-center">{p.arrivalTime}</td>
                      <td className="py-2 px-4 border border-white text-center">{p.burstTime}</td>
                      <td className="py-2 px-4 border border-white text-center">{p.startTime}</td>
                      <td className="py-2 px-4 border border-white text-center">{p.endTime}</td>
                      <td className="py-2 px-4 border border-white text-center">{turnaroundTime}</td>
                      <td className="py-2 px-4 border border-white text-center">{waitingTime}</td>
                    </tr>
                  );
                })}
                
                {ganttChart.length > 0 && (
                  <tr className="bg-gray-900 font-semibold">
                    <td className="py-2 px-4 border border-white text-right" colSpan="5">Average</td>
                    <td className="py-2 px-4 border border-white text-center">
                      {(ganttChart.reduce((sum, p) => sum + (p.endTime - parseInt(p.arrivalTime)), 0) / ganttChart.length).toFixed(2)}
                    </td>
                    <td className="py-2 px-4 border border-white text-center">
                      {(ganttChart.reduce((sum, p) => sum + (p.startTime - parseInt(p.arrivalTime)), 0) / ganttChart.length).toFixed(2)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SJF;