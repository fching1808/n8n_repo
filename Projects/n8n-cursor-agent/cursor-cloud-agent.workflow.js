import {
  workflow,
  node,
  trigger,
  sticky,
  newCredential,
  ifElse,
  expr,
} from '@n8n/workflow-sdk';

const cursorApi = newCredential('Cursor API Key');

const setupNote = sticky(
  '## Cursor Cloud Agent in n8n\n\n1. Create credential **Cursor API Key** (Basic Auth): User = your API key from [Cursor Dashboard → Integrations](https://cursor.com/dashboard/integrations), Password = leave empty.\n2. Activate this workflow.\n3. POST `{ "prompt": "your task" }` (or `message` / `chatInput`) to the webhook.\n4. Optional: include `"repoUrl": "https://github.com/org/repo"` to work on a repo.\n\nPolls every 10s for up to ~10 minutes, then returns the agent result.',
  [],
  { color: 4, width: 420, height: 280 },
);

const agentWebhook = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'Agent Webhook',
    position: [0, 300],
    parameters: {
      httpMethod: 'POST',
      path: 'cursor-agent',
      responseMode: 'responseNode',
      options: {},
    },
  },
  output: [
    {
      body: {
        prompt: 'Summarize what a Cursor cloud agent can do in one short paragraph.',
      },
    },
  ],
});

const normalizePrompt = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Normalize Prompt',
    position: [240, 300],
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          {
            id: 'prompt-text',
            name: 'prompt',
            value: expr(
              "{{ $json.body?.chatInput ?? $json.body?.message ?? $json.body?.text ?? $json.body?.prompt ?? $json.chatInput ?? $json.message ?? $json.text ?? $json.prompt ?? '' }}",
            ),
            type: 'string',
          },
          {
            id: 'repo-url',
            name: 'repoUrl',
            value: expr("{{ $json.body?.repoUrl ?? $json.repoUrl ?? '' }}"),
            type: 'string',
          },
        ],
      },
      options: {},
    },
  },
  output: [
    {
      prompt: 'Summarize what a Cursor cloud agent can do in one short paragraph.',
      repoUrl: '',
    },
  ],
});

const createCursorAgent = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Create Cursor Agent',
    position: [480, 300],
    parameters: {
      method: 'POST',
      url: 'https://api.cursor.com/v1/agents',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpBasicAuth',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr(
        "{{ { prompt: { text: $json.prompt }, model: { id: 'composer-2.5' }, name: 'n8n Cursor Agent', ...( $json.repoUrl ? { repos: [{ url: $json.repoUrl, startingRef: 'main' }] } : {} ) } }}",
      ),
      options: {
        timeout: 60000,
      },
    },
    credentials: {
      httpBasicAuth: cursorApi,
    },
  },
  output: [
    {
      agent: {
        id: 'bc-00000000-0000-0000-0000-000000000001',
        name: 'n8n Cursor Agent',
        status: 'ACTIVE',
        url: 'https://cursor.com/agents/bc-00000000-0000-0000-0000-000000000001',
        latestRunId: 'run-00000000-0000-0000-0000-000000000001',
      },
      run: {
        id: 'run-00000000-0000-0000-0000-000000000001',
        agentId: 'bc-00000000-0000-0000-0000-000000000001',
        status: 'CREATING',
      },
    },
  ],
});

const initRunContext = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Init Run Context',
    position: [720, 300],
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          {
            id: 'agent-id',
            name: 'agentId',
            value: expr('{{ $json.agent.id }}'),
            type: 'string',
          },
          {
            id: 'run-id',
            name: 'runId',
            value: expr('{{ $json.run.id }}'),
            type: 'string',
          },
          {
            id: 'agent-url',
            name: 'agentUrl',
            value: expr('{{ $json.agent.url }}'),
            type: 'string',
          },
          {
            id: 'poll-count',
            name: 'pollCount',
            value: 0,
            type: 'number',
          },
          {
            id: 'prompt-copy',
            name: 'prompt',
            value: expr("{{ $('Normalize Prompt').item.json.prompt }}"),
            type: 'string',
          },
        ],
      },
      options: {},
    },
  },
  output: [
    {
      agentId: 'bc-00000000-0000-0000-0000-000000000001',
      runId: 'run-00000000-0000-0000-0000-000000000001',
      agentUrl: 'https://cursor.com/agents/bc-00000000-0000-0000-0000-000000000001',
      pollCount: 0,
      prompt: 'Summarize what a Cursor cloud agent can do in one short paragraph.',
    },
  ],
});

