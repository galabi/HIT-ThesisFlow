import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../api/projects.api.js';
import { gradesApi } from '../api/grades.api.js';

export function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: projectsApi.list });
}

export function useProject(id) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => projectsApi.get(id),
    enabled: !!id,
  });
}

export function useGradeSummary(projectId) {
  return useQuery({
    queryKey: ['grade-summary', projectId],
    queryFn: () => projectsApi.getGradeSummary(projectId),
    enabled: !!projectId,
  });
}

export function useSubmitMilestone(projectId, milestoneId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => projectsApi.submitMilestone(projectId, milestoneId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId] }),
  });
}

export function useCoordinatorApprove(projectId, milestoneId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => projectsApi.coordinatorApprove(projectId, milestoneId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', projectId] });
      qc.invalidateQueries({ queryKey: ['grade-summary', projectId] });
    },
  });
}

export function useSubmitGrade(milestoneId, projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => gradesApi.submit(milestoneId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', projectId] });
      qc.invalidateQueries({ queryKey: ['grades', milestoneId] });
    },
  });
}

export function useGrades(milestoneId) {
  return useQuery({
    queryKey: ['grades', milestoneId],
    queryFn: () => gradesApi.getAll(milestoneId),
    enabled: !!milestoneId,
  });
}

export function useMyGrade(milestoneId) {
  return useQuery({
    queryKey: ['my-grade', milestoneId],
    queryFn: () => gradesApi.getMine(milestoneId),
    enabled: !!milestoneId,
  });
}
