import { api } from './instance';

export interface InviteValidateResponse {
  is_valid: boolean;
  code: string;
  message: string;
  inviter_nickname?: string;
}

export interface InviteCodeOut {
  id: string;
  code: string;
  uses_count: number;
  max_uses: number;
  is_active: boolean;
  created_at: string;
  used_at?: string;
  used_by_id?: string;
}

export interface InviteGenerateResponse {
  code: string;
  invite: InviteCodeOut;
}

export const validateInviteCodeApi = async (code: string): Promise<InviteValidateResponse> => {
  const res = await api.get<InviteValidateResponse>(`/invites/validate/${encodeURIComponent(code)}`);
  return res.data;
};

export const getMyInviteCodesApi = async (): Promise<InviteCodeOut[]> => {
  const res = await api.get<InviteCodeOut[]>('/invites/my-codes');
  return res.data;
};

export const generateInviteCodeApi = async (): Promise<InviteGenerateResponse> => {
  const res = await api.post<InviteGenerateResponse>('/invites/generate');
  return res.data;
};
