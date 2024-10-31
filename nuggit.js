'use strict';

const defaultAddress = 'http://localhost:9402';

async function getBackendAddress() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['backendAddress'], (result) => {
      resolve(result.value || defaultAddress);
    });
  });
}

async function testBackendConnection() {
  try {
    const response = await fetch(`${await getBackendAddress()}/api/status`, { method: 'GET' });

    if (!response.ok) throw new Error(`Failed to connect to nuggit backend: ${response.statusText}`);

    return true;
  } catch (error) {
    console.error(`Backend connection failed: ${error.message}`)
    return false;
  }
}

async function fetchTrigger() {
  const response = await fetch(`${await getBackendAddress()}/api/triggers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      implicit: true,
      url: document.location.href,
      timestamp: new Date(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Nuggit trigger failed: ${response.status}`);
  }

  const result = await response.json();
  return result;
}

function convertResult(action, result) {
  if (result === undefined) {
    return null;
  }
  if (Array.isArray(result)) {
    return result.map((e) => convertResult(action, e));
  }
  if (result instanceof NodeList) {
    return Array.from(result).map((node) => convertResult(action, node));
  }
  switch (action.type) {
    case 'int64':
    case 'uint64':
      return parseInt(result, 10);

    case 'float64':
      return parseFloat(result);

    case 'bytes':
    case '':
    case undefined:
      if (result instanceof Element || result instanceof HTMLElement) {
        if (result.nodeType == Node.TEXT_NODE) {
          return result.textContent;
        } else {
          return result.outerHTML || String(result);
        }
      }
      if (result instanceof Attr) {
        return result.value;
      }
      if (result instanceof NamedNodeMap) {
        return Array.from(result).map((e) => e.value);
      }
      if (typeof result === 'string') {
        return result;
      }
      return JSON.stringify(result);

    default: // Unsupported types default here.
      throw new Error(`Unsupported action type: ${action.type}`);
  }
}

class BaseAction {
  constructor(config) {
    if (!config || typeof config !== 'object' || !config.action) {
      throw new Error('invalid action config: \'action\' property is required')
    }
    this.config = config;
  }

  execute() {
    throw new Error('invalid execute call on base class')
  }

  log_invalid_type(input) {
    console.error('invalid input type in action', input?.constructor ? input.constructor : input);
  }
}

class PropAction extends BaseAction {
  constructor(config, prop) {
    super(config);
    this.prop = prop;
  }

  execute(input) {
    if (Array.isArray(input)) {
      return input.map((item) => item[this.prop]);
    }
    if (typeof input === 'object' && input !== null) {
      return input[this.prop];
    }
    super.log_invalid_type(input);
  }
}

class DocumentElementAction extends BaseAction {
  execute() {
    return document.documentElement;
  }
}

class FilterSelectorAction extends BaseAction {
  execute(input) {
    if (!input) {
      return [];
    }
    const { selector } = this.config;
    if (input instanceof HTMLElement) {
      if (input.matches(selector)) {
        return input;
      }
      return null;
    }
    if (input instanceof NodeList) {
      return this.execute(Array.from(input));
    }
    if (Array.isArray(input)) {
      return input.filter((e) => this.execute(e) != null)
    }
    super.log_invalid_type(input);
  }
}

class BaseQuerySelectorAction extends BaseAction {
  constructor(config, all) {
    super(config);
    this.all = all;
  }

  execute(input) {
    if (!input) {
      input = document.documentElement;
    }
    const { selector } = this.config;
    if (input instanceof HTMLElement) {
      return input.querySelector(selector);
    }
    if (input instanceof NodeList) {
      return Array.from(input).map((node) => this.execute(node));
    }
    if (Array.isArray(input)) {
      return input.map((node) => this.execute(node));
    }
    super.log_invalid_type(input);
  }
}

class QuerySelectorAction extends BaseQuerySelectorAction {
  constructor(config) {
    super(config, false);
  }
}

class QuerySelectorAllAction extends BaseAction {
  constructor(config) {
    super(config, true);
  }
}

class RegexpAction extends BaseAction {
  execute(input) {
    const { pattern } = this.config;
    const re = new RegExp(pattern, 'g');
    const matches = (input) => {
      const matches = [];
      let match;
      while ((match = re.exec(input)) !== null) {
        if (match[1]) { // Use first group if available.
          matches.push(match[1])
        } else { // Use full match.
          matches.push(match[0]);
        }
      }
      return matches;
    };
    if (input instanceof HTMLElement) {
      return this.execute(re, input.outerHTML);
    }
    if (typeof input === 'string') {
      return matches(input);
    }
    if (Array.isArray(input)) {
      return input.map(async (e) => matches(e));
    }
    super.log_invalid_type(input);
  }
}

class AttributesAction extends PropAction {
  constructor(config) {
    super(config, 'attributes');
  }

  execute(input) {
    const { name } = this.config;
    const getAttr = (attrs) => {
      if (name) {
        return attrs[name];
      }
      return attrs;
    }
    if (Array.isArray(input)) {
      return input.map((e) => getAttr(super.execute(e)));
    }
    if (input instanceof NodeList) {
      return Array.from(super.execute(input)).map((e) => getAttr(super.execute(e)));
    }
    if (input instanceof HTMLElement) {
      return getAttr(super.execute(input));
    }
    super.log_invalid_type(input);
  }
}

