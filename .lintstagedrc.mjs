const lintStagedConfig = {
  "src/**/*.{ts,tsx}": [() => "tsc --noEmit"],
  "src/**/*.{js,ts,jsx,tsx,json,jsonc}": ["biome check --write"],
};

export default lintStagedConfig;
