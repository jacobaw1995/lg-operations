'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Project = {
  id: number;
  name: string;
};

type ProjectSelectorProps = {
  projects: Project[];
  selectedProject: number | null;
  setSelectedProject: (value: number | null) => void;
};

export default function ProjectSelector({ projects, selectedProject, setSelectedProject }: ProjectSelectorProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const selected = searchParams.get('selected');
    if (projects.length > 0) {
      if (selected && projects.some((p) => p.id === parseInt(selected))) {
        setSelectedProject(parseInt(selected));
      } else if (!selectedProject) {
        setSelectedProject(projects[0].id);
      }
    }
  }, [searchParams, projects, selectedProject, setSelectedProject]);

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value);
    setSelectedProject(value);
    router.push(`/projects?selected=${value}`);
  };

  return (
    <div className="mb-8">
      <select
        value={selectedProject || ''}
        onChange={handleProjectChange}
        className="p-2 rounded bg-gray-700 text-white w-full"
      >
        <option value="">Select Project</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </div>
  );
}