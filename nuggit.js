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

class Value {
  static isNull(value) {
    return value === null;
  }

  static isUndefined(value) {
    return value === undefined;
  }

  static isString(value) {
    return typeof value === 'string';
  }

  static isNumber(value) {
    return typeof value === 'number';
  }

  static isArray(value) {
    return Array.isArray(value);
  }

  static isNodeList(value) {
    return value instanceof NodeList;
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
  static isHTMLElement(value) {
    return value instanceof Element;
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/Element
  static isElement(value) {
    return value instanceof Element;
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/Node
  static isNode(value) {
    return value instanceof Node;
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/Attr
  static isAttr(value) {
    return value instanceof Attr;
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/NamedNodeMap
  static isNamedNodeMap(value) {
    return value instanceof NamedNodeMap;
  }

  static asArray(value) {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
    if (Value.isArray(value)) {
      return value;
    }
    // https://developer.mozilla.org/en-US/docs/Web/API/NodeList
    if (Value.isNodeList(value)) {
      return Array.from(value);
    }
    return Array.of(value);
  }

  // normalize the value by converting applicable parts to arrays.
  static normalize(value) {
    if (Value.isNull(value) || Value.isUndefined(value)) {
      return null;
    }
    if (Value.isString(value) || Value.isNumber(value)) {
      return value;
    }
    if (Value.isArray(value)) {
      return value.map((e) => Value.normalize(e));
    }
    if (Value.isElement(value)) {
      return value.outerHTML;
    }
    if (Value.isNode(value)) {
      // TODO: Do we have something more appropriate to return?
      // See https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent#differences_from_innertext
      return value.textContent;
    }
    if (Value.isAttr(value)) {
      // Escape double-quotes.
      const val = value.value.replace(/"/g, '\\"');
      return `${value.name}="${val}"`;
    }
    if (Value.isNamedNodeMap(value) || Value.isNodeList(value)) {
      return Value.normalize(Array.from(value));
    }
    console.error('unexpected value in normalized will be returned as is', value);
    return value;
  }

  // cast casts the normalized value to the value expected by the given scalar.
  //
  // It returns the casted value.
  static cast(value, scalar) {
    // The scalar value is batched, cast it pointwise.
    if (Value.isArray(value)) {
      return value.map((e) => Value.castScalar(e, scalar));
    }
    return Value.castScalar(value, scalar);
  }

  static castRepeated(value, scalar) {
    // Repeated array values are cast pointwise using map.
    if (Value.isArray(value)) {
      return value.map((e) => Value.cast(e, scalar));
    }
    // Wrap the casted scalar result in an array.
    return Array.of(Value.castScalar(value, scalar));
  }

  static castScalar(value, scalar) {
    // Regardless of the scalar type, undefined and null values are converted to null.
    if (value === undefined || value === null) {
      return null;
    }
    switch (scalar) {
      case null:
      case undefined:
      case '':
      case 'bytes':
      case 'string':
        if (typeof value === 'string') {
          return value;
        }
        // Casting with String yields "[object Object]" which is pointless.
        // stringifying unknown types is much more useful even if its "{}".
        return JSON.stringify(value);

      case 'bool':
        if (typeof value === 'boolean') {
          return value;
        }
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean#boolean_coercion
        return Boolean(value); // Coerce boolean.

      case 'int':
      case 'int64':
      case 'uint64':
        if (typeof value === 'number') {
          return value;
        }
        // parseInt returns the value, otherwise NaN becomes null.
        return parseInt(value) || null;

      case 'float':
      case 'float64':
        if (typeof value === 'number' && isFinite(value)) {
          return value;
        }
        // parseFloat returns the value, otherwise NaN becomes null.
        return parseFloat(value) || null;

      default:
        console.error('unexpected scalar type will be JSON stringified', scalar, value);
        return JSON.stringify(value);
    }
  }

  // isZero returns whether normalized, casted result value is the zero value with respect to the given point.
  //
  // isZero returns true for arrays when every value is zero and the point is not repeated.
  // If the value is zero, it won't be sent over the exchange.
  static isZero(value, scalar) {
    if (Value.isArray(value)) {
      return value.every((e) => Value.isZeroScalar(e, scalar));
    }
    return Value.isZeroScalar(scalar);
  }

  static isZeroArray(value, scalar) {
    return value.every((e) => Value.isZero(e, { scalar, repeated: false }));
  }

  static isZeroScalar(value, scalar) {
    // Null is always zero.
    if (Value.isNull(value)) {
      return true;
    }
    switch (scalar) {
      case undefined:
      case null:
      case '':
      case 'bytes':
      case 'string':
        return value === '';

      case 'bool':
        return value === false;

      case 'int':
      case 'int64':
      case 'uint64':
      case 'float':
      case 'float64':
        return value === 0;

      default:
        console.error('unexpected scalar type will be assumed nonzero', scalar, value);
        return false;
    }
  }
}

async function execExchange(trigger, exchanges, steps, stepResults) {
  let results = [];
  for (const i in stepResults) {
    if (exchanges.has(+i)) {
      const { scalar } = steps[i].action;
      const castedValue = Value.cast(stepResults[i], scalar);  // stepResults[i] is already normalized.
      if (Value.isZero(castedValue, scalar)) {
        // Exchange results will be skipped when pipe value is zero.
        continue;
      }
      results.push({
        pipe: `${steps[i].action.name}@${steps[i].action.digest}`,
        result: castedValue,
      });
    }
  }

  if (results.length == 0) {
    // Exchange will be skipped when all results are zero.
    return;
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

class BaseAction {
  constructor(config) {
    const { action } = config;
    if (!action) {
      throw new Error('invalid action config: \'action\' property is required')
    }
    this.action = action;
    this.config = config;
  }

  mapper(elem) { return elem; }

  execute(input) { return Value.asArray(input).map(this.mapper); }

  log_invalid_type(input) {
    console.error('invalid input type in action', input?.constructor ? input.constructor : input);
  }
}

class BaseFilterAction extends BaseAction {
  constructor(config) {
    super(config);
  }

  filter(_elem) { return true; }

  execute(input) { return Value.asArray(input).flatMap((e) => this.filter(e) ? [this.mapper(e)] : []); }
}

// TODO: Create a version of this that doesn't flattens the value batch.
class PropAction extends BaseAction {
  constructor(config, prop) {
    super(config);
    this.prop = prop;
  }

  execute(input) {
    // When prop is not set, return the input unmodified.
    if (!this.prop) {
      return e;
    }
    return super.execute(input);
  }

  mapper = (elem) => {
    // null
    // undefined
    if (Value.isUndefined(elem) || Value.isNull(elem)) {
      return elem;
    }
    // [object]
    // string
    if (typeof elem == 'object' || typeof elem == 'string') {
      return elem[this.prop];
    }
    super.log_invalid_type(elem);
  }
}

class DocumentElementAction extends BaseAction {
  execute() {
    return document.documentElement;
  }
}

class FilterSelectorAction extends BaseFilterAction {
  constructor(config) {
    super(config);
    const { selector } = config;
    this.selector = selector;
  }

  filter = (elem) => { return elem instanceof Element && elem.matches(this.selector); }
}

class QuerySelectorAction extends BaseAction {
  constructor(config) {
    super(config);
    const { selector, all, self } = config;
    this.selector = selector;
    this.all = all;
    this.self = self;
    if (this.self) {
      this.selfFilter = new FilterSelectorAction(config);
    }
  }

  execute(input) {
    let results = [];
    if (this.self) {
      results = this.selfFilter.execute(input);
    }
    return results.concat(super.execute(input));
  }

  mapper = (elem) => {
    // https://developer.mozilla.org/docs/Web/API/Element
    if (elem instanceof Element) {
      if (this.all) {
        return elem.querySelectorAll(this.selector);
      }
      return elem.querySelector(this.selector);
    }
    return null;
  }
}

class RegexpAction extends BaseAction {
  constructor(config) {
    super(config);
    const { pattern } = config;
    this.re = new RegExp(pattern, 'g');
  }

  mapper = (elem) => {
    const matches = [];
    let match;
    while ((match = this.re.exec(elem)) !== null) {
      if (match[1]) { // Use first group if available.
        matches.push(match[1])
      } else { // Use full match.
        matches.push(match[0]);
      }
    }
    return matches;
  }
}

class SplitAction extends BaseAction {
  constructor(config) {
    super(config);
    const { separator } = config;
    this.separator = separator;
  }

  mapper = (elem) => { return elem.split(this.separator); }
}

class Chain {
  constructor(...actions) {
    this.actions = actions;
  }

  execute(input) {
    let result = input;
    for (const action of this.actions) {
      result = action.execute(result);
    }
    return result;
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
        return new QuerySelectorAction(config);
      case 'innerHTML':  // https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML
        return new PropAction(config, 'innerHTML');
      case 'outerHTML':  // https://developer.mozilla.org/en-US/docs/Web/API/Element/outerHTML
        return new PropAction(config, 'outerHTML');
      case 'innerText':  // https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/innerText
        return new PropAction(config, 'innerText');
      case 'regexp':  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp
        return new RegexpAction(config);
      case 'attributes':  // https://developer.mozilla.org/en-US/docs/Web/API/Element/attributes
        return new Chain(new PropAction(config, 'attributes'), new PropAction(config, config?.name));
      case 'split':  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split
        return new SplitAction(config);
      case 'get':  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get#prop
        return new PropAction(config, config?.prop);
      default:
        throw new Error(`unsupported action: ${config.action}`);
    }
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
      const input = Value.normalize(stepResults[step.input - 1]);
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
