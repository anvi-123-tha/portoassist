# Google Maps Platform Configuration Guide for PortoAssist

Follow these steps to configure the official Google Maps JavaScript API, Places API (New), Geocoding API, and Routes API for PortoAssist:

## 1. Create a Google Cloud Project
1. Visit the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., `portoassist-maps-prod`) or select an existing project.
3. Ensure a billing account is linked to your Google Cloud project (Google Maps Platform provides a monthly recurring free credit tier; billing must be active for production workloads).

## 2. Enable Required Google Maps Platform APIs
In **APIs & Services -> Library**, enable:
- **Maps JavaScript API**
- **Places API (New)**
- **Geocoding API**
- **Routes API**

## 3. Generate and Restrict Your API Keys
Go to **APIs & Services -> Credentials -> Create Credentials -> API Key**:
1. **Browser Key (`VITE_GOOGLE_MAPS_API_KEY`)**:
   - Application restrictions: **Websites (HTTP referrers)** -> add `http://localhost:3000/*` and your production domain (`https://your-domain.com/*`).
   - API restrictions: Restrict key to **Maps JavaScript API**, **Places API (New)**, and **Routes API**.
2. **Server Key (`GOOGLE_MAPS_API_KEY`)**:
   - Used by `/api/maps/reverse-geocode` and `/api/maps/geocode` to avoid browser CORS restrictions.
   - Application restrictions: **IP addresses** (your backend server IP).
   - API restrictions: Restrict key to **Geocoding API**.

For detailed restriction instructions, see:
https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys

## 4. Configure Environment Variables
Add your keys to a local `.env` file (never commit `.env` to Git):

```env
GOOGLE_MAPS_API_KEY="your-server-geocoding-key"
VITE_GOOGLE_MAPS_API_KEY="your-browser-restricted-maps-key"
```
