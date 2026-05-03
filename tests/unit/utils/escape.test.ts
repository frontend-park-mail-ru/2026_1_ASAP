import { describe, expect, it } from 'vitest';
import { escapeHtml } from '../../../src/core/utils/escape';

describe('escapeHtml', () => {
    it('экранирует <script>', () => {
        expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('экранирует & первым (без двойного эскейпа существующих entity)', () => {
        expect(escapeHtml('&amp;')).toBe('&amp;amp;');
    });

    it('экранирует все 5 символов', () => {
        expect(escapeHtml(`'"&<>`)).toBe('&#039;&quot;&amp;&lt;&gt;');
    });

    it('пустая строка → пустая строка', () => {
        expect(escapeHtml('')).toBe('');
    });

    it('обычный текст не меняется', () => {
        expect(escapeHtml('hello world')).toBe('hello world');
    });
});
