function openTab(evt, tabName) {
    return openTabElement(evt.currentTarget, tabName);
}

function openTabElement(tablinkElement, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    tablinkElement.className += " active";
}

let stepID = 0;

function resetSteps() {
    let steps = document.getElementById('steps');
    steps.innerHTML = '';
    stepID = 0;
}

function removeStep(i) {
    document.getElementById(`step-${i}`).remove();
}

function changeStep(i) {
    let selectElem = document.getElementById(`step-type-${i}`);
    let option = selectElem.options[selectElem.selectedIndex].value;
    clearStepContent(i);
    switch (option) {
        case '-- Select Op --':
        case '-- Control Flow --':
        case '-- Persistence --':
            break;
        case 'Match Document Selector':
            appendMatchDocumentSelectorStep(i);
            break;
        case 'Match Text':
            appendMatchTextStepContent(i);
            break;
        case 'Checkpoint':
            appendCheckpointStepContent(i);
            break;
        case 'Export':
            appendExportStepContent(i);
            break;
        default:
            console.error(`Unknown option: ${option}`)
    }
}

function clearStepContent(i) {
    document.getElementById(`step-content-${i}`).innerHTML = '';
}

function appendMatchTextStepContent(i) {
    let content = document.getElementById(`step-content-${i}`);

    let mode = document.createElement('select');
    mode.innerHTML = `
        <option>EXTRACT</option>
        <option>BEFORE</option>
        <option>AFTER</option>
    `;
    content.appendChild(mode);

    appendTextOperationTypeStepContent(i);
    appendTextareaStepContent(i);

    let flags = document.createElement('div');
    flags.innerHTML = `
        <p>
        <input id="step-flags-i-${i}" type="checkbox">
        <label for="step-flags-i-${i}">Ignore Case</label>
        </p>`;
    content.appendChild(flags);

    let docElem = document.createElement('p');
    let doc = document.createElement('a');
    doc.target = '_blank';
    doc.href = 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions';
    doc.innerText = 'Using regular expressions';
    docElem.appendChild(doc);
    content.appendChild(docElem);
}

function appendTextOperationTypeStepContent(i) {
    let opElem = document.createElement('select');
    opElem.innerHTML = `
        <option>=</option>
        <option>REGEXP</option>
    `;
    let content = document.getElementById(`step-content-${i}`);
    content.appendChild(opElem);
}

function appendTextareaStepContent(i) {
    let textElem = document.createElement('textarea');
    let content = document.getElementById(`step-content-${i}`);
    content.appendChild(textElem);
}

function appendMatchDocumentSelectorStep(i) {
    let content = document.getElementById(`step-content-${i}`);

    let mode = document.createElement('select');
    mode.innerHTML = `
        <option>CONTENTS</option>
        <option>NODE</option>
        <option>BEFORE</option>
        <option>AFTER</option>
    `;
    content.appendChild(mode);

    appendTextareaStepContent(i);

    let docElem = document.createElement('div');
    docElem.innerHTML = `
        <p>
        <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors">Using CSS Selectors</a>
        <br>
        <a target="_blank" href="https://github.com/wenooij/nuggit-chrome-extension">Using the mode option</a>
        </p>`;
    content.appendChild(docElem);
}

function appendCheckpointStepContent(i) {
    let content = document.getElementById(`step-content-${i}`);

    let mode = document.createElement('select');
    mode.innerHTML = `
        <option>Save</option>
        <option>Restore</option>    
    `;
    content.appendChild(mode);

    let name = document.createElement('input');
    name.placeholder = 'Enter checkpoint name...';
    name.id = `checkpoint-name-${i}`;
    content.appendChild(name);

    let doc = document.createElement('div');
    doc.innerHTML = `<p>Checkpoints can be saved and recalled later.</p>`;
    content.appendChild(doc);
}

function appendExportStepContent(i) {
    let content = document.getElementById(`step-content-${i}`);

    let flags = document.createElement('div');
    flags.innerHTML = `
        <p>
        <input id="step-export-nullable-${i}" type="checkbox">
        <label for="step-export-nullable-${i}">Allow Null?</label>
        </p>
    `;
    content.appendChild(flags);

    let name = document.createElement('input');
    name.placeholder = 'Enter exported name...';
    name.id = `export-name-${i}`;
    content.appendChild(name);

    let doc = document.createElement('div');
    doc.innerHTML = `<p>Export the current selection as a structured data.</p>`;
    content.appendChild(doc);
}

function addStep() {
    stepID++;
    let steps = document.getElementById('steps');
    let newStep = document.createElement('div');
    newStep.id = `step-${stepID}`;
    newStep.className = 'step';
    newStep.innerHTML = `
        <select name="step-type-${stepID}" id="step-type-${stepID}">
        <option>-- Select Op --</option>
        <option>-- Matchers --</option>
        <option>Match Document Selector</option>
        <option>Match Text</option>
        <option>-- Control Flow --</option>
        <option>Checkpoint</option>
        <option>-- Persistence --</option>
        <option>Export</option>
        </select>
        <button id="remove-step-${stepID}">-</button>
        <button id="up-step-${stepID}">▲</button>
        <button id="down-step-${stepID}">▼</button>
        <div class="step-content" id="step-content-${stepID}">
        </div>
    `;
    steps.appendChild(newStep);
    document.getElementById(`step-type-${stepID}`).addEventListener('change', function (event) {
        changeStep(id);
    });
    let id = stepID;
    document.getElementById(`remove-step-${stepID}`).addEventListener('click', function (event) {
        removeStep(id);
    });
}

window.onload = function () {
    document.getElementById('wizard-tablink').addEventListener('click', function (event) {
        openTab(event, 'wizard');
    });
    document.getElementById('programs-tablink').addEventListener('click', function (event) {
        openTab(event, 'programs');
    });
    document.getElementById('settings-tablink').addEventListener('click', function (event) {
        openTab(event, 'settings');
    });
    openTabElement(
        document.getElementById('wizard-tablink'),
        'wizard');
    document.getElementById('add-step').addEventListener('click', function () {
        addStep();
    });
    document.getElementById('reset-steps').addEventListener('click', function () {
        resetSteps();
    });
};