import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentsApi } from '../api/assignments.api.js';
import { defenseApi } from '../api/defense.api.js';
import api from '../api/client.js';

export function useAssignments(milestoneId) {
  return useQuery({
    queryKey: ['assignments', milestoneId],
    queryFn: () => assignmentsApi.getForMilestone(milestoneId),
    enabled: !!milestoneId,
  });
}

export function useCreateAssignment(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: assignmentsApi.create,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['assignments', variables.milestoneId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useDeleteAssignment(projectId, milestoneId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: assignmentsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments', milestoneId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useDefense(milestoneId) {
  return useQuery({
    queryKey: ['defense', milestoneId],
    queryFn: () => defenseApi.getForMilestone(milestoneId),
    enabled: !!milestoneId,
  });
}

export function useCreateDefense(projectId, milestoneId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: defenseApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['defense', milestoneId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useUpdateDefense(projectId, milestoneId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => defenseApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['defense', milestoneId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useDeleteDefense(projectId, milestoneId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: defenseApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['defense', milestoneId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useExaminers() {
  return useQuery({
    queryKey: ['users', 'examiners'],
    queryFn: () => api.get('/users?role=EXAMINER&limit=100').then((r) => r.data.data),
  });
}
