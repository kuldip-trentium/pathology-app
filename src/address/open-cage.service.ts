import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface GeocodeResponse {
    results: Array<{
        formatted: string;
        geometry: {
            lat: number;
            lng: number;
        };
        components: {
            [key: string]: string;
        };
    }>;
}

@Injectable()
export class OpenCageService {
    private readonly apiKey: string;
    private readonly baseUrl = 'https://api.opencagedata.com/geocode/v1';

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('OPENCAGE_API_KEY');
        if (!apiKey) {
            throw new Error('OPENCAGE_API_KEY is not set in environment variables');
        }
        this.apiKey = apiKey;
    }

    async geocodeAddress(address: string) {
        try {
            const response = await axios.get<GeocodeResponse>(
                `${this.baseUrl}/json?q=${encodeURIComponent(address)}&key=${this.apiKey}`
            );

            if (response.data.results && response.data.results.length > 0) {
                const result = response.data.results[0];
                return {
                    formattedAddress: result.formatted,
                    location: {
                        lat: result.geometry.lat,
                        lng: result.geometry.lng
                    },
                    addressComponents: result.components
                };
            }
            throw new Error('No results found');
        } catch (error) {
            console.error('Geocoding error:', error);
            throw new Error('Failed to geocode address');
        }
    }

    async reverseGeocode(lat: number, lng: number) {
        try {
            const response = await axios.get<GeocodeResponse>(
                `${this.baseUrl}/json?q=${lat}+${lng}&key=${this.apiKey}`
            );

            if (response.data.results && response.data.results.length > 0) {
                const result = response.data.results[0];
                return {
                    formattedAddress: result.formatted,
                    addressComponents: result.components
                };
            }
            throw new Error('No results found');
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            throw new Error('Failed to reverse geocode coordinates');
        }
    }
} 