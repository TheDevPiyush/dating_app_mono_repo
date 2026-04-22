import axios from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_API_URL;

export interface ExploreEmployee {
    _id: string;
    user_id: string;
    displayName: string;
    photoURL: string;
    isOnline: boolean;
    profile?: {
        firstName: string;
        lastName: string;
        bio?: string;
        photos: { url: string; isPrimary?: boolean }[];
        interests: string[];
        occupation?: string;
        height?: number;
        education?: string;
    };
    girlEmployDetails?: {
        isGirlEmployee: boolean;
        employeLocation?: string | null;
        isAvailableForCall?: boolean;
        isVideoCallAllowed?: boolean;
        isAudioCallAllowed?: boolean;
        workingHourStart?: Date | null;
        workingHourEnd?: Date | null;
        language?: string
    };
}

const authHeaders = (token: string) => ({
    headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    },
});

export const exploreAPI = {
    getEmployees: async (token: string): Promise<ExploreEmployee[]> => {
        const res = await axios.get(`${BASE_URL}/explore/employees`, authHeaders(token));
        return res.data?.data ?? [];
    },

    getEmployee: async (token: string, employeeId: string): Promise<ExploreEmployee> => {
        const res = await axios.get(
            `${BASE_URL}/explore/employees/${employeeId}`,
            authHeaders(token)
        );
        return res.data?.data;
    },
};
