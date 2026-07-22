import {
  workflow,
  node,
  trigger,
  sticky,
  newCredential,
  ifElse,
  switchCase,
  expr,
} from '@n8n/workflow-sdk';

const serviceNowAuth = newCredential('ServiceNow Basic Auth');
const cursorApi = newCredential('Cursor API Key');

const chatInputExpr =
  "{{ $json.body?.chatInput ?? $json.body?.message ?? $json.body?.text ?? $json.chatInput ?? $json.message ?? $json.text ?? '' }}";

const snowDataExpr =
  "{{ JSON.stringify(Array.isArray($json.result) ? $json.result.slice(0, 25) : ($json.result ?? $json)).slice(0, 20000) }}";

const setupNote = sticky(
  '## Cursor Main\n\n1. Attach credentials on HTTP nodes:\n- ServiceNow Basic Auth (httpBasicAuth) on all ServiceNow HTTP Request nodes\n- Cursor API Key (httpBasicAuth): User = API key from Cursor Dashboard → Integrations, Password empty\n2. Publish this workflow so path `n8n` is live for WAHA.\n3. Flow: webhook → keyword route → ServiceNow fetch → Cursor Cloud Agent analyze → respond with summary JSON.',
  [],
  { color: 4, width: 480, height: 320 },
);

const chatWebhook = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2,
  config: {
    name: 'Chat Webhook',
    position: [-1400, 200],
    parameters: {
      httpMethod: 'POST',
      path: 'n8n',
      responseMode: 'responseNode',
      options: {},
    },
  },
  output: [
    {
      body: {
        chatInput: 'Show me Network Link Failure tickets',
      },
    },
  ],
});

const normalizeMessage = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Normalize Message',
    position: [-1160, 200],
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          {
            id: 'msg-text',
            name: 'message',
            value: expr(chatInputExpr),
            type: 'string',
          },
          {
            id: 'chat-input',
            name: 'chatInput',
            value: expr(chatInputExpr),
            type: 'string',
          },
          {
            id: 'raw-body',
            name: 'raw',
            value: expr('{{ $json.body ?? $json }}'),
            type: 'object',
          },
        ],
      },
      options: {},
    },
  },
  output: [
    {
      message: 'Show me Network Link Failure tickets',
      chatInput: 'Show me Network Link Failure tickets',
      raw: { chatInput: 'Show me Network Link Failure tickets' },
    },
  ],
});

