'use client';

import React, { useState } from 'react';
import { Stage, Layer, Rect, Text, Line } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';

type Task = {
  id: number;
  project_id: number;
  task: string;
  status: string;
  deadline: string;
  start_date: string;
  end_date: string;
  assigned_to: string;
  dependencies: number[];
  milestone_id?: number;
  contractor_id?: number;
};

type Milestone = {
  id: number;
  project_id: number;
  name: string;
  date: string;
  linked_tasks: number[];
};

type GanttChartInnerProps = {
  tasks: Task[];
  milestones: Milestone[];
  onUpdateTaskDates: (taskId: number, startDate: string, endDate: string) => void;
  onUpdateDependencies: (taskId: number, dependencies: number[]) => void;
};

const GanttChartInner: React.FC<GanttChartInnerProps> = ({
  tasks,
  milestones,
  onUpdateTaskDates,
  onUpdateDependencies,
}) => {
  const [draggingTask, setDraggingTask] = useState<number | null>(null);
  const [linkingTask, setLinkingTask] = useState<number | null>(null);
  const [linkStartX, setLinkStartX] = useState<number | null>(null);
  const [linkStartY, setLinkStartY] = useState<number | null>(null);
  const [linkEndX, setLinkEndX] = useState<number | null>(null);
  const [linkEndY, setLinkEndY] = useState<number | null>(null);
  const [hoveredTask, setHoveredTask] = useState<number | null>(null);
  const [dragStartX, setDragStartX] = useState<number | null>(null);

  const earliestDate = tasks.reduce((earliest, task) => {
    const start = new Date(task.start_date);
    return start < earliest ? start : earliest;
  }, new Date(tasks[0]?.start_date || Date.now()));

  const latestDate = tasks.reduce((latest, task) => {
    const end = new Date(task.end_date);
    return end > latest ? end : latest;
  }, new Date(tasks[0]?.end_date || Date.now()));

  const totalDays = (latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24);
  const pixelsPerDay = 1000 / totalDays;

  const taskHeight = 30;
  const taskSpacing = 10;
  const chartHeight = tasks.length * (taskHeight + taskSpacing) + 50;

  const getTaskPosition = (task: Task) => {
    const start = new Date(task.start_date);
    const end = new Date(task.end_date);
    const startOffset = (start.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return {
      x: startOffset * pixelsPerDay,
      width: duration * pixelsPerDay,
    };
  };

  const getMilestonePosition = (milestone: Milestone) => {
    const date = new Date(milestone.date);
    const offset = (date.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24);
    return offset * pixelsPerDay;
  };

  const calculateCriticalPath = () => {
    const earliestStart: { [key: number]: number } = {};
    const latestFinish: { [key: number]: number } = {};
    const taskDurations: { [key: number]: number } = {};

    tasks.forEach((task) => {
      const start = new Date(task.start_date);
      const end = new Date(task.end_date);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      taskDurations[task.id] = duration;
      earliestStart[task.id] = 0;
      latestFinish[task.id] = Infinity;
    });

    const forwardPass = () => {
      tasks.forEach((task) => {
        // Removed unused startOffset variable
        task.dependencies.forEach((depId) => {
          const depEnd = earliestStart[depId] + taskDurations[depId];
          if (depEnd > earliestStart[task.id]) {
            earliestStart[task.id] = depEnd;
          }
        });
      });
    };

    const backwardPass = () => {
      const maxFinish = Math.max(...Object.values(earliestStart).map((es, idx) => es + taskDurations[tasks[idx].id]));
      tasks.forEach((task) => {
        latestFinish[task.id] = maxFinish;
        tasks.forEach((otherTask) => {
          if (otherTask.dependencies.includes(task.id)) {
            const finish = latestFinish[otherTask.id] - taskDurations[otherTask.id];
            if (finish < latestFinish[task.id]) {
              latestFinish[task.id] = finish;
            }
          }
        });
      });
    };

    forwardPass();
    backwardPass();

    const criticalPath = tasks.filter((task) => {
      const slack = latestFinish[task.id] - (earliestStart[task.id] + taskDurations[task.id]);
      return slack === 0;
    }).map((task) => task.id);

    return criticalPath;
  };

  const criticalPath = calculateCriticalPath();

  const handleDragStart = (taskId: number) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const { x } = getTaskPosition(task);
      setDragStartX(x + 150);
    }
    setDraggingTask(taskId);
  };

  const handleDragMove = (e: KonvaEventObject<DragEvent>, taskId: number) => {
    if (draggingTask !== taskId || dragStartX === null) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const currentX = e.target.x();
    const deltaX = currentX - dragStartX;
    const deltaDays = deltaX / pixelsPerDay;

    const newStart = new Date(task.start_date);
    newStart.setDate(newStart.getDate() + Math.round(deltaDays));
    const newEnd = new Date(task.end_date);
    newEnd.setDate(newEnd.getDate() + Math.round(deltaDays));

    onUpdateTaskDates(taskId, newStart.toISOString().split('T')[0], newEnd.toISOString().split('T')[0]);
  };

  const handleDragEnd = () => {
    setDraggingTask(null);
    setDragStartX(null);
  };

  const handleLinkStart = (taskId: number, x: number, y: number) => {
    setLinkingTask(taskId);
    setLinkStartX(x);
    setLinkStartY(y);
    setLinkEndX(x);
    setLinkEndY(y);
  };

  const handleLinkMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!linkingTask) return;
    setLinkEndX(e.evt.layerX);
    setLinkEndY(e.evt.layerY);
  };

  const handleLinkEnd = (targetTaskId: number) => {
    if (!linkingTask || linkingTask === targetTaskId) {
      setLinkingTask(null);
      setLinkStartX(null);
      setLinkStartY(null);
      setLinkEndX(null);
      setLinkEndY(null);
      return;
    }

    const task = tasks.find((t) => t.id === linkingTask);
    if (!task) return;

    const newDependencies = [...(task.dependencies || []), targetTaskId];
    onUpdateDependencies(linkingTask, newDependencies);

    setLinkingTask(null);
    setLinkStartX(null);
    setLinkStartY(null);
    setLinkEndX(null);
    setLinkEndY(null);
  };

  return (
    <div className="relative">
      <Stage width={1000} height={chartHeight} onMouseMove={handleLinkMove}>
        <Layer>
          {tasks.map((task, index) => {
            const { x, width } = getTaskPosition(task);
            const y = index * (taskHeight + taskSpacing) + 50;
            const isCritical = criticalPath.includes(task.id);
            const isHovered = hoveredTask === task.id;

            return (
              <React.Fragment key={task.id}>
                <Text
                  x={0}
                  y={y}
                  text={task.task}
                  fontSize={14}
                  fill="white"
                  width={150}
                  align="right"
                  padding={5}
                  fontStyle="bold"
                />
                <Rect
                  x={x + 150}
                  y={y}
                  width={width}
                  height={taskHeight}
                  fill={isCritical ? '#ef4444' : '#f59e0b'}
                  opacity={isHovered ? 0.8 : 1}
                  shadowColor="rgba(0, 0, 0, 0.3)"
                  shadowBlur={isHovered ? 10 : 5}
                  shadowOffsetX={0}
                  shadowOffsetY={2}
                  draggable
                  onDragStart={() => handleDragStart(task.id)}
                  onDragMove={(e) => handleDragMove(e, task.id)}
                  onDragEnd={handleDragEnd}
                  onMouseDown={() => handleLinkStart(task.id, x + 150 + width, y + taskHeight / 2)} // Removed unused 'e' parameter
                  onMouseUp={() => handleLinkEnd(task.id)}
                  onMouseEnter={() => setHoveredTask(task.id)}
                  onMouseLeave={() => setHoveredTask(null)}
                />
                {task.dependencies.map((depId) => {
                  const depTask = tasks.find((t) => t.id === depId);
                  if (!depTask) return null;
                  const depPos = getTaskPosition(depTask);
                  const depIndex = tasks.findIndex((t) => t.id === depId);
                  const depY = depIndex * (taskHeight + taskSpacing) + 50;
                  return (
                    <Line
                      key={`${task.id}-${depId}`}
                      points={[depPos.x + depPos.width + 150, depY + taskHeight / 2, x + 150, y + taskHeight / 2]}
                      stroke="#ffffff"
                      strokeWidth={2}
                      dash={[5, 5]}
                    />
                  );
                })}
              </React.Fragment>
            );
          })}
          {milestones.map((milestone) => {
            const x = getMilestonePosition(milestone) + 150;
            return (
              <React.Fragment key={milestone.id}>
                <Line
                  points={[x, 0, x, chartHeight]}
                  stroke="#10b981"
                  strokeWidth={3}
                  dash={[5, 5]}
                />
                <Text
                  x={x + 5}
                  y={10}
                  text={milestone.name}
                  fontSize={14}
                  fill="#10b981"
                  rotation={90}
                  fontStyle="bold"
                />
              </React.Fragment>
            );
          })}
          {linkingTask && linkStartX && linkStartY && linkEndX && linkEndY && (
            <Line
              points={[linkStartX, linkStartY, linkEndX, linkEndY]}
              stroke="#ffffff"
              strokeWidth={2}
              dash={[5, 5]}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
};

export default GanttChartInner;