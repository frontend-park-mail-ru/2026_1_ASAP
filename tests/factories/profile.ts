import type { BackendProfile } from '../../src/types/profile';

export function makeBackendProfile(overrides: Partial<BackendProfile> = {}): BackendProfile {
    return {
        user_id: 1,
        login: 'alice',
        email: 'alice@example.com',
        first_name: 'Alice',
        last_name: 'Smith',
        avatar: '',
        bio: '',
        ...overrides,
    } as BackendProfile;
}