const routeByKeywords = switchCase({
  version: 3.2,
  config: {
    name: 'Route by Keywords',
    position: [-900, 120],
    parameters: {
      rules: {
        values: [
          {
            conditions: {
              options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 2,
              },
              conditions: [
                {
                  id: 'net-1',
                  leftValue: expr('{{ $json.chatInput }}'),
                  rightValue: 'Network Link Failure',
                  operator: { type: 'string', operation: 'contains' },
                },
                {
                  id: 'net-2',
                  leftValue: expr('{{ $json.chatInput }}'),
                  rightValue: 'Network Loss',
                  operator: { type: 'string', operation: 'contains' },
                },
                {
                  id: 'net-3',
                  leftValue: expr('{{ $json.chatInput }}'),
                  rightValue: 'Network Outage',
                  operator: { type: 'string', operation: 'contains' },
                },
              ],
              combinator: 'or',
            },
            renameOutput: true,
            outputKey: 'Network Incident',
          },
          {
            conditions: {
              options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 2,
              },
              conditions: [
                {
                  id: 'sr-1',
                  leftValue: expr('{{ $json.chatInput }}'),
                  rightValue: 'Service Request',
                  operator: { type: 'string', operation: 'contains' },
                },
                {
                  id: 'sr-2',
                  leftValue: expr('{{ $json.chatInput }}'),
                  rightValue: 'RITM',
                  operator: { type: 'string', operation: 'contains' },
                },
                {
                  id: 'sr-3',
                  leftValue: expr('{{ $json.chatInput }}'),
                  rightValue: 'SR',
                  operator: { type: 'string', operation: 'contains' },
                },
              ],
              combinator: 'or',
            },
            renameOutput: true,
            outputKey: 'Service Request',
          },
          {
            conditions: {
              options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 2,
              },
              conditions: [
                {
                  id: 'chg-1',
                  leftValue: expr('{{ $json.chatInput }}'),
                  rightValue: 'Changes',
                  operator: { type: 'string', operation: 'contains' },
                },
                {
                  id: 'chg-2',
                  leftValue: expr('{{ $json.chatInput }}'),
                  rightValue: 'CRQ',
                  operator: { type: 'string', operation: 'contains' },
                },
              ],
              combinator: 'or',
            },
            renameOutput: true,
            outputKey: 'Change Request',
          },
          {
            conditions: {
              options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 2,
              },
              conditions: [
                {
                  id: 'alt-1',
                  leftValue: expr('{{ $json.chatInput }}'),
                  rightValue: 'alerts',
                  operator: { type: 'string', operation: 'contains' },
                },
                {
                  id: 'alt-2',
                  leftValue: expr('{{ $json.chatInput }}'),
                  rightValue: 'events',
                  operator: { type: 'string', operation: 'contains' },
                },
              ],
              combinator: 'or',
            },
            renameOutput: true,
            outputKey: 'Alerts',
          },
          {
            conditions: {
              options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 2,
              },
              conditions: [
                {
                  id: 'inc-1',
                  leftValue: expr('{{ $json.chatInput }}'),
                  rightValue: 'incident',
                  operator: { type: 'string', operation: 'contains' },
                },
                {
                  id: 'inc-2',
                  leftValue: expr('{{ $json.chatInput }}'),
                  rightValue: 'outage',
                  operator: { type: 'string', operation: 'contains' },
                },
                {
                  id: 'inc-3',
                  leftValue: expr('{{ $json.chatInput }}'),
                  rightValue: 'mim',
                  operator: { type: 'string', operation: 'contains' },
                },
              ],
              combinator: 'or',
            },
            renameOutput: true,
            outputKey: 'Incident',
          },
          {
            conditions: {
              options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 2,
              },
              conditions: [
                {
                  id: 'prb-1',
                  leftValue: expr('{{ $json.chatInput }}'),
                  rightValue: 'Problem',
                  operator: { type: 'string', operation: 'contains' },
                },
                {
                  id: 'prb-2',
                  leftValue: expr('{{ $json.chatInput }}'),
                  rightValue: 'PRB',
                  operator: { type: 'string', operation: 'contains' },
                },
              ],
              combinator: 'or',
            },
            renameOutput: true,
            outputKey: 'Problem',
          },
        ],
      },
      options: {
        fallbackOutput: 'extra',
        renameFallbackOutput: 'Fallback',
      },
    },
  },
});

const httpNetwork = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'HTTP - Network Incident',
    position: [-560, -280],
    parameters: {
      method: 'GET',
      url: 'https://globe.service-now.com/api/now/table/incident?sysparm_fields=number,short_description,sys_created_by,u_rpt_initial_findigs_and_resolution,resolved_at,u_actual_start_datetime,severity,u_mim,major_incident_state,u_reported_date,sys_updated_on,u_uts_create_date_time,u_resolved_date,u_rpt_r2r_update_time,u_actual_resolved_datetime&sysparm_query=u_rpt_year_of_created=2026^sys_created_by!=clairvoyance_integration01^ORDERBYDESCu_reported_date^short_descriptionLIKELINK FAILURE&sysparm_limit=300',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpBasicAuth',
      options: {},
    },
    credentials: {
      httpBasicAuth: serviceNowAuth,
    },
  },
  output: [
    {
      result: [
        {
          number: 'INC001',
          short_description: 'LINK FAILURE - Site A',
        },
      ],
    },
  ],
});

const httpServiceRequest = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'HTTP - Service Request',
    position: [-560, -80],
    parameters: {
      method: 'GET',
      url: 'https://globe.service-now.com/api/now/table/sc_req_item?sysparm_fields=number,state,sys_created_by,impact,priority,short_description,comments_and_work_notes,stage,escalation,sys_created_on,u_pending_reason,u_uts_ticket_id,opened_at,due_date,u_number_of_follow_up&sysparm_query=number!=empty^sys_created_onLIKE2026^short_description!=Password Reset^stage=completed^ORDERBYDESCsys_created_on&sysparm_limit=1000',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpBasicAuth',
      options: {},
    },
    credentials: {
      httpBasicAuth: serviceNowAuth,
    },
  },
  output: [
    {
      result: [
        {
          number: 'RITM001',
          short_description: 'Access request',
          stage: 'completed',
        },
      ],
    },
  ],
});

