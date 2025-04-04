import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface GeocodeResponse {
    results: Array<{
        formatted_address: string;
        geometry: {
            location: {
                lat: number;
                lng: number;
            };
        };
        place_id: string;
        address_components: Array<{
            long_name: string;
            short_name: string;
            types: string[];
        }>;
    }>;
}

interface PlaceDetailsResponse {
    result: {
        name: string;
        formatted_address: string;
        geometry: {
            location: {
                lat: number;
                lng: number;
            };
        };
        types: string[];
        website?: string;
        formatted_phone_number?: string;
    };
}

interface PlaceSearchResponse {
    results: Array<{
        name: string;
        formatted_address: string;
        place_id: string;
        geometry: {
            location: {
                lat: number;
                lng: number;
            };
        };
    }>;
}

@Injectable()
export class GoogleMapsService {
    private readonly apiKey: string;
    private readonly baseUrl = 'https://maps.googleapis.com/maps/api';

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
        if (!apiKey) {
            throw new Error('GOOGLE_MAPS_API_KEY is not set in environment variables');
        }
        this.apiKey = apiKey;
    }

    async geocodeAddress(address: string) {
        console.log('address', address)
        try {
            const response = await axios.get<GeocodeResponse>(
                `${this.baseUrl}/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`
            );

            if (response.data.results && response.data.results.length > 0) {
                const result = response.data.results[0];
                return {
                    formattedAddress: result.formatted_address,
                    location: result.geometry.location,
                    placeId: result.place_id,
                    addressComponents: result.address_components,
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
                `${this.baseUrl}/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`
            );

            if (response.data.results && response.data.results.length > 0) {
                const result = response.data.results[0];
                return {
                    formattedAddress: result.formatted_address,
                    placeId: result.place_id,
                    addressComponents: result.address_components,
                };
            }
            throw new Error('No results found');
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            throw new Error('Failed to reverse geocode coordinates');
        }
    }

    async getPlaceDetails(placeId: string) {
        try {
            const response = await axios.get<PlaceDetailsResponse>(
                `${this.baseUrl}/place/details/json?place_id=${placeId}&key=${this.apiKey}`
            );

            if (response.data.result) {
                return {
                    name: response.data.result.name,
                    formattedAddress: response.data.result.formatted_address,
                    geometry: response.data.result.geometry,
                    types: response.data.result.types,
                    website: response.data.result.website,
                    phoneNumber: response.data.result.formatted_phone_number,
                };
            }
            throw new Error('No results found');
        } catch (error) {
            console.error('Place details error:', error);
            throw new Error('Failed to get place details');
        }
    }

    async searchPlaces(query: string) {
        try {
            const response = await axios.get<PlaceSearchResponse>(
                `${this.baseUrl}/place/textsearch/json?query=${encodeURIComponent(query)}&key=${this.apiKey}`
            );

            if (response.data.results) {
                return response.data.results.map(place => ({
                    name: place.name,
                    formattedAddress: place.formatted_address,
                    placeId: place.place_id,
                    geometry: place.geometry,
                }));
            }
            throw new Error('No results found');
        } catch (error) {
            console.error('Place search error:', error);
            throw new Error('Failed to search places');
        }
    }
} 