const waitBeforePoll = node({
  type: 'n8n-nodes-base.wait',
  version: 1.1,
  config: {
    name: 'Wait Before Poll',
    position: [960, 300],
    parameters: {
      resume: 'timeInterval',
      amount: 10,
      unit: 'seconds',
    },
  },
  output: [
    {
      agentId: 'bc-00000000-0000-0000-0000-000000000001',
      runId: 'run-00000000-0000-0000-0000-000000000001',
      agentUrl: 'https://cursor.com/agents/bc-00000000-0000-0000-0000-000000000001',
      pollCount: 0,
      prompt: 'Summarize what a Cursor cloud agent can do in one short paragraph.',
    },
  ],
});

const pollRunStatus = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Poll Run Status',
    position: [1200, 300],
    parameters: {
      method: 'GET',
      url: expr(
        "{{ 'https://api.cursor.com/v1/agents/' + $json.agentId + '/runs/' + $json.runId }}",
      ),
      authentication: 'genericCredentialType',
      genericAuthType: 'httpBasicAuth',
      options: {
        timeout: 30000,
      },
    },
    credentials: {
      httpBasicAuth: cursorApi,
    },
  },
  output: [
    {
      id: 'run-00000000-0000-0000-0000-000000000001',
      agentId: 'bc-00000000-0000-0000-0000-000000000001',
      status: 'FINISHED',
      result: 'Cloud agents can edit repos, open PRs, and return a final text result.',
      durationMs: 12357,
    },
  ],
});

const updatePollContext = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Update Poll Context',
    position: [1440, 300],
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          {
            id: 'status',
            name: 'status',
            value: expr('{{ $json.status }}'),
            type: 'string',
          },
          {
            id: 'result',
            name: 'result',
            value: expr("{{ $json.result ?? '' }}"),
            type: 'string',
          },
          {
            id: 'duration',
            name: 'durationMs',
            value: expr('{{ $json.durationMs ?? 0 }}'),
            type: 'number',
          },
          {
            id: 'agent-id-2',
            name: 'agentId',
            value: expr("{{ $('Init Run Context').item.json.agentId }}"),
            type: 'string',
          },
          {
            id: 'run-id-2',
            name: 'runId',
            value: expr("{{ $('Init Run Context').item.json.runId }}"),
            type: 'string',
          },
          {
            id: 'agent-url-2',
            name: 'agentUrl',
            value: expr("{{ $('Init Run Context').item.json.agentUrl }}"),
            type: 'string',
          },
          {
            id: 'poll-count-2',
            name: 'pollCount',
            value: expr("{{ ($('Wait Before Poll').item.json.pollCount ?? 0) + 1 }}"),
            type: 'number',
          },
          {
            id: 'prompt-2',
            name: 'prompt',
            value: expr("{{ $('Init Run Context').item.json.prompt }}"),
            type: 'string',
          },
        ],
      },
      options: {},
    },
  },
  output: [
    {
      status: 'FINISHED',
      result: 'Cloud agents can edit repos, open PRs, and return a final text result.',
      durationMs: 12357,
      agentId: 'bc-00000000-0000-0000-0000-000000000001',
      runId: 'run-00000000-0000-0000-0000-000000000001',
      agentUrl: 'https://cursor.com/agents/bc-00000000-0000-0000-0000-000000000001',
      pollCount: 1,
      prompt: 'Summarize what a Cursor cloud agent can do in one short paragraph.',
    },
  ],
});

const runFinished = ifElse({
  version: 2.3,
  config: {
    name: 'Run Finished?',
    position: [1680, 300],
    parameters: {
      conditions: {
        combinator: 'or',
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict',
          version: 2,
        },
        conditions: [
          {
            id: 'fin',
            leftValue: expr('{{ $json.status }}'),
            rightValue: 'FINISHED',
            operator: { type: 'string', operation: 'equals' },
          },
          {
            id: 'err',
            leftValue: expr('{{ $json.status }}'),
            rightValue: 'ERROR',
            operator: { type: 'string', operation: 'equals' },
          },
          {
            id: 'can',
            leftValue: expr('{{ $json.status }}'),
            rightValue: 'CANCELLED',
            operator: { type: 'string', operation: 'equals' },
          },
          {
            id: 'exp',
            leftValue: expr('{{ $json.status }}'),
            rightValue: 'EXPIRED',
            operator: { type: 'string', operation: 'equals' },
          },
        ],
      },
    },
  },
});

