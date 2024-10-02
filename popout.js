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
    alert(selectElem.options[selectElem.selectedIndex].value);
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
        <option>Skip to Before</option>
        <option>Skip to After</option>
        </select>
        <button id="remove-step-${stepID}">-</button>
        <button id="up-step-${stepID}">▲</button>
        <button id="down-step-${stepID}">▼</button>
        <br>
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