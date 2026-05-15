'use strict';

/**
 * test-flow-builder.js — Build test scenarios from DD workflows.
 *
 * Layer: L6 ENGINE
 * Pattern: DD workflow -> test scenario transformation
 *
 * Input: DDMetadata (workflows, apiSpecs)
 * Output: TestScenario[] (for test-plan-generator)
 */

class TestFlowBuilder {
  /**
   * Build unit/integration test scenarios from DD workflows.
   *
   * @param {object} ddMetadata - DDMetadata with workflows[] and apiSpecs[]
   * @returns {object[]} TestScenario[] — [{ name, steps, type, expected }]
   */
  buildScenarios(ddMetadata) {
    if (!ddMetadata) return [];
    const scenarios = [];

    // 1. Workflow-based scenarios (state machines, flowcharts)
    for (const workflow of (ddMetadata.workflows || [])) {
      const happyPath = this._buildHappyPath(workflow);
      if (happyPath.length > 0) {
        scenarios.push({
          name: (workflow.name || 'workflow') + '_happy_path',
          steps: happyPath,
          type: 'normal',
          source: 'workflow',
          workflowName: workflow.name,
        });
      }

      const errorStates = (workflow.states || []).filter(s =>
        s.type === 'error' || s.type === 'terminal' || s.type === 'rejected'
      );
      for (const errorState of errorStates) {
        const errorPath = this._buildPathTo(workflow, errorState);
        if (errorPath.length > 0) {
          scenarios.push({
            name: (workflow.name || 'workflow') + '_error_' + (errorState.name || 'unknown'),
            steps: errorPath,
            type: 'abnormal',
            source: 'workflow',
            workflowName: workflow.name,
          });
        }
      }
    }

    // 2. API-driven scenarios from apiSpecs
    for (const api of (ddMetadata.apiSpecs || [])) {
      const pathSlug = (api.path || '').replace(/\//g, '_');

      scenarios.push({
        name: api.method + '_' + pathSlug + '_success',
        steps: [{ action: api.method, endpoint: api.path, data: api.request }],
        expected: api.response,
        type: 'normal',
        source: 'apiSpec',
      });

      scenarios.push({
        name: api.method + '_' + pathSlug + '_invalid',
        steps: [{ action: api.method, endpoint: api.path, data: {} }],
        expected: { status: 400 },
        type: 'abnormal',
        source: 'apiSpec',
      });

      if (['GET', 'PUT', 'PATCH', 'DELETE'].includes((api.method || '').toUpperCase()) &&
          (api.path || '').includes('{')) {
        scenarios.push({
          name: api.method + '_' + pathSlug + '_not_found',
          steps: [{ action: api.method, endpoint: api.path, data: { id: 'non_existent_id' } }],
          expected: { status: 404 },
          type: 'abnormal',
          source: 'apiSpec',
        });
      }
    }

    // 3. Error code scenarios
    for (const errCode of (ddMetadata.errorCodes || [])) {
      scenarios.push({
        name: 'error_' + errCode.code,
        steps: [{ action: 'trigger', errorCode: errCode.code }],
        expected: { errorCode: errCode.code, message: errCode.message, httpStatus: errCode.httpStatus },
        type: 'abnormal',
        source: 'errorCode',
      });
    }

    return scenarios;
  }

  /**
   * Build E2E test flows from DD use cases (multi-step user journeys).
   *
   * @param {object} ddMetadata
   * @returns {object[]} E2EFlow[]
   */
  buildE2EFlows(ddMetadata) {
    if (!ddMetadata) return [];
    const flows = [];

    for (const workflow of (ddMetadata.workflows || [])) {
      if (!workflow.transitions || workflow.transitions.length === 0) continue;

      flows.push({
        name: (workflow.name || 'workflow') + '_e2e',
        steps: workflow.transitions.map(t => ({
          action: t.trigger || 'unknown',
          from: t.from,
          to: t.to,
          dataFactory: t.requiredData || null,
        })),
      });
    }

    return flows;
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  _buildHappyPath(workflow) {
    if (!workflow.transitions || !workflow.states) return [];

    const initialState = workflow.states.find(s =>
      s.type === 'initial' || s.type === 'start'
    ) || workflow.states[0];

    if (!initialState) return [];

    const steps = [];
    const visited = new Set();
    let current = initialState.name || initialState;

    while (current && !visited.has(current)) {
      visited.add(current);

      const transition = workflow.transitions.find(t =>
        t.from === current &&
        !this._isErrorState(t.to, workflow.states)
      );

      if (!transition) break;

      steps.push({
        from: transition.from,
        to: transition.to,
        trigger: transition.trigger || 'unknown',
      });

      current = transition.to;
    }

    return steps;
  }

  _buildPathTo(workflow, targetState) {
    if (!workflow.transitions) return [];

    const targetName = targetState.name || targetState;
    const incomingTransitions = workflow.transitions.filter(t => t.to === targetName);

    if (incomingTransitions.length === 0) return [];

    const transition = incomingTransitions[0];
    return [{
      from: transition.from,
      to: transition.to,
      trigger: transition.trigger || 'error_trigger',
    }];
  }

  _isErrorState(stateName, states) {
    const state = states.find(s => (s.name || s) === stateName);
    if (!state) return false;
    return ['error', 'terminal', 'rejected', 'failed'].includes((state.type || '').toLowerCase());
  }
}

module.exports = { TestFlowBuilder };
