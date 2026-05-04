import { httpClient } from "../core/utils/httpClient";
import { generateCodeVerifier, generateState } from "../utils/pkce";
import * as VKID from '@vkid/sdk';
import { authService } from "./authService";

import { BASE_URL } from '../core/utils/apiBase';

export class VkAuthService {
    init(container: HTMLElement, onSuccess: () => void) {
        const codeVerifier = generateCodeVerifier();
        const state = generateState();

        VKID.Config.init({
            app: 54547820,
            redirectUrl: 'https://pulseapp.space/chats',
            responseMode: VKID.ConfigResponseMode.Callback,
            codeVerifier: codeVerifier,
            state: state,
            scope: 'vkid.personal_info email'
        });

        const oneTap = new VKID.OneTap();

        oneTap.render({
            container: container,
            showAlternativeLogin: false,
            styles: {
                borderRadius: 10,
                height: 42
            }
        })
        .on(VKID.WidgetEvents.ERROR, (error) => {
            console.error('VK ID error:', error);
        })
        .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, async (payload) => {
            const code = payload.code;
            const deviceId = payload.device_id;

            try {
                const response = await httpClient.request(`${BASE_URL}/api/v1/auth/vk`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code,
                        state,
                        code_verifier: codeVerifier,
                        device_id: deviceId,
                    }),
                });

                if (response.ok) {
                    authService.isAuthStatus = true;
                    onSuccess();
                }

            } catch(error) {
                console.error('VK auth backend error:', error);
            }
        })
    };
}

export const vkAuthService = new VkAuthService();