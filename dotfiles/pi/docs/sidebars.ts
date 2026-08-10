import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    'install',
    {
      type: 'category',
      label: 'Using the editor',
      collapsed: false,
      items: [
        'models',
        'claude-as-model',
        'drive',
        'modes',
        'sessions',
        'send-hold',
        'drafts',
        'forwarding',
        'todo',
        'questions',
        'notes',
        'guardrails',
        'notifications',
        'keybindings',
      ],
    },
    {
      type: 'category',
      label: 'Seeing what is going on',
      collapsed: false,
      items: ['statusline', 'code-rendering', 'dashboard', 'agent-usage', 'stats', 'docs-command', 'shell-log', 'housekeeping'],
    },
    {
      type: 'category',
      label: 'Capabilities',
      collapsed: false,
      items: ['skills', 'mcp', 'claude-subagents', 'improve'],
    },
    'testing',
    'roadmap',
    'changelog',
  ],
};

export default sidebars;
