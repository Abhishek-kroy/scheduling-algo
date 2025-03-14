import { useState, useEffect } from "react";

const processColors = {
  P1: "#FF5733",
  P2: "#33FF57",
  P3: "#3357FF",
  P4: "#FF33A8",
  P5: "#33FFF9",
  // Add more process colors as needed
};

const RoundRobin = ({ processes, timeQuantum = 2 }) => {
  const [pendingProcesses, setPendingProcesses] = useState([]);
  const [readyQueue, setReadyQueue] = useState([]);
  const [completedProcesses, setCompletedProcesses] = useState([]);
  const [currentProcess, setCurrentProcess] = useState(null);
  const [ganttChart, setGanttChart] = useState([]);
  const [enteringProcess, setEnteringProcess] = useState(null);
  const [exitingProcess, setExitingProcess] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [animatingTimeJump, setAnimatingTimeJump] = useState(false);
  const [timeJumpTarget, setTimeJumpTarget] = useState(0);
  const [remainingTime, setRemainingTime] = useState({});
  const [quantumProgress, setQuantumProgress] = useState(0);

  // Initialize simulation
  const startSimulation = () => {
    // Deep copy processes to avoid reference issues
    const processesWithRemaining = processes.map(process => ({
      ...process,
      remainingTime: parseInt(process.burstTime)
    }));
    
    // Initialize remaining time for each process
    const initialRemaining = {};
    processesWithRemaining.forEach(process => {
      initialRemaining[process.name] = parseInt(process.burstTime);
    });
    
    setRemainingTime(initialRemaining);
    setPendingProcesses([...processesWithRemaining]);
    setReadyQueue([]);
    setCompletedProcesses([]);
    setGanttChart([]);
    setCurrentProcess(null);
    setEnteringProcess(null);
    setExitingProcess(null);
    setCurrentTime(0);
    setAnimatingTimeJump(false);
    setTimeJumpTarget(0);
    setQuantumProgress(0);
    setIsSimulating(true);
  };

  // Calculate delay based on animation speed
  const getAnimationDelay = (baseDelay) => {
    return baseDelay / animationSpeed;
  };

  // Handle simulation steps
  useEffect(() => {
    if (!isSimulating) return;

    const simulationStep = async () => {
      // Check for any new processes that have arrived
      const newArrivals = pendingProcesses.filter(
        process => parseInt(process.arrivalTime) <= currentTime
      );
      
      if (newArrivals.length > 0) {
        // Move newly arrived processes to the ready queue
        for (const process of newArrivals) {
          setEnteringProcess(process.name);
          await new Promise(resolve => setTimeout(resolve, getAnimationDelay(600)));
          setEnteringProcess(null);
        }
        
        // Update states
        setPendingProcesses(prev => prev.filter(
          process => parseInt(process.arrivalTime) > currentTime
        ));
        setReadyQueue(prev => [...prev, ...newArrivals]);
      }
      
      // If there's no current process but ready queue has processes
      if (!currentProcess && readyQueue.length > 0) {
        // Get the next process from ready queue (Round Robin uses FIFO)
        const nextProcess = readyQueue[0];
        setCurrentProcess(nextProcess);
        setQuantumProgress(0);
        
        // Visual delay to show process selection
        await new Promise(resolve => setTimeout(resolve, getAnimationDelay(600)));
        
        // Remove the process from ready queue
        setReadyQueue(prev => prev.slice(1));
        
        // Calculate execution time for this quantum
        const executeTime = Math.min(parseInt(timeQuantum), remainingTime[nextProcess.name]);
        
        // Create a Gantt chart entry
        const ganttEntry = {
          ...nextProcess,
          startTime: currentTime,
          endTime: currentTime + executeTime,
          quantum: executeTime
        };
        
        // Animate process execution
        setAnimatingTimeJump(true);
        setTimeJumpTarget(currentTime + executeTime);
        
        // Animate the time increment with quantum progress update
        for (let t = 1; t <= executeTime; t++) {
          setQuantumProgress((t / executeTime) * 100);
          setCurrentTime(currentTime + t);
          await new Promise(resolve => setTimeout(resolve, getAnimationDelay(600)));
        }
        
        setAnimatingTimeJump(false);
        setQuantumProgress(0);
        
        // Update the Gantt chart
        setGanttChart(prev => [...prev, ganttEntry]);
        
        // Update remaining time
        setRemainingTime(prev => ({
          ...prev,
          [nextProcess.name]: prev[nextProcess.name] - executeTime
        }));
        
        // Check if process is completed
        if (remainingTime[nextProcess.name] - executeTime <= 0) {
          // Process completed
          setExitingProcess(nextProcess.name);
          await new Promise(resolve => setTimeout(resolve, getAnimationDelay(600)));
          setCompletedProcesses(prev => [...prev, {
            ...nextProcess,
            completionTime: currentTime + executeTime
          }]);
        } else {
          // Process still has remaining time, add back to ready queue
          setExitingProcess(nextProcess.name);
          await new Promise(resolve => setTimeout(resolve, getAnimationDelay(600)));
          
          // Add back to ready queue with updated remaining time
          const updatedProcess = {
            ...nextProcess,
            remainingTime: remainingTime[nextProcess.name] - executeTime
          };
          setReadyQueue(prev => [...prev, updatedProcess]);
        }
        
        setCurrentProcess(null);
        setExitingProcess(null);
      } else if (readyQueue.length === 0 && pendingProcesses.length > 0) {
        // If there are no processes in ready queue but pending processes exist
        // Jump to the next arrival time
        const nextArrivalTime = Math.min(
          ...pendingProcesses.map(p => parseInt(p.arrivalTime))
        );
        
        // Animate time jump
        setAnimatingTimeJump(true);
        setTimeJumpTarget(nextArrivalTime);
        
        // Animate the time increment
        for (let t = currentTime + 1; t <= nextArrivalTime; t++) {
          setCurrentTime(t);
          await new Promise(resolve => setTimeout(resolve, getAnimationDelay(50)));
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
  }, [currentTime, isSimulating, pendingProcesses, readyQueue, currentProcess, remainingTime, animationSpeed, timeQuantum]);
  
  // Calculate metrics when simulation ends
  useEffect(() => {
    if (isSimulating && pendingProcesses.length === 0 && readyQueue.length === 0 && !currentProcess) {
      setIsSimulating(false);
    }
  }, [pendingProcesses, readyQueue, currentProcess, isSimulating]);

  // Calculate process statistics
  const calculateProcessStats = () => {
    const processStats = {};
    const processNames = [...new Set(ganttChart.filter(entry => !entry.isIdle).map(entry => entry.name))];
    
    // Initialize stats
    processNames.forEach(name => {
      processStats[name] = {
        arrivalTime: parseInt(processes.find(p => p.name === name).arrivalTime),
        burstTime: parseInt(processes.find(p => p.name === name).burstTime),
        completionTime: 0,
        turnaroundTime: 0,
        waitingTime: 0,
        responseTime: null // Will be set to the first time the process starts execution
      };
    });
    
    // Calculate completion time (last end time for each process)
    ganttChart.forEach(entry => {
      if (!entry.isIdle && entry.endTime > processStats[entry.name].completionTime) {
        processStats[entry.name].completionTime = entry.endTime;
      }
      
      // Set response time (first time the process starts execution)
      if (!entry.isIdle && processStats[entry.name].responseTime === null) {
        processStats[entry.name].responseTime = entry.startTime - processStats[entry.name].arrivalTime;
      }
    });
    
    // Calculate turnaround and waiting times
    processNames.forEach(name => {
      processStats[name].turnaroundTime = processStats[name].completionTime - processStats[name].arrivalTime;
      processStats[name].waitingTime = processStats[name].turnaroundTime - processStats[name].burstTime;
    });
    
    return processStats;
  };

  // Get process stats in array form
  const getProcessStatsArray = () => {
    const stats = calculateProcessStats();
    return Object.keys(stats).map(name => ({
      name,
      ...stats[name]
    }));
  };

  return (
    <div className="mt-10 mb-10 flex flex-col items-center p-6 bg-black rounded-lg border border-white text-white min-w-[80vw] mx-auto">
      <h2 className="text-2xl font-bold mb-6">Round Robin Scheduling Visualization</h2>

      <div className="w-full flex justify-between items-center mb-8">
        <div className="flex space-x-3">
          <button
            onClick={startSimulation}
            disabled={isSimulating}
            className={`px-6 py-3 rounded-lg border border-white font-bold transition-all duration-300 ${
              isSimulating 
                ? "bg-gray-800 text-gray-400 cursor-not-allowed" 
                : "bg-black text-white hover:bg-gray-900"
            }`}
          >
            {isSimulating ? "Simulation in Progress..." : "Start Round Robin Simulation"}
          </button>
          
          {/* Time Quantum Input */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Time Quantum:</label>
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
        </div>
        
        {/* Animation Speed Control */}
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium">Animation Speed:</span>
          <div className="flex space-x-2">
            <button 
              onClick={() => setAnimationSpeed(0.5)} 
              className={`px-3 py-1 rounded border transition-all duration-300 ${
                animationSpeed === 0.5 ? "bg-white text-black" : "bg-black text-white"
              }`}
              disabled={isSimulating && !animatingTimeJump}
            >
              0.5x
            </button>
            <button 
              onClick={() => setAnimationSpeed(1)} 
              className={`px-3 py-1 rounded border transition-all duration-300 ${
                animationSpeed === 1 ? "bg-white text-black" : "bg-black text-white"
              }`}
              disabled={isSimulating && !animatingTimeJump}
            >
              1x
            </button>
            <button 
              onClick={() => setAnimationSpeed(2)} 
              className={`px-3 py-1 rounded border transition-all duration-300 ${
                animationSpeed === 2 ? "bg-white text-black" : "bg-black text-white"
              }`}
              disabled={isSimulating && !animatingTimeJump}
            >
              2x
            </button>
          </div>
        </div>
      </div>

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
      <div className="w-full flex flex-col gap-6 mb-8">
        {/* Pending Processes */}
        <div className="w-full min-h-40  bg-black p-4 rounded-lg border border-white">
          <h3 className="text-lg font-semibold mb-3 border-b border-white pb-2">Pending Processes</h3>
          <div className="flex flex-wrap gap-4 justify-center">
            {pendingProcesses.map((p) => (
              <div
                key={p.name}
                className={`p-4 rounded-lg border text-center transition-all duration-500 w-32 ${
                  enteringProcess === p.name ? "scale-110 border-yellow-500 border-2" : "border-white"
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
            {pendingProcesses.length === 0 && !isSimulating && (
              <p className="text-gray-400 italic">No pending processes</p>
            )}
          </div>
        </div>

        {/* Ready Queue */}
        <div className="w-full min-h-40 bg-black p-4 rounded-lg border border-white">
          <h3 className="text-lg font-semibold mb-3 border-b border-white pb-2">Ready Queue</h3>
          <div className="flex flex-wrap gap-4 justify-center">
            {readyQueue.map((p, index) => (
              <div
                key={`${p.name}-${index}`}
                className={`p-4 rounded-lg border text-center transition-all duration-500 w-32 ${
                  exitingProcess === p.name ? "opacity-50 scale-95" : "border-white"
                }`}
                style={{
                  borderLeft: `5px solid ${processColors[p.name] || "#3498db"}`
                }}
              >
                <p className="font-bold text-lg">{p.name}</p>
                <div className="grid grid-cols-2 gap-1 mt-2 text-sm">
                  <p className="bg-gray-900 rounded p-1">Arrival: {p.arrivalTime}</p>
                  <p className="bg-gray-900 rounded p-1">Remaining: {p.remainingTime}</p>
                </div>
              </div>
            ))}
            {readyQueue.length === 0 && (
              <p className="text-gray-400 italic">No processes in ready queue</p>
            )}
          </div>
        </div>

        {/* CPU Execution */}
        <div className="w-full min-h-40 bg-black p-4 rounded-lg border border-white">
          <h3 className="text-lg font-semibold mb-3 border-b border-white pb-2">CPU Execution</h3>
          <div className="flex justify-center">
            {currentProcess ? (
              <div
                className="p-6 rounded-lg border-2 text-center w-64 relative overflow-hidden"
                style={{
                  borderColor: `${processColors[currentProcess.name] || "#3498db"}`,
                  background: `${processColors[currentProcess.name] || "#3498db"}10`
                }}
              >
                <p className="font-bold text-xl">{currentProcess.name}</p>
                <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                  <p className="bg-gray-900 rounded p-1">Remaining: {remainingTime[currentProcess.name]}</p>
                  <p className="bg-gray-900 rounded p-1">Quantum: {timeQuantum}</p>
                </div>
                
                {/* Progress bar for quantum */}
                <div className="w-full h-2 bg-gray-800 rounded-full mt-4 overflow-hidden">
                  <div 
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${quantumProgress}%`,
                      backgroundColor: processColors[currentProcess.name] || "#3498db"
                    }}
                  ></div>
                </div>
                
                {/* Animated overlay effect */}
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20"
                  style={{
                    animation: "wave 1.5s infinite",
                    backgroundSize: "200% 100%"
                  }}
                ></div>
                
                <style jsx>{`
                  @keyframes wave {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                  }
                `}</style>
              </div>
            ) : (
              <p className="text-gray-400 italic py-6">CPU idle</p>
            )}
          </div>
        </div>

        {/* Completed Processes */}
        <div className="w-full min-h-40 bg-black p-4 rounded-lg border border-white">
          <h3 className="text-lg font-semibold mb-3 border-b border-white pb-2">Completed Processes</h3>
          <div className="flex flex-wrap gap-4 justify-center">
            {completedProcesses.map((p) => (
              <div
                key={p.name}
                className="p-4 rounded-lg border border-white text-center w-32 transition-all duration-500 hover:scale-105"
                style={{
                  borderLeft: `5px solid ${processColors[p.name] || "#3498db"}`,
                  background: `${processColors[p.name] || "#3498db"}10`
                }}
              >
                <p className="font-bold text-lg">{p.name}</p>
                <div className="grid grid-cols-1 gap-1 mt-2 text-sm">
                  <p className="bg-gray-900 rounded p-1">Completion: {p.completionTime}</p>
                </div>
              </div>
            ))}
            {completedProcesses.length === 0 && (
              <p className="text-gray-400 italic">No completed processes</p>
            )}
          </div>
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
                const totalTime = ganttChart.reduce((sum, e) => sum + (e.endTime - e.startTime), 0);
                
                // Calculate width as percentage of total time
                const blockWidth = ((entry.endTime - entry.startTime) / totalTime) * 100;
                
                return (
                  <div key={`${entry.name}-${index}`} className="flex h-full group">
                    {/* Process block */}
                    <div className="relative h-full">
                      {/* Process box */}
                      <div
                        className="h-4/5 mt-2 flex items-center justify-center text-white font-bold rounded-md shadow-md transition-all duration-300 hover:h-full hover:mt-0 group-hover:shadow-lg"
                        style={{
                          width: `${blockWidth}%`,
                          backgroundColor: entry.isIdle ? "#555" : (processColors[entry.name] || "#3498db"),
                          minWidth: '50px',
                          opacity: entry.isIdle ? 0.6 : 1
                        }}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-bold">{entry.isIdle ? "Idle" : entry.name}</span>
                          <span className="text-xs">{entry.endTime - entry.startTime}u</span>
                        </div>
                      </div>
                      
                      {/* Vertical timeline connector */}
                      <div className="absolute left-1/2 -bottom-8 w-px h-8 bg-gray-600 transform -translate-x-1/2"></div>
                      
                      {/* Time labels */}
                      <div className="absolute left-0 -bottom-8 text-xs font-medium bg-gray-800 px-2 py-1 rounded-md transform -translate-x-1/2">
                        {entry.startTime}
                      </div>
                      
                      {index === ganttChart.length - 1 && (
                        <div className="absolute right-0 -bottom-8 text-xs font-medium bg-gray-800 px-2 py-1 rounded-md transform translate-x-1/2">
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

      {/* Process Statistics */}
      {!isSimulating && ganttChart.length > 0 && (
        <div className="w-full">
          <h3 className="text-lg font-semibold mb-3">Process Statistics</h3>
          <div className="w-full overflow-x-auto">
            <table className="min-w-full border-collapse border border-white text-sm">
              <thead>
                <tr className="bg-gray-900">
                  <th className="border border-white p-2">Process</th>
                  <th className="border border-white p-2">Arrival Time</th>
                  <th className="border border-white p-2">Burst Time</th>
                  <th className="border border-white p-2">Completion Time</th>
                  <th className="border border-white p-2">Turnaround Time</th>
                  <th className="border border-white p-2">Waiting Time</th>
                  <th className="border border-white p-2">Response Time</th>
                </tr>
              </thead>
              <tbody>
                {getProcessStatsArray().map((stat) => (
                  <tr key={stat.name} className="hover:bg-gray-900 transition-colors duration-200">
                    <td className="border border-white p-2 font-medium" style={{ color: processColors[stat.name] || "#3498db" }}>
                      {stat.name}
                    </td>
                    <td className="border border-white p-2 text-center">{stat.arrivalTime}</td>
                    <td className="border border-white p-2 text-center">{stat.burstTime}</td>
                    <td className="border border-white p-2 text-center">{stat.completionTime}</td>
                    <td className="border border-white p-2 text-center">{stat.turnaroundTime}</td>
                    <td className="border border-white p-2 text-center">{stat.waitingTime}</td>
                    <td className="border border-white p-2 text-center">{stat.responseTime}</td>
                  </tr>
                ))}
                <tr className="bg-gray-900 font-bold">
                  <td className="border border-white p-2">Average</td>
                  <td className="border border-white p-2 text-center">-</td>
                  <td className="border border-white p-2 text-center">-</td>
                  <td className="border border-white p-2 text-center">-</td>
                  <td className="border border-white p-2 text-center">
                    {(getProcessStatsArray().reduce((sum, stat) => sum + stat.turnaroundTime, 0) / getProcessStatsArray().length).toFixed(2)}
                  </td>
                  <td className="border border-white p-2 text-center">
                    {(getProcessStatsArray().reduce((sum, stat) => sum + stat.waitingTime, 0) / getProcessStatsArray().length).toFixed(2)}
                  </td>
                  <td className="border border-white p-2 text-center">
                    {(getProcessStatsArray().reduce((sum, stat) => sum + stat.responseTime, 0) / getProcessStatsArray().length).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoundRobin;