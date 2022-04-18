import lineClamp from '@tailwindcss/line-clamp';
import typography from '@tailwindcss/typography';
import { initialize } from 'monaco-tailwindcss/tailwindcss.worker.js';

initialize({
  prepareTailwindConfig(tailwindConfig) {
    if (tailwindConfig.plugins) {
      // eslint-disable-next-line no-console
      console.error('Only preconfigured built in plugins are supported', tailwindConfig.plugins);
    }
    const plugins = [typography, lineClamp];
    return { ...tailwindConfig, plugins };
  },
});
