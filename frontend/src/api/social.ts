import { api } from "./instance";
import type { PublicUser } from "../types/Profile/profile";

export interface FollowCounts {
    followers: number;
    following: number;
    // Подписан ли текущий зритель (null для анонима и своего профиля).
    is_following: boolean | null;
}

export interface FollowActionResult {
    is_following: boolean;
    followers: number;
}

export async function getFollowCounts(username: string): Promise<FollowCounts> {
    const res = await api.get<FollowCounts>(`/social/follow-counts/${username}`);
    return res.data;
}

export async function followUser(username: string): Promise<FollowActionResult> {
    const res = await api.post<FollowActionResult>(`/social/follow/${username}`);
    return res.data;
}

export async function unfollowUser(username: string): Promise<FollowActionResult> {
    const res = await api.delete<FollowActionResult>(`/social/follow/${username}`);
    return res.data;
}

export async function getFollowers(username: string): Promise<PublicUser[]> {
    const res = await api.get<PublicUser[]>(`/social/followers/${username}`);
    return res.data;
}

export async function getFollowing(username: string): Promise<PublicUser[]> {
    const res = await api.get<PublicUser[]>(`/social/following/${username}`);
    return res.data;
}
