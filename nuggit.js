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
  switch (action.type) {
    case 'int64':
    case 'uint64':
      if (Array.isArray(result)) {
        return result.map(e => parseInt(e, 10));
      }
      return parseInt(result, 10);

    case 'float64':
      if (Array.isArray(result)) {
        return result.map(e => parseFloat(e));
      }
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
      } else if (result instanceof NodeList) {
        return Array.from(result).map(node => {
          if (node.nodeType == Node.TEXT_NODE) {
            return node.textContent;
          } else {
            return node.outerHTML || String(node);
          }
        });
      } else if (typeof result === 'string') {
        return result;
      } else {
        return JSON.stringify(result);
      }

    default: // Unsupported types default here.
      throw new Error(`Unsupported action type: ${action.type}`);
  }
}

async function execExchange(trigger, exchanges, steps, stepResults) {
  var results = [];
  for (i in stepResults) {
    if (exchanges.has(+i)) {
      results.push({
        pipe: `${steps[i].action.name}@${steps[i].action.digest}`,
        result: convertResult(steps[i].action, stepResults[i]),
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

async function execInnerText(input) {
  if (input instanceof NodeList) {
    return Array.from(input).map((node) => node.innerText);
  }

  return input.innerText || null;
}

async function execStep(step, input) {
  console.log(step, input);

  switch (step.action.action) {
    case 'documentElement':
      return document.documentElement;

    case 'querySelector':
      // TODO: Do select on input.
      return document.querySelector(step.action.selector);

    case 'querySelectorAll':
      // TODO: Do select on input.
      return document.querySelectorAll(step.action.selector);

    case 'field':
      switch (step.action.field) {
        case 'innerHTML':
          return input.innerHTML;

        case 'outerHTML':
          return input.outerHTML;

        case 'innerText':
          return execInnerText(input);

        default:
          console.error(`Unsupported field: ${step.action.field}`);
          break;
      }
      break;

    default:
      console.error(`Unsupported action: ${step.action.action}`);
      break;
  }
}

async function execTrigger(triggerResponse) {

  const trigger = triggerResponse.trigger;
  const steps = triggerResponse.steps;
  const roots = triggerResponse.roots;
  const exchanges = triggerResponse.exchanges;
  const stepResults = new Array(steps.length);

  console.log('Executing plan for', trigger.id);
  console.time("execTrigger");

  for (const i in steps) {
    const step = steps[i];

    if (roots.has(+i)) { // Root.
      const result = await execStep(step, null);
      console.log('---> Root', i, step, '=>', result);
      stepResults[i] = result;
    } else if (exchanges.has(+i)) { // Exchange.
      const input = stepResults[step.input - 1];
      console.log('<--- Exchange', i, step, '=>', input);
      stepResults[i] = input;
    } else { // Regular step.
      const input = stepResults[step.input - 1];
      const result = await execStep(step, input);
      console.log('.... Step', i, step, '=>', result);
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

async function openTrigger() {
  if (triggerResponse) {
    execTrigger(triggerResponse);
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
    execTrigger(triggerResponse);
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
  const callback = () => {
    clearTimeout(cooldown);
    cooldown = setTimeout(openTrigger, 100);
  };
  const o = new MutationObserver(callback);
  o.observe(document.body, { childList: true, subtree: true });
}

(async function init() {
  const connected = await testBackendConnection();
  if (connected) {
    openTrigger();
  }
})();
