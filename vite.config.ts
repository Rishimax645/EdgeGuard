import vinext from 'vinext';
import {defineConfig} from 'vite';
import {cloudflare} from '@cloudflare/vite-plugin';
export default defineConfig({worker:{format:'es'},plugins:[vinext(),cloudflare({viteEnvironment:{name:'rsc',childEnvironments:['ssr']}})]});