class SplitAction extends BaseAction {
  execute(input) {
    if (!input) {
      return input;
    }
    const { separator } = this.config;
    if (typeof input == 'string') {
      return input.split(separator);
    }
    if (Array.isArray(input)) {
      return input.map((e) => this.execute(e));
    }
    super.log_invalid_type(input);
  }
}

class GetAction extends BaseAction {
  execute(input) {
    if (!input?.get) {
      return null;
    }
    const { prop } = this.config;
    if (Array.isArray(input)) {
      return input.map((item) => item[prop]);
    }
    if (typeof input === 'object' && input !== null) {
      return input[prop];
    }
    super.log_invalid_type(input);
  }
}

class Actions {
  static create(config) {
    switch (config.action) {
      case 'documentElement':  // https://developer.mozilla.org/en-US/docs/Web/API/Document/documentElement
        return new DocumentElementAction(config);
      case 'filterSelector':  // https://developer.mozilla.org/en-US/docs/Web/API/Element/matches
        return new FilterSelectorAction(config);
      case 'querySelector':  // https://developer.mozilla.org/en-US/docs/Web/API/Element/querySelector
        return new QuerySelectorAction(config);
      case 'querySelectorAll':  // https://developer.mozilla.org/en-US/docs/Web/API/Element/querySelectorAll
        return new QuerySelectorAllAction(config);
      case 'innerHTML':  // https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML
        return new PropAction(config, 'innerHTML');
      case 'outerHTML':  // https://developer.mozilla.org/en-US/docs/Web/API/Element/outerHTML
        return new PropAction(config, 'outerHTML');
      case 'innerText':  // https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/innerText
        return new PropAction(config, 'innerText');
      case 'regexp':  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp
        return new RegexpAction(config);
      case 'attributes':  // https://developer.mozilla.org/en-US/docs/Web/API/Element/attributes
        return new AttributesAction(config);
      case 'split':  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split
        return new SplitAction(config);
      case 'get':  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get#prop
        return new GetAction(config);
      default:
        throw new Error(`unsupported action: ${config.action}`);
    }
  }
}

async function execExchange(trigger, exchanges, steps, stepResults) {
  var results = [];
  for (const i in stepResults) {
    if (exchanges.has(+i)) {
      results.push({
        pipe: `${steps[i].action.name}@${steps[i].action.digest}`,
        result: stepResults[i],
      });
    }
  }

  try {
    const response = await fetch(`${await getBackendAddress()}/api/triggers/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trigger: {
          plan: trigger.id,
          implicit: true,
          url: document.location.href,
          timestamp: new Date(),
        },
        results: results,
      }),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(`Nuggit exchange failed: ${response.status} ${result.reason}`);
    }
  } catch (error) {
    console.error(`Exchange error: ${error.message}`);
  }
}

function execStep(step, input) {
  const action = Actions.create(step.action);
  return action.execute(input);
}

async function execTrigger(rootInput, triggerResponse) {
  const trigger = triggerResponse.trigger;
  const steps = triggerResponse.steps;
  const roots = triggerResponse.roots;
  const exchanges = triggerResponse.exchanges;
  const stepResults = new Array(steps.length);

  console.log('Executing plan for', trigger.id);
  console.log('..... Input', 0, rootInput)
  console.time("execTrigger");

  for (const i in steps) {
    const step = steps[i];

    if (roots.has(+i)) { // Root.
      const result = await execStep(step, rootInput);
      console.log('---> Root', (+i) + 1, step, '=>', result);
      stepResults[i] = result;
    } else if (exchanges.has(+i)) { // Exchange.
      // TODO: Use Point here when available.
      const input = convertResult({}, stepResults[step.input - 1]);
      console.log('<--- Exchange', (+i) + 1, step, '=>', input);
      stepResults[i] = input;
    } else { // Regular step.
      const input = stepResults[step.input - 1];
      const result = await execStep(step, input);
      console.log('.... Step', (+i) + 1, step, '=>', result);
      stepResults[i] = result;
    }
  }

  console.timeEnd("execTrigger");

  execExchange(trigger, exchanges, steps, stepResults);
}

let triggerResponse;

function isEmpty(data) {
  return Object.keys(data).length === 0 && data.constructor === Object;
}

async function openTrigger(input) {
  if (triggerResponse) {
    execTrigger(input, triggerResponse);
    return;
  }
  try {
    const response = await fetchTrigger();
    if (isEmpty(response)) {
      return;
    }
    triggerResponse = {
      trigger: response.trigger,
      roots: new Set(response.plan.roots),
      exchanges: new Set(response.plan.exchanges),
      steps: response.plan.steps,
    }
    console.log("Nuggit was injected into this page and may be collecting data (https://github.com/wenooij/nuggit-chrome-extension).");
    registerObserver();
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error(`Connection refused: ${error.message}`);
    } else if (error.response) {
      console.error(`Server responded with status: ${error.response.status}`);
    } else {
      console.error(`Error: ${error.message}`);
    }
  }
}

function registerObserver() {
  var cooldown;
  const callback = (mutationList) => {
    clearTimeout(cooldown);
    cooldown = setTimeout(() => openTrigger(mutationList.flatMap((e) => Array.from(e.addedNodes))), 100);
  };
  const o = new MutationObserver(callback);
  o.observe(document.body, { childList: true, subtree: true });
}

(async function init() {
  const connected = await testBackendConnection();
  if (connected) {
    openTrigger(null);
  }
})();
