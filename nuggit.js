'use strict';

console.log("Nuggit was injected in the page and may be collecting data (https://github.com/wenooij/nuggit)");

(async () => {
  // Current observation rules for the current URL.
  // Updated via the navigate-observe port channel.
  let rules;

  // Create the observer port for talking with the worker.
  const port = chrome.runtime.connect({ name: 'observer' });

  // Define the mutation observer.
  // Here we'll apply the rules for
  // the given scrape plan against
  // newly added nodes on the page.
  const callback = (mutationList) => {
    let matchedNodes = [];
    mutationList.forEach((r) => {
      for (const rule of rules) {
        console.log(rule);
        for (const node of r.addedNodes) {
          if (filterNode(rule.filter, node)) {
            matchedNodes.push(transformNode(rule.action, node));
          }
        }
      }
    });
    if (matchedNodes.length > 0) {
      // Post a result message to the observer when we found matching results.
      port.postMessage({ results: matchedNodes });
    }
  };
  const o = new MutationObserver(callback);

  // We send Navigate messages on the port and
  // the worker replies with Observe rules.
  // We run the matching rules against nodes in the DOM
  // and send results back to the worker.
  port.onMessage.addListener(function (msg) {
    console.log("Worker said", msg);
    rules = msg?.rules;

    if (document.body) {
      o.disconnect();
      o.observe(document.body, { childList: true, subtree: true });
    }
  });

  // Poll the page URL for changes.
  // Send navigation messages when the URL changes.
  // https://pkg.go.dev/github.com/wenooij/nuggit/client#Navigate
  let url = "";
  const sendNavigate = () => {
    const u = window.location.href;
    if (u != url) {
      console.log("Navigate triggered", u);
      port.postMessage({ url: u });
      url = u;
    }
    setTimeout(sendNavigate, 500);
  };
  // The first Navigate message will trigger a response.
  sendNavigate();
})();

// filterNode tests node against the given filter.
function filterNode(filter, node) {
  // Test ID
  if (filter.id && node.id !== filter.id) {
    return false;
  }
  // Test Name
  if (filter.name && node.name !== filter.name) {
    return false;
  }
  // Test NodeType
  if (filter.nodeType && node.nodeType != filter.nodeType) {
    return false;
  }
  // Test Class
  if (filter.class && !node.classList || !node.classList.contains(filter.class)) {
    return false;
  }
  // Test Attribute
  if (filter.attribute && node.attributes) {
    const attr = node.attributes[filter.attribute];
    // Attribute is empty or matches the given value.
    if (attr && (attr.value != "" && filter.attributeEmpty || attr.value != filter.attributeValue)) {
      return false;
    }
  }
  // Test Selector
  if (filter.selector && node.matches && node.matches(filter.selector)) {
    return false;
  }
  // Passed all filters.
  // Return true if there is at least one filter.
  return Object.keys(filter).length > 0;
}

// transformNode transforms a node by the given action and returns a serializable Element.
function transformNode(action, node) {
  const out = {};

  if (action.id) { out.id = node.id; }
  if (action.name) { out.name = node.name; }
  if (action.nodeType) { out.nodeType = node.nodeType; }
  if (action.class) { out.class = node.class; }
  if (action.attributes) {
    const attrs = {};
    node.attributes.forEach((attr) => {
      if (action.attribute_values) {
        attrs[attr.name] = attr.value;
      } else {
        attrs[attr.name] = '';
      }
    });
    out.attributes = attrs;
  }
  if (action.innerText) { out.innerText = node.innerText; }
  if (action.innerHtml) { out.innerHtml = node.innerHTML; }
  if (action.outerHtml) { out.outerHtml = node.outerHTML; }
  if (action.textContent) { out.textContent = node.textContent; }

  if (node instanceof HTMLCanvasElement) {
    // TODO: Implement this.
    if (action.graphicsContext) { }
    if (action.pixelData) { }
  }

  return out;
}