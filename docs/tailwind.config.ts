import type { Config } from 'tailwindcss';

import appconfig from '../webapp/tailwind.config';

const config = {
    ...appconfig, darkMode: ['class', '[data-theme="dark"]'], corePlugins: {
        preflight: false,
    },
    blocklist: ["container"],
} as Config;

export default config;
