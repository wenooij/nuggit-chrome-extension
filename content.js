console.log("Nuggit was injected into this page and may be collecting data (https://github.com/wenooij/nuggit-chrome-extension).");

const host = 'http://localhost:9402';

async function triggerRequest() {
  try {
    const response = await fetch(host + '/api/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'trigger': {
          'implicit': true,
          'url': document.location.href,
          'timestamp': new Date(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

async function trigger() {
  endpoint = host + '/api/trigger';
  url = document.location.href;

  const response = await triggerRequest();

  console.log(response);
}

trigger();