const underPollLimit = ifElse({
  version: 2.3,
  config: {
    name: 'Under Poll Limit?',
    position: [1920, 480],
    parameters: {
      conditions: {
        combinator: 'and',
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict',
          version: 2,
        },
        conditions: [
          {
            id: 'limit',
            leftValue: expr('{{ $json.pollCount }}'),
            rightValue: 60,
            operator: { type: 'number', operation: 'lt' },
          },
        ],
      },
    },
  },
});

const formatSuccess = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Format Agent Result',
    position: [1920, 160],
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          {
            id: 'ok',
            name: 'ok',
            value: true,
            type: 'boolean',
          },
          {
            id: 'status-out',
            name: 'status',
            value: expr('{{ $json.status }}'),
            type: 'string',
          },
          {
            id: 'result-out',
            name: 'result',
            value: expr('{{ $json.result }}'),
            type: 'string',
          },
          {
            id: 'agent-id-out',
            name: 'agentId',
            value: expr('{{ $json.agentId }}'),
            type: 'string',
          },
          {
            id: 'run-id-out',
            name: 'runId',
            value: expr('{{ $json.runId }}'),
            type: 'string',
          },
          {
            id: 'agent-url-out',
            name: 'agentUrl',
            value: expr('{{ $json.agentUrl }}'),
            type: 'string',
          },
          {
            id: 'duration-out',
            name: 'durationMs',
            value: expr('{{ $json.durationMs }}'),
            type: 'number',
          },
        ],
      },
      options: {},
    },
  },
  output: [
    {
      ok: true,
      status: 'FINISHED',
      result: 'Cloud agents can edit repos, open PRs, and return a final text result.',
      agentId: 'bc-00000000-0000-0000-0000-000000000001',
      runId: 'run-00000000-0000-0000-0000-000000000001',
      agentUrl: 'https://cursor.com/agents/bc-00000000-0000-0000-0000-000000000001',
      durationMs: 12357,
    },
  ],
});

const formatTimeout = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Format Timeout',
    position: [2160, 560],
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          {
            id: 'ok-t',
            name: 'ok',
            value: false,
            type: 'boolean',
          },
          {
            id: 'status-t',
            name: 'status',
            value: 'TIMEOUT',
            type: 'string',
          },
          {
            id: 'result-t',
            name: 'result',
            value: expr(
              "{{ 'Timed out waiting for Cursor agent. Check ' + $json.agentUrl + ' (agentId=' + $json.agentId + ', runId=' + $json.runId + ', lastStatus=' + $json.status + ')' }}",
            ),
            type: 'string',
          },
          {
            id: 'agent-id-t',
            name: 'agentId',
            value: expr('{{ $json.agentId }}'),
            type: 'string',
          },
          {
            id: 'run-id-t',
            name: 'runId',
            value: expr('{{ $json.runId }}'),
            type: 'string',
          },
          {
            id: 'agent-url-t',
            name: 'agentUrl',
            value: expr('{{ $json.agentUrl }}'),
            type: 'string',
          },
        ],
      },
      options: {},
    },
  },
  output: [
    {
      ok: false,
      status: 'TIMEOUT',
      result: 'Timed out waiting for Cursor agent.',
      agentId: 'bc-00000000-0000-0000-0000-000000000001',
      runId: 'run-00000000-0000-0000-0000-000000000001',
      agentUrl: 'https://cursor.com/agents/bc-00000000-0000-0000-0000-000000000001',
    },
  ],
});

const respondOk = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Respond Success',
    position: [2160, 160],
    parameters: {
      respondWith: 'json',
      responseBody: expr('{{ $json }}'),
      options: {},
    },
  },
  output: [{}
});

const respondTimeout = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Respond Timeout',
    position: [2400, 560],
    parameters: {
      respondWith: 'json',
      responseBody: expr('{{ $json }}'),
      options: {
        responseCode: 504,
      },
    },
  },
  output: [{}
});

export default workflow('cursor-cloud-agent', 'Cursor Cloud Agent')
  .add(setupNote)
  .add(agentWebhook)
  .to(normalizePrompt)
  .to(createCursorAgent)
  .to(initRunContext)
  .to(waitBeforePoll)
  .to(pollRunStatus)
  .to(updatePollContext)
  .to(
    runFinished
      .onTrue(formatSuccess.to(respondOk))
      .onFalse(
        underPollLimit
          .onTrue(waitBeforePoll)
          .onFalse(formatTimeout.to(respondTimeout)),
      ),
  );
