import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  mainSidebar: [
    {
      type: 'category',
      label: 'Foundation',
      collapsed: false,
      items: ['overview', 'crash-triggers'],
    },
    {
      type: 'category',
      label: 'Libraries',
      collapsed: false,
      items: [
        'libraries/utility',
        'libraries/memory',
        'libraries/entity',
        'libraries/game',
        'libraries/cheat',
        'libraries/bit',
        'libraries/file',
        'libraries/audio',
        'libraries/mouse',
        'libraries/keyboard',
        'libraries/http',
        'libraries/websocket',
        'libraries/draw',
        'libraries/ui',
      ],
    },
    {
      type: 'category',
      label: 'Userdata',
      collapsed: false,
      items: [
        'userdata/Instance',
        'userdata/Part',
        'userdata/Player',
        'userdata/Vector3',
        'userdata/Color3',
      ],
    },
    {
      type: 'category',
      label: 'Tools',
      collapsed: false,
      items: [
        'tools/mcp-bridge',
      ],
    },
    'llms',
    'methodology',
  ],
};

export default sidebars;
