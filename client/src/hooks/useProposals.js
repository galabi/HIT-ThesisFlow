import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { proposalsApi } from '../api/proposals.api.js';

export function useProposals(params) {
  return useQuery({
    queryKey: ['proposals', params],
    queryFn: () => proposalsApi.list(params),
  });
}

export function useProposal(id) {
  return useQuery({
    queryKey: ['proposals', id],
    queryFn: () => proposalsApi.get(id),
    enabled: !!id,
  });
}

export function useMyApplications() {
  return useQuery({
    queryKey: ['my-applications'],
    queryFn: proposalsApi.getMyApplications,
  });
}

export function useMyApplication(proposalId) {
  return useQuery({
    queryKey: ['my-application', proposalId],
    queryFn: () => proposalsApi.getMyApplication(proposalId),
    enabled: !!proposalId,
  });
}

export function useApplicationsInbox(params) {
  return useQuery({
    queryKey: ['applications-inbox', params],
    queryFn: () => proposalsApi.getInbox(params),
  });
}

export function useApplyMutation(proposalId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => proposalsApi.apply(proposalId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-application', proposalId] });
      qc.invalidateQueries({ queryKey: ['my-applications'] });
    },
  });
}

export function useProposalMutations() {
  const qc = useQueryClient();

  const invalidate = () => qc.invalidateQueries({ queryKey: ['proposals'] });

  const create = useMutation({ mutationFn: proposalsApi.create, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, data }) => proposalsApi.update(id, data),
    onSuccess: invalidate,
  });
  const publish = useMutation({ mutationFn: proposalsApi.publish, onSuccess: invalidate });
  const close = useMutation({ mutationFn: proposalsApi.close, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: proposalsApi.delete, onSuccess: invalidate });

  return { create, update, publish, close, remove };
}

export function useApplicationActions(proposalId) {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['applications-inbox'] });
    qc.invalidateQueries({ queryKey: ['proposals', proposalId] });
  };

  const approve = useMutation({
    mutationFn: (appId) => proposalsApi.approveApplication(proposalId, appId),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: (appId) => proposalsApi.rejectApplication(proposalId, appId),
    onSuccess: invalidate,
  });
  const meeting = useMutation({
    mutationFn: ({ appId, ...data }) => proposalsApi.requestMeeting(proposalId, appId, data),
    onSuccess: invalidate,
  });

  return { approve, reject, meeting };
}
