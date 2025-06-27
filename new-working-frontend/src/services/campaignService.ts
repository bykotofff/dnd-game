import { apiService } from './api';

// Типы для создания кампании
export interface CreateCampaignData {
    name: string;
    description?: string;
    setting?: string;
    max_players: number;
    world_description?: string;
    main_story?: string;
    house_rules?: string;
    starting_level: number;
    settings?: Record<string, any>;
    ai_personality?: string;
    ai_style: string;
    is_public: boolean;
    requires_approval: boolean;
}

// Типы для обновления кампании
export interface UpdateCampaignData {
    name?: string;
    description?: string;
    setting?: string;
    max_players?: number;
    world_description?: string;
    main_story?: string;
    house_rules?: string;
    settings?: Record<string, any>;
    ai_personality?: string;
    ai_style?: string;
    is_public?: boolean;
    requires_approval?: boolean;
}

// Ответ сервера при получении кампании
export interface CampaignResponse {
    id: string;
    name: string;
    description?: string;
    setting?: string;
    status: string;
    creator_id: string;
    current_players: number;
    max_players: number;
    starting_level: number;
    is_public: boolean;
    created_at: string;
}

// Подробная информация о кампании
export interface CampaignDetailResponse extends CampaignResponse {
    world_description?: string;
    main_story?: string;
    house_rules?: string;
    settings?: Record<string, any>;
    ai_personality?: string;
    ai_style: string;
    requires_approval: boolean;
    players: string[];
}

// Параметры для получения списка кампаний
export interface GetCampaignsParams {
    status_filter?: string;
    public_only?: boolean;
    my_campaigns?: boolean;
    limit?: number;
    offset?: number;
}

class CampaignService {
    // Создание новой кампании
    async createCampaign(data: CreateCampaignData): Promise<CampaignResponse> {
        return apiService.post('/campaigns', data);
    }

    // Получить список кампаний
    async getCampaigns(params: GetCampaignsParams = {}): Promise<CampaignResponse[]> {
        const queryParams = {
            status_filter: params.status_filter,
            public_only: params.public_only || false,
            my_campaigns: params.my_campaigns || false,
            limit: params.limit || 20,
            offset: params.offset || 0,
        };

        return apiService.get('/campaigns', queryParams);
    }

    // Получить мои кампании
    async getMyCampaigns(): Promise<CampaignResponse[]> {
        return this.getCampaigns({ my_campaigns: true });
    }

    // Получить публичные кампании
    async getPublicCampaigns(limit: number = 20, offset: number = 0): Promise<CampaignResponse[]> {
        return this.getCampaigns({
            public_only: true,
            limit,
            offset
        });
    }

    // Получить кампанию по ID
    async getCampaign(campaignId: string): Promise<CampaignDetailResponse> {
        return apiService.get(`/campaigns/${campaignId}`);
    }

    // Обновить кампанию
    async updateCampaign(campaignId: string, data: UpdateCampaignData): Promise<CampaignDetailResponse> {
        return apiService.put(`/campaigns/${campaignId}`, data);
    }

    // Удалить (архивировать) кампанию
    async deleteCampaign(campaignId: string): Promise<{ message: string }> {
        return apiService.delete(`/campaigns/${campaignId}`);
    }

    // Присоединиться к кампании
    async joinCampaign(campaignId: string): Promise<{ message: string }> {
        return apiService.post(`/campaigns/${campaignId}/join`);
    }

    // Получить кампании по статусу
    async getCampaignsByStatus(status: 'active' | 'waiting' | 'completed' | 'archived'): Promise<CampaignResponse[]> {
        return this.getCampaigns({ status_filter: status });
    }

    // Поиск кампаний (если будет реализован endpoint)
    async searchCampaigns(query: string): Promise<CampaignResponse[]> {
        return apiService.get('/campaigns/search', { q: query });
    }
}

// Экспорт синглтона
export const campaignService = new CampaignService();
export default campaignService;