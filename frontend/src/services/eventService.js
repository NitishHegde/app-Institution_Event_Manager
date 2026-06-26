import API from './api';

export const eventService = {
    // Pulls all upcoming active events explicitly set to VISIBLE
    getPublicLandingEvents: async () => {
        try {
            const response = await API.get('/public/events/landing');
            return response.data;
        } catch (error) {
            console.error('Public Landing Fetch Error:', error);
            throw error;
        }
    }
};