const httpChange = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'HTTP - Change Request',
    position: [-560, 120],
    parameters: {
      method: 'GET',
      url: 'https://globe.service-now.com/api/now/table/change_request?sysparm_fields=u_subcategory,u_expedited,impact,State,active,end_date,u_incident_report,comments_and_work_notes,u_deviated,u_bridge_compliance,u_planned_downtime_start,urgency,approval,u_downtime,risk_impact_analysis,state,type,number,test_plan,phase,implementation_plan,short_description,u_monitoring_c10e,start_date,u_assigned_to,backout_plan,task_effective_number,sys_updated_by,phase_state,unauthorized,category&sysparm_query=u_change_type=isg_change^u_rpt_year_of_planned_start_date=2026^state=3^risk_impact_analysis!=Freeze^ORDERBYDESCstart_date',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpBasicAuth',
      options: {},
    },
    credentials: {
      httpBasicAuth: serviceNowAuth,
    },
  },
  output: [
    {
      result: [
        {
          number: 'CRQ001',
          short_description: 'Planned change',
          state: '3',
        },
      ],
    },
  ],
});

const httpAlerts = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'HTTP - Alerts',
    position: [-560, 320],
    parameters: {
      method: 'GET',
      url: 'https://globe.service-now.com/api/now/table/incident?sysparm_fields=number,short_description,sys_created_by,u_rpt_initial_findigs_and_resolution,subcategory,resolved_at,u_actual_start_datetime,u_initial_assessment,severity,u_mim,major_incident_state,u_reported_date,sys_updated_on,u_uts_create_date_time,u_resolved_date,u_rpt_r2r_update_time,u_actual_resolved_datetime&sysparm_query=u_rpt_year_of_created=2026^sys_created_by=clairvoyance_integration01^short_description!=empty^ORDERBYDESCu_reported_date&sysparm_limit=100',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpBasicAuth',
      options: {},
    },
    credentials: {
      httpBasicAuth: serviceNowAuth,
    },
  },
  output: [
    {
      result: [
        {
          number: 'INC100',
          short_description: 'Alert event',
          sys_created_by: 'clairvoyance_integration01',
        },
      ],
    },
  ],
});

const httpIncident = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'HTTP - Incident',
    position: [-560, 520],
    parameters: {
      method: 'GET',
      url: 'https://globe.service-now.com/api/now/table/incident?sysparm_fields=u_reported_date,u_mim,u_resolved_date,u_classification_path, number,sys_updated_by,close_notes,short_description,impact,priority,u_bridge_details,u_rpt_year_of_created,major_incident_state&sysparm_query=u_rpt_year_of_createdIN2025,2026^u_mim=true^ORDERBYDESCu_reported_date',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpBasicAuth',
      options: {},
    },
    credentials: {
      httpBasicAuth: serviceNowAuth,
    },
  },
  output: [
    {
      result: [
        {
          number: 'INC200',
          short_description: 'Major incident',
          u_mim: 'true',
        },
      ],
    },
  ],
});

const httpProblem = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'HTTP - Problem',
    position: [-560, 720],
    parameters: {
      method: 'GET',
      url: 'https://globe.service-now.com/api/now/table/problem?sysparm_fields=number,short_description,state,priority,impact,sys_created_on,opened_at,sys_updated_on,assignment_group&sysparm_query=number!=empty^ORDERBYDESCsys_updated_on&sysparm_limit=100',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpBasicAuth',
      options: {},
    },
    credentials: {
      httpBasicAuth: serviceNowAuth,
    },
  },
  output: [
    {
      result: [
        {
          number: 'PRB001',
          short_description: 'Recurring outage root cause',
        },
      ],
    },
  ],
});

const fallbackSet = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Fallback Set',
    position: [-560, 920],
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          {
            id: 'fb-category',
            name: 'category',
            value: 'Unmatched',
            type: 'string',
          },
          {
            id: 'fb-user',
            name: 'userMessage',
            value: expr("{{ $('Normalize Message').item.json.chatInput }}"),
            type: 'string',
          },
          {
            id: 'fb-snow',
            name: 'snowData',
            value: expr(
              "{{ JSON.stringify({ userMessage: $('Normalize Message').item.json.chatInput }).slice(0, 20000) }}",
            ),
            type: 'string',
          },
        ],
      },
      options: {},
    },
  },
  output: [
    {
      category: 'Unmatched',
      userMessage: 'Hello there',
      snowData: '{"userMessage":"Hello there"}',
    },
  ],
});

