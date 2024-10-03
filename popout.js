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
    switch (option) {
        case '-- Select Op --':
            break;
        case 'Conditions':
            createConditionsStep(i);
            break;
        case 'Match Selector':
            createSelectorStep(i);
            break;
        case 'Match Text':
            createTextStep(i);
            break;
        case 'Export':
            createExportStep(i);
            break;
        default:
            console.error(`Unknown option: ${option}`)
    }
}

function createConditionsStep(i) {
    let content = document.getElementById(`step-content-${i}`);
    content.innerHTML = `
        <label for="step-conditions-${i}"> 
        URL MATCHES 
        <select>
            <option>HOST</option>
            <option>FULL REGEX</option>
        </select>
        </label>
        <textarea id="step-conditions-${i}"></textarea>
        <div><p>Control when the steps run.</p></div>`;
}


function createTextStep(i) {
    let content = document.getElementById(`step-content-${i}`);
    content.innerHTML = `
        EXTRACT TEXT
        <select>
            <option>LITERAL</option>
            <option>ATTRIBUTE</option>
            <option>FROM PARTIAL REGEXP</option>
        </select>
        <textarea></textarea>
        <div>
            <p>
            <input id="step-flags-i-${i}" type="checkbox">
            <label for="step-flags-i-${i}">Ignore Case</label>
            </p>
        </div>
        <div>
        <p>
            Extract text from the page.
            <br>
            <br>
            <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions">Using REGEXP</a>
        </p>
        </div>`;
}

function createSelectorStep(i) {
    let content = document.getElementById(`step-content-${i}`);
    content.innerHTML = `
        SELECT DESCENDENTS OF 
        <textarea></textarea>
        <div>
        <p>
            Match HTML elements on the page.
            <br>
            <br>
            <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors">Using CSS Selectors</a>
            <br>
            <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors">Using Attribute Selectors</a>
            <br>
            <a target="_blank" href="https://github.com/wenooij/nuggit-chrome-extension">Using the mode option</a>
        </p>
        </div>`;
}

function createExportStep(i) {
    let content = document.getElementById(`step-content-${i}`);
    content.innerHTML = `
        <div>
        <p>
            <input id="step-export-nullable-${i}" type="checkbox">
            <label for="step-export-nullable-${i}">Allow Null?</label>
            <input id="step-export-provenance-${i}" type="checkbox" checked>
            <label for="step-export-provenance-${i}">Add Provenance?</label>
        </p>
        </div>
        <div>
            <label for="export-collection-${i}">Collection</label> <input id="export-collection-${i}" placeholder="Enter collection name..."><br>
            <label for="export-name-${i}">Name</label> <input id="export-name-${i}" placeholder="Enter exported name...">
        </div>
        <div>
        <p>
            Export the text selected up to this point as data.
            <br>
            <br>
            <a target="_blank" href="https://github.com/wenooij/nuggit-chrome-extension">Using Export</a>
        </p>
        </div>`;
}

function moveUp(i) {
    let step = document.getElementById(`step-${i}`);
    let prevStep = step.previousSibling;
    if (prevStep == null) { return; }
    prevStep.parentElement.insertBefore(step, prevStep);
}

function moveDown(i) {
    let step = document.getElementById(`step-${i}`);
    let nextStep = step.nextSibling;
    if (nextStep == null) { return; }
    step.parentElement.insertBefore(nextStep, step);
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
        <option>Conditions</option>
        <option>Match Selector</option>
        <option>Match Text</option>
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
    document.getElementById(`up-step-${stepID}`).addEventListener('click', function (event) {
        moveUp(id);
    });
    document.getElementById(`down-step-${stepID}`).addEventListener('click', function (event) {
        moveDown(id);
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