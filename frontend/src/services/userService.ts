import { apiService } from './api';
import type { User, UserPreferences } from '@/types';

export interface UpdateProfileData {
    display_name?: string;
    email?: string;
    bio?: string;
}

export interface UpdatePreferencesData {
    theme?: 'light' | 'dark' | 'auto';
    sound_enabled?: boolean;
    notifications_enabled?: boolean;
    auto_roll_damage?: boolean;
    show_advanced_options?: boolean;
}

class UserService {
    /**
     * Get current user profile
     */
    async getProfile(): Promise<User> {
        const response = await apiService.get('/users/me');
        return response.data;
    }

    /**
     * Update user profile
     */
    async updateProfile(data: UpdateProfileData): Promise<User> {
        const response = await apiService.put('/users/me', data);
        return response.data;
    }

    /**
     * Change user password
     */
    async changePassword(oldPassword: string, newPassword: string): Promise<void> {
        await apiService.post('/auth/change-password', {
            old_password: oldPassword,
            new_password: newPassword,
        });
    }

    /**
     * Update user preferences
     */
    async updatePreferences(preferences: UpdatePreferencesData): Promise<UserPreferences> {
        const response = await apiService.put('/users/me/preferences', preferences);
        return response.data;
    }

    /**
     * Upload user avatar
     */
    async uploadAvatar(file: File): Promise<string> {
        const formData = new FormData();
        formData.append('avatar', file);

        const response = await apiService.post('/users/me/avatar', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data.avatar_url;
    }

    /**
     * Delete user avatar
     */
    async deleteAvatar(): Promise<void> {
        await apiService.delete('/users/me/avatar');
    }

    /**
     * Get user by ID (public profile)
     */
    async getUserById(userId: string): Promise<User> {
        const response = await apiService.get(`/users/${userId}`);
        return response.data;
    }

    /**
     * Search users
     */
    async searchUsers(query: string, limit: number = 20): Promise<User[]> {
        const response = await apiService.get('/users/search', {
            params: { query, limit },
        });
        return response.data;
    }

    /**
     * Get user statistics
     */
    async getUserStats(userId?: string): Promise<{
        games_played: number;
        total_playtime: number;
        characters_created: number;
        campaigns_created: number;
        achievements: any[];
    }> {
        const endpoint = userId ? `/users/${userId}/stats` : '/users/me/stats';
        const response = await apiService.get(endpoint);
        return response.data;
    }

    /**
     * Delete user account
     */
    async deleteAccount(): Promise<void> {
        await apiService.delete('/users/me');
    }

    /**
     * Request password reset
     */
    async requestPasswordReset(email: string): Promise<void> {
        await apiService.post('/auth/request-password-reset', { email });
    }

    /**
     * Reset password with token
     */
    async resetPassword(token: string, newPassword: string): Promise<void> {
        await apiService.post('/auth/reset-password', {
            token,
            new_password: newPassword,
        });
    }

    /**
     * Verify email with token
     */
    async verifyEmail(token: string): Promise<void> {
        await apiService.post('/auth/verify-email', { token });
    }

    /**
     * Resend email verification
     */
    async resendEmailVerification(): Promise<void> {
        await apiService.post('/auth/resend-verification');
    }
}

export const userService = new UserService();