const tagNetwork = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Tag - Network Incident',
    position: [-240, -280],
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 'tag-net-cat', name: 'category', value: 'Network Incident', type: 'string' },
          {
            id: 'tag-net-user',
            name: 'userMessage',
            value: expr("{{ $('Normalize Message').item.json.chatInput }}"),
            type: 'string',
          },
          { id: 'tag-net-snow', name: 'snowData', value: expr(snowDataExpr), type: 'string' },
        ],
      },
      options: {},
    },
  },
  output: [
    {
      category: 'Network Incident',
      userMessage: 'sample user message',
      snowData: '[{"number":"SAMPLE001"}]',
    },
  ],
});

const tagServiceRequest = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Tag - Service Request',
    position: [-240, -80],
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 'tag-sr-cat', name: 'category', value: 'Service Request', type: 'string' },
          {
            id: 'tag-sr-user',
            name: 'userMessage',
            value: expr("{{ $('Normalize Message').item.json.chatInput }}"),
            type: 'string',
          },
          { id: 'tag-sr-snow', name: 'snowData', value: expr(snowDataExpr), type: 'string' },
        ],
      },
      options: {},
    },
  },
  output: [
    {
      category: 'Service Request',
      userMessage: 'sample user message',
      snowData: '[{"number":"SAMPLE001"}]',
    },
  ],
});

const tagChange = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Tag - Change Request',
    position: [-240, 120],
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 'tag-chg-cat', name: 'category', value: 'Change Request', type: 'string' },
          {
            id: 'tag-chg-user',
            name: 'userMessage',
            value: expr("{{ $('Normalize Message').item.json.chatInput }}"),
            type: 'string',
          },
          { id: 'tag-chg-snow', name: 'snowData', value: expr(snowDataExpr), type: 'string' },
        ],
      },
      options: {},
    },
  },
  output: [
    {
      category: 'Change Request',
      userMessage: 'sample user message',
      snowData: '[{"number":"SAMPLE001"}]',
    },
  ],
});

const tagAlerts = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Tag - Alerts',
    position: [-240, 320],
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 'tag-alt-cat', name: 'category', value: 'Alerts', type: 'string' },
          {
            id: 'tag-alt-user',
            name: 'userMessage',
            value: expr("{{ $('Normalize Message').item.json.chatInput }}"),
            type: 'string',
          },
          { id: 'tag-alt-snow', name: 'snowData', value: expr(snowDataExpr), type: 'string' },
        ],
      },
      options: {},
    },
  },
  output: [
    {
      category: 'Alerts',
      userMessage: 'sample user message',
      snowData: '[{"number":"SAMPLE001"}]',
    },
  ],
});

const tagIncident = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Tag - Incident',
    position: [-240, 520],
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 'tag-inc-cat', name: 'category', value: 'Incident', type: 'string' },
          {
            id: 'tag-inc-user',
            name: 'userMessage',
            value: expr("{{ $('Normalize Message').item.json.chatInput }}"),
            type: 'string',
          },
          { id: 'tag-inc-snow', name: 'snowData', value: expr(snowDataExpr), type: 'string' },
        ],
      },
      options: {},
    },
  },
  output: [
    {
      category: 'Incident',
      userMessage: 'sample user message',
      snowData: '[{"number":"SAMPLE001"}]',
    },
  ],
});

const tagProblem = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Tag - Problem',
    position: [-240, 720],
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 'tag-prb-cat', name: 'category', value: 'Problem', type: 'string' },
          {
            id: 'tag-prb-user',
            name: 'userMessage',
            value: expr("{{ $('Normalize Message').item.json.chatInput }}"),
            type: 'string',
          },
          { id: 'tag-prb-snow', name: 'snowData', value: expr(snowDataExpr), type: 'string' },
        ],
      },
      options: {},
    },
  },
  output: [
    {
      category: 'Problem',
      userMessage: 'sample user message',
      snowData: '[{"number":"SAMPLE001"}]',
    },
  ],
});

