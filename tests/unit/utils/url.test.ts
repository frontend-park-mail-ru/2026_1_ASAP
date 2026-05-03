import { describe, expect, it } from 'vitest';
import { getFullUrl } from '../../../src/core/utils/url';
import { BASE_URL } from '../../../src/core/utils/apiBase';

describe('getFullUrl', () => {
    it('undefined → дефолтный путь к аватарке', () => {
        expect(getFullUrl(undefined)).toBe('/assets/images/avatars/defaultAvatar.svg');
    });

    it('пустая строка → дефолтный путь', () => {
        expect(getFullUrl('')).toBe('/assets/images/avatars/defaultAvatar.svg');
    });

    it('кастомный defaultPath используется', () => {
        expect(getFullUrl(undefined, '/fallback.png')).toBe('/fallback.png');
    });

    it('абсолютный https URL возвращается как есть', () => {
        const url = 'https://cdn.example.com/a.png';
        expect(getFullUrl(url)).toBe(url);
    });

    it('абсолютный http URL возвращается как есть', () => {
        const url = 'http://example.com/img.png';
        expect(getFullUrl(url)).toBe(url);
    });

    it('путь с / → BASE_URL + путь', () => {
        expect(getFullUrl('/media/avatars/1.png')).toBe(`${BASE_URL}/media/avatars/1.png`);
    });

    it('путь без / → BASE_URL + путь', () => {
        expect(getFullUrl('media/avatars/1.png')).toBe(`${BASE_URL}/media/avatars/1.png`);
    });

    it('путь, содержащий defaultAvatar.svg → дефолт', () => {
        expect(getFullUrl('/something/defaultAvatar.svg')).toBe('/assets/images/avatars/defaultAvatar.svg');
    });
});
