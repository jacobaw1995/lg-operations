'use client';

import { useState, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../../lib/supabase';

type Task = {
  id: number;
  task: string;
  status: string;
  deadline: string;
  assigned_to: string;
};

type Project = {
  id: number;
  name: string;
};

function SortableTask({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-gray-700 p-4 mb-2 rounded cursor-move"
    >
      <p>{task.task}</p>
      <p className="text-sm text-gray-400">Due: {task.deadline}</p>
      <p className="text-sm text-gray-400">Assigned: {task.assigned_to}</p>
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newProject, setNewProject] = useState({ name: '' });
  const [newTask, setNewTask] = useState({ task: '', status: 'To Do', deadline: '', assigned_to: '' });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchProjects = useCallback(async () => {
    const { data } = await supabase.from('projects').select('*');
    setProjects(data || []);
  }, []);

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase.from('tasks').select('*');
    setTasks(data || []);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const projectData = { ...newProject, customer_id: null };
    const { data, error } = await supabase.from('projects').insert([projectData]).select();
    if (error) console.error('Project Insert Error:', error);
    else {
      console.log('Project Added:', data);
      setNewProject({ name: '' });
      fetchProjects();
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projects[0]?.id) {
      console.error('No projects available for task');
      return;
    }
    const taskData = { ...newTask, project_id: projects[0]?.id };
    const { data, error } = await supabase.from('tasks').insert([taskData]).select();
    if (error) console.error('Task Insert Error:', error);
    else {
      console.log('Task Added:', data);
      setNewTask({ task: '', status: 'To Do', deadline: '', assigned_to: '' });
      fetchTasks();
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeTask = tasks.find((task) => task.id === active.id);
    const overColumn = over.id.toString().split('-')[0];

    if (activeTask && overColumn) {
      const updatedTask = { ...activeTask, status: overColumn };
      const { error } = await supabase
        .from('tasks')
        .update({ status: updatedTask.status })
        .eq('id', activeTask.id);
      if (error) console.error(error);
      else fetchTasks();
    }
  };

  const columns: { [key: string]: Task[] } = {
    'To Do': tasks.filter((task) => task.status === 'To Do'),
    'In Progress': tasks.filter((task) => task.status === 'In Progress'),
    'Done': tasks.filter((task) => task.status === 'Done'),
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Projects</h1>
      <form onSubmit={handleAddProject} className="mb-8 bg-gray-800 p-6 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Project Name"
            value={newProject.name}
            onChange={(e) => setNewProject({ name: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white"
            required
          />
          <button type="submit" className="btn-yellow">
            Add Project
          </button>
        </div>
      </form>
      <form onSubmit={handleAddTask} className="mb-8 bg-gray-800 p-6 rounded-lg">
        <div className="grid grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Task"
            value={newTask.task}
            onChange={(e) => setNewTask({ ...newTask, task: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white"
            required
          />
          <input
            type="date"
            value={newTask.deadline}
            onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white"
            required
          />
          <input
            type="text"
            placeholder="Assigned To"
            value={newTask.assigned_to}
            onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
            className="p-2 rounded bg-gray-700 text-white"
            required
          />
          <button type="submit" className="btn-yellow">
            Add Task
          </button>
        </div>
      </form>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-3 gap-4">
          {Object.keys(columns).map((column) => (
            <div key={column} className="bg-gray-800 p-4 rounded-lg">
              <h2 className="text-xl font-bold mb-4">{column}</h2>
              <SortableContext items={columns[column].map((task) => task.id)} id={`${column}-column`}>
                <div className="min-h-[200px]">
                  {columns[column].map((task) => (
                    <SortableTask key={task.id} task={task} />
                  ))}
                </div>
              </SortableContext>
            </div>
          ))}
        </div>
      </DndContext>
    </div>
  );
}