const tagFallback = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Tag - Unmatched',
    position: [-240, 920],
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          {
            id: 'tag-fb-cat',
            name: 'category',
            value: 'Unmatched',
            type: 'string',
          },
          {
            id: 'tag-fb-user',
            name: 'userMessage',
            value: expr('{{ $json.userMessage }}'),
            type: 'string',
          },
          {
            id: 'tag-fb-snow',
            name: 'snowData',
            value: expr('{{ $json.snowData }}'),
            type: 'string',
          },
        ],
      },
      options: {},
    },
  },
  output: [
    {
      category: 'Unmatched',
      userMessage: 'Hello there',
      snowData: '{"userMessage":"Hello there"}',
    },
  ],
});

const buildCursorPrompt = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Build Cursor Prompt',
    position: [40, 200],
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          {
            id: 'prompt',
            name: 'prompt',
            value: expr(
              "{{ 'Analyze this ServiceNow ' + $json.category + ' data for an operations chat reply. User asked: ' + $json.userMessage + '. Return a concise WhatsApp-friendly summary (under 3000 chars) with key tickets, status, and recommended next steps. Data: ' + $json.snowData }}",
            ),
            type: 'string',
          },
          {
            id: 'prompt-cat',
            name: 'category',
            value: expr('{{ $json.category }}'),
            type: 'string',
          },
          {
            id: 'prompt-user',
            name: 'userMessage',
            value: expr('{{ $json.userMessage }}'),
            type: 'string',
          },
        ],
      },
      options: {},
    },
  },
  output: [
    {
      prompt:
        'Analyze this ServiceNow Network Incident data for an operations chat reply. User asked: Show me Network Link Failure tickets. Return a concise WhatsApp-friendly summary (under 3000 chars) with key tickets, status, and recommended next steps. Data: [{"number":"INC001"}]',
      category: 'Network Incident',
      userMessage: 'Show me Network Link Failure tickets',
    },
  ],
});

const createCursorAgent = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Create Cursor Agent',
    position: [280, 200],
    parameters: {
      method: 'POST',
      url: 'https://api.cursor.com/v1/agents',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpBasicAuth',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr(
        "{{ { prompt: { text: $json.prompt }, model: { id: 'composer-2.5' }, name: 'Cursor Main Analyzer' } }}",
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
        name: 'Cursor Main Analyzer',
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
    position: [520, 200],
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
            id: 'ctx-cat',
            name: 'category',
            value: expr("{{ $('Build Cursor Prompt').item.json.category }}"),
            type: 'string',
          },
          {
            id: 'ctx-user',
            name: 'userMessage',
            value: expr("{{ $('Build Cursor Prompt').item.json.userMessage }}"),
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
      category: 'Network Incident',
      userMessage: 'Show me Network Link Failure tickets',
    },
  ],
});

const waitBeforePoll = node({
  type: 'n8n-nodes-base.wait',
  version: 1.1,
  config: {
    name: 'Wait Before Poll',
    position: [760, 200],
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
      category: 'Network Incident',
      userMessage: 'Show me Network Link Failure tickets',
    },
  ],
});

const pollRunStatus = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Poll Run Status',
    position: [1000, 200],
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
      result: 'Found 1 network link failure: INC001 Site A. Next: escalate to NOC.',
      durationMs: 12357,
    },
  ],
});

const updatePollContext = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Update Poll Context',
    position: [1240, 200],
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
            id: 'cat-2',
            name: 'category',
            value: expr("{{ $('Init Run Context').item.json.category }}"),
            type: 'string',
          },
          {
            id: 'user-2',
            name: 'userMessage',
            value: expr("{{ $('Init Run Context').item.json.userMessage }}"),
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
      result: 'Found 1 network link failure: INC001 Site A. Next: escalate to NOC.',
      durationMs: 12357,
      agentId: 'bc-00000000-0000-0000-0000-000000000001',
      runId: 'run-00000000-0000-0000-0000-000000000001',
      agentUrl: 'https://cursor.com/agents/bc-00000000-0000-0000-0000-000000000001',
      pollCount: 1,
      category: 'Network Incident',
      userMessage: 'Show me Network Link Failure tickets',
    },
  ],
});

