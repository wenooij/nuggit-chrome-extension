document.getElementById('extractButton').addEventListener('click', () => {
    const script = document.getElementById('scriptInput').value;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: extractData,
            args: [script]
        }, (results) => {
            const output = results[0]?.result || 'No data extracted.';
            document.getElementById('output').textContent = output;
        });
    });
});

function extractData(script) {
    // try {
    //     return eval(script);
    // } catch (error) {
    //     return `Error: ${error.message}`;
    // }
    return "<fake data>"
}