const runFinished = ifElse({
  version: 2.3,
  config: {
    name: 'Run Finished?',
    position: [1480, 200],
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
    position: [1720, 400],
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

const formatResult = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Format Agent Result',
    position: [1720, 80],
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
            id: 'cat-out',
            name: 'category',
            value: expr('{{ $json.category }}'),
            type: 'string',
          },
          {
            id: 'analysis-out',
            name: 'analysis',
            value: expr('{{ $json.result }}'),
            type: 'string',
          },
          {
            id: 'result-out',
            name: 'result',
            value: expr('{{ $json.result }}'),
            type: 'string',
          },
          {
            id: 'agent-url-out',
            name: 'agentUrl',
            value: expr('{{ $json.agentUrl }}'),
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
        ],
      },
      options: {},
    },
  },
  output: [
    {
      ok: true,
      status: 'FINISHED',
      category: 'Network Incident',
      analysis: 'Found 1 network link failure: INC001 Site A. Next: escalate to NOC.',
      result: 'Found 1 network link failure: INC001 Site A. Next: escalate to NOC.',
      agentUrl: 'https://cursor.com/agents/bc-00000000-0000-0000-0000-000000000001',
      agentId: 'bc-00000000-0000-0000-0000-000000000001',
      runId: 'run-00000000-0000-0000-0000-000000000001',
    },
  ],
});

const formatTimeout = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Format Timeout',
    position: [1960, 480],
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
            id: 'cat-t',
            name: 'category',
            value: expr('{{ $json.category }}'),
            type: 'string',
          },
          {
            id: 'analysis-t',
            name: 'analysis',
            value: expr(
              "{{ 'Timed out waiting for Cursor agent. Check ' + $json.agentUrl + ' (agentId=' + $json.agentId + ', runId=' + $json.runId + ', lastStatus=' + $json.status + ')' }}",
            ),
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
            id: 'agent-url-t',
            name: 'agentUrl',
            value: expr('{{ $json.agentUrl }}'),
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
        ],
      },
      options: {},
    },
  },
  output: [
    {
      ok: false,
      status: 'TIMEOUT',
      category: 'Network Incident',
      analysis: 'Timed out waiting for Cursor agent.',
      result: 'Timed out waiting for Cursor agent.',
      agentUrl: 'https://cursor.com/agents/bc-00000000-0000-0000-0000-000000000001',
      agentId: 'bc-00000000-0000-0000-0000-000000000001',
      runId: 'run-00000000-0000-0000-0000-000000000001',
    },
  ],
});

const respondOk = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Respond to Webhook',
    position: [1960, 80],
    parameters: {
      respondWith: 'json',
      responseBody: expr('{{ $json }}'),
      options: {},
    },
  },
  output: [{}],
});

const respondTimeout = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Respond Timeout',
    position: [2200, 480],
    parameters: {
      respondWith: 'json',
      responseBody: expr('{{ $json }}'),
      options: {
        responseCode: 504,
      },
    },
  },
  output: [{}],
});

export default workflow('cursor-main', 'Cursor Main')
  .add(setupNote)
  .add(chatWebhook)
  .to(normalizeMessage)
  .to(
    routeByKeywords
      .onCase(0, httpNetwork.to(tagNetwork.to(buildCursorPrompt)))
      .onCase(1, httpServiceRequest.to(tagServiceRequest.to(buildCursorPrompt)))
      .onCase(2, httpChange.to(tagChange.to(buildCursorPrompt)))
      .onCase(3, httpAlerts.to(tagAlerts.to(buildCursorPrompt)))
      .onCase(4, httpIncident.to(tagIncident.to(buildCursorPrompt)))
      .onCase(5, httpProblem.to(tagProblem.to(buildCursorPrompt)))
      .onCase(6, fallbackSet.to(tagFallback.to(buildCursorPrompt))),
  )
  .add(buildCursorPrompt)
  .to(createCursorAgent)
  .to(initRunContext)
  .to(waitBeforePoll)
  .to(pollRunStatus)
  .to(updatePollContext)
  .to(
    runFinished
      .onTrue(formatResult.to(respondOk))
      .onFalse(
        underPollLimit
          .onTrue(waitBeforePoll)
          .onFalse(formatTimeout.to(respondTimeout)),
      ),
  );
