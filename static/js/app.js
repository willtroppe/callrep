let currentZipCode = '';

// Load representatives for a specific zip code (for search functionality)
async function loadRepresentatives() {
    const zipCode = document.getElementById('zipCode').value.trim();
    
    if (!zipCode) {
        showAlert('Please enter a zip code', 'error');
        return;
    }
    
    currentZipCode = zipCode;
    
    // Show loading state
    document.getElementById('representativesList').innerHTML = '<div class="loading"><i class="fas fa-spinner"></i> Loading representatives...</div>';
    document.getElementById('representativesSection').style.display = 'block';
    
    try {
        const response = await fetch(`/api/representatives/${zipCode}`);
        const representatives = await response.json();
        
        displayRepresentatives(representatives);
        loadScripts();
        
        // Auto-populate the zip code field in Step 2
        const newRepZipCode = document.getElementById('newRepZipCode');
        if (newRepZipCode) {
            newRepZipCode.value = zipCode;
        }
        
        // Show scripts section and call section
        document.getElementById('scriptsSection').style.display = 'block';
        showCallSection();
        
    } catch (error) {
        console.error('Error loading representatives:', error);
        showAlert('Error loading representatives. Please try again.', 'error');
    }
}

// Dark Mode Toggle
function toggleDarkMode() {
    const body = document.body;
    const icon = document.getElementById('darkModeIcon');
    
    if (body.classList.contains('dark')) {
        body.classList.remove('dark');
        icon.className = 'fas fa-moon';
        localStorage.setItem('darkMode', 'false');
    } else {
        body.classList.add('dark');
        icon.className = 'fas fa-sun';
        localStorage.setItem('darkMode', 'true');
    }
    
    // Force icon color update
    setTimeout(() => {
        if (body.classList.contains('dark')) {
            icon.style.color = 'var(--text-primary-dark)';
        } else {
            icon.style.color = 'var(--text-primary-light)';
        }
    }, 10);
}

// Initialize dark mode from localStorage
function initDarkMode() {
    const darkMode = localStorage.getItem('darkMode');
    const body = document.body;
    const icon = document.getElementById('darkModeIcon');
    
    if (darkMode === 'true') {
        body.classList.add('dark');
        icon.className = 'fas fa-sun';
        icon.style.color = 'var(--text-primary-dark)';
    } else {
        icon.style.color = 'var(--text-primary-light)';
    }
}

// Load representatives without requiring zip code (for initialization)
async function loadInitialRepresentatives() {
    try {
        // Just clear the representatives list and show the add form
        document.getElementById('representativesList').innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                Enter a zip code above to find your representatives!
            </div>
        `;
        
        // Clear the zip code field in Step 2
        const newRepZipCode = document.getElementById('newRepZipCode');
        if (newRepZipCode) {
            newRepZipCode.value = '';
        }
    } catch (error) {
        console.error('Error in loadInitialRepresentatives:', error);
    }
}

// Display representatives in the UI
function displayRepresentatives(representatives) {
    const container = document.getElementById('representativesList');
    const addRepButtonContainer = document.getElementById('addRepButtonContainer');
    const addRepFormContainer = document.getElementById('addRepFormContainer');
    
    if (representatives.length === 0) {
        container.innerHTML = `
            <div class="alert alert-success">
                <i class="fas fa-star me-2"></i>
                <strong>Congratulations!</strong> You're the first user from this Zip Code. Please extend the dataset by adding your representative's information below!
            </div>
        `;
        // Show the add rep form for new zip codes
        addRepButtonContainer.style.display = 'none';
        addRepFormContainer.style.display = 'block';
        return;
    }
    
    // Hide the add rep form when representatives exist
    addRepButtonContainer.style.display = 'block';
    addRepFormContainer.style.display = 'none';

    let html = `
        <div class="mb-3 d-flex gap-2">
            <button class="btn btn-outline-primary btn-sm" id="selectAllBtn" onclick="selectAllPhones()">
                <i class="fas fa-check-square me-1"></i>Select All
            </button>
            <button class="btn btn-outline-secondary btn-sm" id="deselectAllBtn" onclick="deselectAllPhones()">
                <i class="fas fa-square me-1"></i>Deselect All
            </button>
        </div>
    `;

    representatives.forEach(rep => {
        html += `
            <div class="representative-card mb-3" id="rep-${rep.id}">
                <div class="rep-header">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6>${rep.full_name} <span class="position-badge">${rep.display_position}</span></h6>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-outline-success btn-sm" onclick="showAddPhoneForm(${rep.id})">
                                <i class="fas fa-plus me-1"></i>
                                Add Phone
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="deleteRepresentative(${rep.id})">
                                <i class="fas fa-trash me-1"></i>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="phone-numbers-section">
                    <div class="phone-checkbox-group">
        `;
        
        rep.phone_numbers.forEach((phone, index) => {
            html += `
                <div class="phone-checkbox-item" id="phone-${rep.id}-${index}">
                    <div class="phone-row">
                        <div class="phone-content">
                            <input type="checkbox" id="radio-${rep.id}-${index}" 
                                   value="${rep.id}-${index}" onchange="selectPhoneNumber('${rep.id}', ${index}, '${rep.full_name}', '${phone.display_phone}', '${phone.phone_type}', '${phone.phone_link}', '${rep.display_position}')">
                            <label for="radio-${rep.id}-${index}">
                                <i class="fas fa-phone me-2"></i>
                                <span class="phone-type">${phone.phone_type}:</span>
                                <span class="phone-number">${phone.display_phone}</span>
                            </label>
                        </div>
                        <button class="delete-btn" onclick="deletePhoneNumber(${rep.id}, ${phone.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        // Add inline phone form
        html += `
            <div class="add-phone-form mt-3" id="add-phone-form-${rep.id}" style="display: none;">
                <div class="row g-2">
                    <div class="col-md-3">
                        <input type="text" class="form-control form-control-sm" placeholder="Phone" id="new-phone-${rep.id}">
                    </div>
                    <div class="col-md-2">
                        <input type="text" class="form-control form-control-sm" placeholder="Ext" id="new-extension-${rep.id}">
                    </div>
                    <div class="col-md-3">
                        <select class="form-control form-control-sm" id="new-phone-type-${rep.id}">
                            <option value="Main">Main</option>
                            <option value="DC Office">DC Office</option>
                            <option value="District Office">District Office</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="col-md-2">
                        <button class="btn btn-success btn-sm" onclick="addPhoneToRep(${rep.id})">
                            <i class="fas fa-plus"></i> Add
                        </button>
                    </div>
                    <div class="col-md-2">
                        <button class="btn btn-secondary btn-sm" onclick="hideAddPhoneForm(${rep.id})">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        html += `
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Add a new representative
function showAddRepForm() {
    const addRepButtonContainer = document.getElementById('addRepButtonContainer');
    const addRepFormContainer = document.getElementById('addRepFormContainer');
    
    addRepButtonContainer.style.display = 'none';
    addRepFormContainer.style.display = 'block';
}

function hideAddRepForm() {
    const addRepButtonContainer = document.getElementById('addRepButtonContainer');
    const addRepFormContainer = document.getElementById('addRepFormContainer');
    
    addRepButtonContainer.style.display = 'block';
    addRepFormContainer.style.display = 'none';
    
    // Clear the form fields
    document.getElementById('newRepZipCode').value = '';
    document.getElementById('newRepFirstName').value = '';
    document.getElementById('newRepLastName').value = '';
    document.getElementById('newRepPosition').value = 'Senator';
    document.getElementById('newRepCustomPosition').value = '';
    document.getElementById('newRepCustomPosition').style.display = 'none';
    
    // Clear phone numbers
    const phoneNumbersList = document.getElementById('phoneNumbersList');
    phoneNumbersList.innerHTML = `
        <div class="phone-number-entry row mb-2">
            <div class="col-md-3">
                <input type="text" class="form-control" placeholder="Phone (any format)" data-phone="phone">
            </div>
            <div class="col-md-2">
                <input type="text" class="form-control" placeholder="Extension" data-phone="extension">
            </div>
            <div class="col-md-3">
                <select class="form-control" data-phone="type" onchange="toggleCustomPhoneType(this)">
                    <option value="Main">Main</option>
                    <option value="DC Office">DC Office</option>
                    <option value="District Office">District Office</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div class="col-md-2">
                <input type="text" class="form-control" placeholder="Custom Label" data-phone="custom-type" style="display: none;">
            </div>
            <div class="col-md-2">
                <button class="btn btn-outline-danger btn-sm" onclick="removePhoneNumber(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

function addRepresentative() {
    const firstName = document.getElementById('newRepFirstName').value.trim();
    const lastName = document.getElementById('newRepLastName').value.trim();
    const position = document.getElementById('newRepPosition').value;
    const customPosition = document.getElementById('newRepCustomPosition').value.trim();
    
    if (!firstName || !lastName) {
        alert('Please enter both first and last name.');
        return;
    }
    
    const finalPosition = position === 'Other' ? customPosition : position;
    if (position === 'Other' && !customPosition) {
        alert('Please enter a custom position.');
        return;
    }
    
    const fullName = `${firstName} ${lastName}`;
    
    // Collect phone numbers from the form
    const phoneEntries = document.querySelectorAll('.phone-number-entry');
    const phones = [];
    
    phoneEntries.forEach(entry => {
        const phoneInput = entry.querySelector('[data-phone="phone"]');
        const extensionInput = entry.querySelector('[data-phone="extension"]');
        const typeSelect = entry.querySelector('[data-phone="type"]');
        const customTypeInput = entry.querySelector('[data-phone="custom-type"]');
        
        const phone = phoneInput.value.trim();
        const extension = extensionInput.value.trim();
        let phoneType = typeSelect.value;
        
        // Handle custom phone type
        if (phoneType === 'Other' && customTypeInput.style.display !== 'none') {
            phoneType = customTypeInput.value.trim();
        }
        
        if (phone) {
            phones.push({
                phone: phone,
                extension: extension,
                phone_type: phoneType
            });
        }
    });
    
    // Get zip code from either Step 1 or the new input field
    const step1ZipCode = document.getElementById('zipCode').value.trim();
    const step2ZipCode = document.getElementById('newRepZipCode').value.trim();
    const zipCode = step2ZipCode || step1ZipCode;
    
    if (!zipCode) {
        alert('Please enter a zip code either in Step 1 or in the zip code field above.');
        return;
    }
    
    fetch('/api/representatives', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: fullName,
            position: finalPosition,
            zip_code: zipCode,
            phones: phones
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        // Clear form
        document.getElementById('newRepFirstName').value = '';
        document.getElementById('newRepLastName').value = '';
        document.getElementById('newRepPosition').value = 'Senator';
        document.getElementById('newRepCustomPosition').value = '';
        document.getElementById('newRepCustomPosition').style.display = 'none';
        document.getElementById('newRepZipCode').value = '';
        
        // Clear phone number fields
        const phoneEntries = document.querySelectorAll('.phone-number-entry');
        phoneEntries.forEach(entry => {
            const phoneInput = entry.querySelector('[data-phone="phone"]');
            const extensionInput = entry.querySelector('[data-phone="extension"]');
            const typeSelect = entry.querySelector('[data-phone="type"]');
            const customTypeInput = entry.querySelector('[data-phone="custom-type"]');
            
            if (phoneInput) phoneInput.value = '';
            if (extensionInput) extensionInput.value = '';
            if (typeSelect) typeSelect.value = 'Main';
            if (customTypeInput) {
                customTypeInput.value = '';
                customTypeInput.style.display = 'none';
            }
        });
        
        // Hide the form and reload representatives
        hideAddRepForm();
        loadRepresentatives();
        showAlert('Representative added successfully!', 'success');
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Error adding representative: ' + error.message, 'danger');
    });
}

// Toggle custom position field
function toggleCustomPosition() {
    const position = document.getElementById('newRepPosition').value;
    const customField = document.getElementById('newRepCustomPosition');
    
    if (position === 'Other') {
        customField.style.display = 'block';
        customField.required = true;
    } else {
        customField.style.display = 'none';
        customField.required = false;
    }
}

// Add phone number entry row
function addPhoneNumber() {
    const container = document.getElementById('phoneNumbersList');
    const newRow = document.createElement('div');
    newRow.className = 'phone-number-entry row mb-2';
    newRow.innerHTML = `
        <div class="col-md-3">
            <input type="text" class="form-control" placeholder="Phone (any format)" data-phone="phone">
        </div>
        <div class="col-md-2">
            <input type="text" class="form-control" placeholder="Extension" data-phone="extension">
        </div>
        <div class="col-md-3">
            <select class="form-control" data-phone="type" onchange="toggleCustomPhoneType(this)">
                <option value="Main">Main</option>
                <option value="DC Office">DC Office</option>
                <option value="District Office">District Office</option>
                <option value="Other">Other</option>
            </select>
        </div>
        <div class="col-md-2">
            <input type="text" class="form-control" placeholder="Custom Label" data-phone="custom-type" style="display: none;">
        </div>
        <div class="col-md-2">
            <button class="btn btn-outline-danger btn-sm" onclick="removePhoneNumber(this)">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    container.appendChild(newRow);
}

// Remove phone number entry row
function removePhoneNumber(button) {
    button.closest('.phone-number-entry').remove();
}

// Toggle custom phone type field
function toggleCustomPhoneType(select) {
    const row = select.closest('.phone-number-entry');
    const customField = row.querySelector('[data-phone="custom-type"]');
    
    if (select.value === 'Other') {
        customField.style.display = 'block';
        customField.required = true;
    } else {
        customField.style.display = 'none';
        customField.required = false;
    }
}


// Show add phone form for a representative
function showAddPhoneForm(repId) {
    const form = document.getElementById(`add-phone-form-${repId}`);
    if (form) {
        form.style.display = 'block';
    }
}

// Hide add phone form for a representative
function hideAddPhoneForm(repId) {
    const form = document.getElementById(`add-phone-form-${repId}`);
    if (form) {
        form.style.display = 'none';
        // Clear the form
        document.getElementById(`new-phone-${repId}`).value = '';
        document.getElementById(`new-extension-${repId}`).value = '';
        document.getElementById(`new-phone-type-${repId}`).value = 'Main';
    }
}

// Add phone to representative using inline form
function addPhoneToRep(repId) {
    const phone = document.getElementById(`new-phone-${repId}`).value.trim();
    const extension = document.getElementById(`new-extension-${repId}`).value.trim();
    const type = document.getElementById(`new-phone-type-${repId}`).value;
    
    if (!phone) {
        showAlert('Please enter a phone number', 'danger');
        return;
    }
    
    const phoneData = {
        phone: phone,
        extension: extension,
        phone_type: type
    };
    
    fetch('/api/representatives/' + repId + '/phones', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(phoneData)
    })
    .then(response => response.json())
    .then(data => {
        // Hide the form
        hideAddPhoneForm(repId);
        
        // Reload representatives
        loadRepresentatives();
        showAlert('Phone number added successfully!', 'success');
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Error adding phone number. Please try again.', 'danger');
    });
}

// Delete representative
function deleteRepresentative(repId) {
    if (confirm('Are you sure you want to delete this representative?')) {
        fetch('/api/representatives/' + repId, {
            method: 'DELETE'
        })
        .then(response => {
            if (response.ok) {
                loadRepresentatives();
                showAlert('Representative deleted successfully!', 'success');
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Error deleting representative: ' + error.message, 'danger');
        });
    }
}

// Delete phone number
function deletePhoneNumber(repId, phoneId) {
    if (confirm('Are you sure you want to delete this phone number?')) {
        fetch('/api/representatives/' + repId + '/phones/' + phoneId, {
            method: 'DELETE'
        })
        .then(response => {
            if (response.ok) {
                loadRepresentatives();
                showAlert('Phone number deleted successfully!', 'success');
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Error deleting phone number: ' + error.message, 'danger');
        });
    }
}

// Load scripts (global)
async function loadScripts() {
    try {
        const response = await fetch('/api/scripts');
        const scripts = await response.json();
        displayScripts(scripts);
    } catch (error) {
        console.error('Error loading scripts:', error);
        showAlert('Error loading scripts. Please try again.', 'error');
    }
}

// Display scripts in the UI
function displayScripts(scripts) {
    const container = document.getElementById('scriptsList');

    if (scripts.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No scripts saved yet. Create your first script!
            </div>
        `;
        return;
    }

    allScripts = scripts; // Store all scripts globally

    let html = '<div class="script-radio-group">';

    scripts.forEach(script => {
        // Process reference parameters for full content
        const processedContent = processScriptReferences(script.content);
        
                html += `
            <div class="script-radio-item" id="script-${script.id}" onclick="selectScriptById('${script.id}')">
                <input type="radio" name="scriptSelection" id="radio-script-${script.id}"
                       value="${script.id}" onchange="selectScriptById('${script.id}')">
                <div class="script-radio-content">
                    <div class="script-title">${script.title}</div>
                    <div class="script-actions">
                        <div class="script-action-links">
                            <button class="btn btn-link btn-sm p-0 me-2" onclick="toggleScriptExpand(${script.id}); event.stopPropagation();" id="toggle-${script.id}">
                                <i class="fas fa-chevron-down"></i> Show
                            </button>
                            <button class="btn btn-link btn-sm p-0 me-2" onclick="editScript(${script.id}); event.stopPropagation();">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-outline-danger btn-sm p-0" onclick="event.stopPropagation(); deleteScript(${script.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="script-full" id="full-${script.id}" style="display: none;">${processedContent.replace(/\n/g, '<br>')}</div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// Handle script selection by ID (safer approach)
function selectScriptById(scriptId) {
    // Find the script data from the global allScripts array
    const script = allScripts.find(s => s.id == scriptId);

    if (script) {
        selectedCallScript = {
            id: script.id,
            title: script.title,
            content: script.content // Use full content directly from the stored object
        };
        // Remove previous script selections
        document.querySelectorAll('.script-radio-item').forEach(item => {
            item.classList.remove('selected');
        });
        // Add selection to current script
        const currentScriptItem = document.getElementById(`script-${scriptId}`);
        if (currentScriptItem) {
            currentScriptItem.classList.add('selected');
            const radio = currentScriptItem.querySelector(`input[value="${scriptId}"]`);
            if (radio) radio.checked = true; // Ensure radio button is checked
        }
        updateCallInfo();
    } else {
        console.error('Script not found in allScripts:', scriptId);
        selectedCallScript = null; // Clear selection if not found
        updateCallInfo();
    }
}

// Save a new script
async function saveScript() {
    const title = document.getElementById('scriptTitle').value.trim();
    const content = document.getElementById('scriptContent').value.trim();
    
    if (!title || !content) {
        showAlert('Please fill in title and content', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/scripts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title,
                content: content
            })
        });
        
        if (response.ok) {
            const newScript = await response.json();
            showAlert('Script saved successfully!', 'success');
            
            // Clear form
            document.getElementById('scriptTitle').value = '';
            document.getElementById('scriptContent').value = '';
            
            // Reload scripts
            loadScripts();
        } else {
            showAlert('Error saving script. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error saving script:', error);
        showAlert('Error saving script. Please try again.', 'error');
    }
}

// Delete a script
async function deleteScript(scriptId) {
    if (!confirm('Are you sure you want to delete this script?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/scripts/${scriptId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('Script deleted successfully!', 'success');
            loadScripts(currentZipCode);
        } else {
            showAlert('Error deleting script. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error deleting script:', error);
        showAlert('Error deleting script. Please try again.', 'error');
    }
}

// Toggle script expand/collapse
function toggleScriptExpand(scriptId) {
    const full = document.getElementById(`full-${scriptId}`);
    const toggle = document.getElementById(`toggle-${scriptId}`);
    
    if (full.style.display === 'none') {
        // Expand
        full.style.display = 'block';
        toggle.innerHTML = '<i class="fas fa-chevron-up"></i> Hide';
    } else {
        // Collapse
        full.style.display = 'none';
        toggle.innerHTML = '<i class="fas fa-chevron-down"></i> Show';
    }
}

// Edit an existing script
function editScript(scriptId) {
    const script = allScripts.find(s => s.id === scriptId);
    if (!script) return;
    
    // Populate form
    document.getElementById('scriptTitle').value = script.title;
    document.getElementById('scriptContent').value = script.content;
    
    // Change button to update mode
    const saveButton = document.getElementById('saveScriptBtn');
    saveButton.innerHTML = 'Update Script';
    saveButton.onclick = () => updateScript(scriptId);
    
    // Set editing state
    editingScriptId = scriptId;
    
    // Scroll to form
    document.getElementById('scriptTitle').scrollIntoView({ behavior: 'smooth' });
}

// Update an existing script
function updateScript(scriptId) {
    const title = document.getElementById('scriptTitle').value.trim();
    const content = document.getElementById('scriptContent').value.trim();
    
    if (!title || !content) {
        alert('Please fill in both title and content');
        return;
    }
    
    fetch(`/api/scripts/${scriptId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Reset form
            document.getElementById('scriptTitle').value = '';
            document.getElementById('scriptContent').value = '';
            
            // Reset button to original state
            const saveButton = document.getElementById('saveScriptBtn');
            saveButton.innerHTML = 'Save Script';
            saveButton.onclick = saveScript;
            
            // Clear editing state
            editingScriptId = null;
            
            // Reload scripts
            loadScripts();
            
            alert('Script updated successfully!');
        } else {
            alert('Error updating script');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error updating script');
    });
}

// Global variables for call workflow
let selectedCallRep = null;
let selectedCallPhone = null;
let selectedCallScript = null;
let allScripts = []; // New global variable
let selectedPhones = []; // Array to store all selected phone numbers
let sessionId = generateSessionId(); // Unique session ID for call logging
let currentCallLog = null; // Current call being logged
let editingScriptId = null;
let currentCallIndex = 0; // Index of current call in the queue
let callQueue = []; // Array of pending calls

// Generate a unique session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Toggle failure reason field visibility
function toggleFailureReason() {
    const outcome = document.getElementById('callOutcome').value;
    const failureDiv = document.getElementById('failureReasonDiv');
    const failureReason = document.getElementById('failureReason');
    
    if (outcome === 'failed') {
        failureDiv.style.display = 'block';
        failureReason.required = true;
    } else {
        failureDiv.style.display = 'none';
        failureReason.required = false;
    }
}

// Open call logging modal
function openCallLogModal(repId, phoneIndex) {
    const phone = selectedPhones.find(p => p.repId === repId && p.phoneIndex === phoneIndex);
    if (!phone) {
        console.error('Phone not found in openCallLogModal');
        return;
    }
    
    // Store current call info
    currentCallLog = {
        repId: repId,
        phoneIndex: phoneIndex,
        phone: phone
    };
    
    // Check if modal element exists
    const modalElement = document.getElementById('callLogModal');
    if (!modalElement) {
        console.error('callLogModal element not found!');
        return;
    }
    
    // Populate modal fields
    const repNameElement = document.getElementById('logRepName');
    const phoneNumberElement = document.getElementById('logPhoneNumber');
    const scriptTitleElement = document.getElementById('logScriptTitle');
    
    if (repNameElement) repNameElement.textContent = phone.repName;
    if (phoneNumberElement) phoneNumberElement.textContent = `${phone.phone_type}: ${phone.display_phone}`;
    if (scriptTitleElement) scriptTitleElement.textContent = selectedCallScript ? `Script: ${selectedCallScript.title}` : 'No script used';
    
    // Set default datetime to now
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const dateTimeElement = document.getElementById('callDateTime');
    if (dateTimeElement) dateTimeElement.value = localDateTime;
    
    // Reset form
    const outcomeElement = document.getElementById('callOutcome');
    const failureReasonElement = document.getElementById('failureReason');
    const callNotesElement = document.getElementById('callNotes');
    
    if (outcomeElement) outcomeElement.value = 'person';
    if (failureReasonElement) failureReasonElement.value = '';
    if (callNotesElement) callNotesElement.value = '';
    
    toggleFailureReason();
    
    // Check if we're in streamlined workflow mode
    const isStreamlinedMode = callQueue.length > 0 && currentCallIndex < callQueue.length;
    const saveButton = document.getElementById('callLogModal').querySelector('button[onclick="saveCallLog()"]');
    
    if (isStreamlinedMode) {
        // Use streamlined workflow
        saveButton.onclick = saveCallLogStreamlined;
        saveButton.innerHTML = '<i class="fas fa-save me-2"></i>Save & Continue';
    } else {
        // Use regular workflow
        saveButton.onclick = saveCallLog;
        saveButton.innerHTML = '<i class="fas fa-save me-2"></i>Save Call Log';
    }
    
    // Open modal
    try {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    } catch (error) {
        console.error('Error opening modal:', error);
    }
}

// Save call log
function saveCallLog() {
    if (!currentCallLog) return;
    
    const phone = currentCallLog.phone;
    const callDateTime = document.getElementById('callDateTime').value;
    const callOutcome = document.getElementById('callOutcome').value;
    const failureReason = document.getElementById('failureReason').value;
    const callNotes = document.getElementById('callNotes').value;
    
    // Combine notes
    let combinedNotes = callNotes;
    if (callOutcome === 'failed' && failureReason) {
        combinedNotes = `Failed: ${failureReason}${callNotes ? '\n\n' + callNotes : ''}`;
    }
    
    const callLogData = {
        user_id: 'default_user', // For future multi-user support
        representative_name: phone.repName,
        phone_number: phone.display_phone,
        phone_type: phone.phone_type,
        call_datetime: callDateTime + ':00Z', // Add seconds and timezone
        call_outcome: callOutcome,
        call_notes: combinedNotes,
        script_id: selectedCallScript ? selectedCallScript.id : null,
        script_title: selectedCallScript ? selectedCallScript.title : '',
        session_id: sessionId,
        is_test_data: document.getElementById('isTestData').checked
    };
    
    fetch('/api/call-logs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(callLogData)
    })
    .then(response => response.json())
            .then(data => {
            if (data.success) {
                // Mark call as completed
                phone.status = 'completed';
                updateCallInfo();
                
                // Ensure script display is maintained
                updateFullScriptDisplay();
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('callLogModal'));
                modal.hide();
                
                // Show success message
                showAlert('Call logged successfully!', 'success');
            } else {
                showAlert('Error logging call: ' + data.error, 'danger');
            }
        })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Error logging call. Please try again.', 'danger');
    });
}

// Load call analytics data
function loadCallAnalytics() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const outcomeFilter = document.getElementById('outcomeFilter').value;
    const includeTestData = document.getElementById('includeTestData').checked;
    
    // Convert dates to ISO format for API
    const startDateTime = startDate ? new Date(startDate + 'T00:00:00Z').toISOString() : '';
    const endDateTime = endDate ? new Date(endDate + 'T23:59:59Z').toISOString() : '';
    
    // Build query parameters
    const params = new URLSearchParams();
    if (startDateTime) params.append('start_date', startDateTime);
    if (endDateTime) params.append('end_date', endDateTime);
    if (outcomeFilter) params.append('outcome', outcomeFilter);
    params.append('include_test_data', includeTestData.toString());
    
    const queryString = params.toString();
    
    // Fetch call logs
    fetch(`/api/call-logs?${queryString}`)
        .then(response => response.json())
        .then(data => {
            // Handle both direct array and wrapped object responses
            const callLogs = data.call_logs || data;
            displayCallLogs(callLogs);
        })
        .catch(error => {
            console.error('Error loading call logs:', error);
        });
    
    // Fetch statistics
    fetch(`/api/call-logs/stats?${queryString}`)
        .then(response => response.json())
        .then(stats => {
            displayCallStats(stats);
        })
        .catch(error => {
            console.error('Error loading stats:', error);
        });
}

// Display call statistics
function displayCallStats(stats) {
    // Populate statistics cards
    const statsContainer = document.getElementById('statsCards');
    statsContainer.innerHTML = `
        <div class="col-md-3">
            <div class="card text-center">
                <div class="card-body">
                    <h3 class="text-primary">${stats.total_calls || 0}</h3>
                    <p class="card-text">Total Calls</p>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card text-center">
                <div class="card-body">
                    <h3 class="text-success">${stats.calls_by_outcome.person || 0}</h3>
                    <p class="card-text">Spoke to Person</p>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card text-center">
                <div class="card-body">
                    <h3 class="text-warning">${stats.calls_by_outcome.voicemail || 0}</h3>
                    <p class="card-text">Left Voicemail</p>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card text-center">
                <div class="card-body">
                    <h3 class="text-danger">${stats.calls_by_outcome.failed || 0}</h3>
                    <p class="card-text">Failed Calls</p>
                </div>
            </div>
        </div>
    `;
    
    // Create charts
    createOutcomeChart(stats.calls_by_outcome);
    createDateChart(stats.calls_by_date);
    createRepChart(stats.calls_by_rep);
    createScriptChart(stats.calls_by_script);
}

// Create outcome pie chart
function createOutcomeChart(outcomeData) {
    const canvas = document.getElementById('outcomeChart');
    if (!canvas) {
        console.error('outcomeChart canvas not found!');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get 2D context for outcomeChart');
        return;
    }
    
    // Destroy existing chart if it exists
    if (window.outcomeChart && typeof window.outcomeChart.destroy === 'function') {
        window.outcomeChart.destroy();
    }
    
    const labels = Object.keys(outcomeData);
    const data = Object.values(outcomeData);
    const colors = ['#28a745', '#ffc107', '#dc3545', '#6c757d'];
    
    try {
        window.outcomeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels.map(label => label.charAt(0).toUpperCase() + label.slice(1)),
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 10,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating outcome chart:', error);
    }
}

// Create date line chart
function createDateChart(dateData) {
    const canvas = document.getElementById('dateChart');
    if (!canvas) {
        console.error('dateChart canvas not found!');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get 2D context for dateChart');
        return;
    }
    
    // Destroy existing chart if it exists
    if (window.dateChart && typeof window.dateChart.destroy === 'function') {
        window.dateChart.destroy();
    }
    
    // Sort dates
    const sortedDates = Object.keys(dateData).sort();
    const data = sortedDates.map(date => dateData[date]);
    
    try {
        window.dateChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedDates.map(date => new Date(date).toLocaleDateString()),
                datasets: [{
                    label: 'Calls Made',
                    data: data,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating date chart:', error);
    }
}

// Create representative bar chart
function createRepChart(repData) {
    const canvas = document.getElementById('repChart');
    if (!canvas) {
        console.error('repChart canvas not found!');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get 2D context for repChart');
        return;
    }
    
    // Destroy existing chart if it exists
    if (window.repChart && typeof window.repChart.destroy === 'function') {
        window.repChart.destroy();
    }
    
    const labels = Object.keys(repData);
    const data = Object.values(repData);
    
    try {
        window.repChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Calls Made',
                    data: data,
                    backgroundColor: 'rgba(54, 162, 235, 0.8)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating rep chart:', error);
    }
}

// Create script pie chart
function createScriptChart(scriptData) {
    const canvas = document.getElementById('scriptChart');
    if (!canvas) {
        console.error('scriptChart canvas not found!');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get 2D context for scriptChart');
        return;
    }
    
    // Destroy existing chart if it exists
    if (window.scriptChart && typeof window.scriptChart.destroy === 'function') {
        window.scriptChart.destroy();
    }
    
    const labels = Object.keys(scriptData);
    const data = Object.values(scriptData);
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
    
    try {
        window.scriptChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 10,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating script chart:', error);
    }
}

// Display call logs in table
function displayCallLogs(callLogs) {
    const tbody = document.getElementById('callLogTableBody');
    
    if (callLogs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No call logs found for the selected criteria.</td></tr>';
        return;
    }
    
    tbody.innerHTML = callLogs.map(log => `
        <tr class="${log.is_test_data ? 'table-warning' : ''}">
            <td>
                ${new Date(log.call_datetime).toLocaleString()}
                ${log.is_test_data ? '<br><small class="text-warning"><i class="fas fa-flask"></i> Test Data</small>' : ''}
            </td>
            <td>${log.representative_name}</td>
            <td>${log.phone_number}</td>
            <td>
                <span class="badge ${getOutcomeBadgeClass(log.call_outcome)}">
                    ${log.call_outcome.charAt(0).toUpperCase() + log.call_outcome.slice(1)}
                </span>
            </td>
            <td>${log.script_title || 'No Script'}</td>
            <td>
                ${log.call_notes ? 
                    `<button class="btn btn-sm btn-outline-info" onclick="showCallNotes('${log.call_notes.replace(/'/g, "\\'")}')">
                        <i class="fas fa-eye"></i> View
                    </button>` : 
                    '<span class="text-muted">No notes</span>'
                }
            </td>
        </tr>
    `).join('');
}

// Get badge class for outcome
function getOutcomeBadgeClass(outcome) {
    switch (outcome) {
        case 'person': return 'bg-success';
        case 'voicemail': return 'bg-warning';
        case 'failed': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

// Show call notes in modal
function showCallNotes(notes) {
    alert('Call Notes:\n\n' + notes);
}

// Initialize analytics when tab is shown
document.addEventListener('DOMContentLoaded', function() {
    // Load analytics when Analyze Calls tab is clicked
    document.getElementById('analyze-calls-tab').addEventListener('click', function() {
        setTimeout(loadCallAnalytics, 100); // Small delay to ensure tab is active
    });
    
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    document.getElementById('startDate').value = thirtyDaysAgo.toISOString().split('T')[0];
    document.getElementById('endDate').value = today.toISOString().split('T')[0];
});

// Select all phone numbers
function selectAllPhones() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        // Trigger the onchange event to update selectedPhones array
        checkbox.dispatchEvent(new Event('change'));
    });
    
    // Update button states
    updateSelectAllButtonStates();
}

// Deselect all phone numbers
function deselectAllPhones() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        // Trigger the onchange event to update selectedPhones array
        checkbox.dispatchEvent(new Event('change'));
    });
    
    // Update button states
    updateSelectAllButtonStates();
}

// Update Select All/Deselect All button states
function updateSelectAllButtonStates() {
    const selectAllBtn = document.getElementById('selectAllBtn');
    const deselectAllBtn = document.getElementById('deselectAllBtn');
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const checkedBoxes = document.querySelectorAll('input[type="checkbox"]:checked');
    
    if (selectAllBtn && deselectAllBtn) {
        if (checkedBoxes.length === 0) {
            // No phones selected
            selectAllBtn.classList.remove('btn-primary');
            selectAllBtn.classList.add('btn-outline-primary');
            deselectAllBtn.classList.remove('btn-secondary');
            deselectAllBtn.classList.add('btn-outline-secondary');
        } else if (checkedBoxes.length === checkboxes.length) {
            // All phones selected
            selectAllBtn.classList.remove('btn-outline-primary');
            selectAllBtn.classList.add('btn-primary');
            deselectAllBtn.classList.remove('btn-secondary');
            deselectAllBtn.classList.add('btn-outline-secondary');
        } else {
            // Some phones selected
            selectAllBtn.classList.remove('btn-primary');
            selectAllBtn.classList.add('btn-outline-primary');
            deselectAllBtn.classList.remove('btn-outline-secondary');
            deselectAllBtn.classList.add('btn-secondary');
        }
    }
}

// Handle phone number selection (now supports multiple selections)
function selectPhoneNumber(repId, phoneIndex, repName, phoneNumber, phoneType, phoneLink, repPosition) {
    const phoneKey = `${repId}-${phoneIndex}`;
    const phoneData = {
        repId: repId,
        phoneIndex: phoneIndex,
        repName: repName,
        repPosition: repPosition,
        display_phone: phoneNumber,
        phone_link: phoneLink,
        phone_type: phoneType,
        status: 'pending' // pending, active, completed
    };
    
    const checkbox = document.getElementById(`radio-${repId}-${phoneIndex}`);
    
    if (checkbox.checked) {
        // Add to selected phones if not already there
        if (!selectedPhones.find(p => p.repId === repId && p.phoneIndex === phoneIndex)) {
            selectedPhones.push(phoneData);
        }
    } else {
        // Remove from selected phones
        selectedPhones = selectedPhones.filter(p => !(p.repId === repId && p.phoneIndex === phoneIndex));
    }
    
    // Update visual feedback
    updatePhoneSelectionVisual(repId, phoneIndex, checkbox.checked);
    
    // Update Select All button states
    updateSelectAllButtonStates();
    
    // Update Step 4 display
    updateCallInfo();
}

// Update visual feedback for phone selection
function updatePhoneSelectionVisual(repId, phoneIndex, isSelected) {
    const phoneItem = document.getElementById(`phone-${repId}-${phoneIndex}`);
    if (phoneItem) {
        if (isSelected) {
            phoneItem.classList.add('selected');
        } else {
            phoneItem.classList.remove('selected');
        }
    }
}

// Show call section when representatives are loaded
function showCallSection() {
    document.getElementById('callSection').style.display = 'block';
}



// Update call information display
function updateCallInfo() {
    // Always update the main rep list to show real-time status
    updateCallRepInfo();
    updateFullScriptDisplay();
    updateCallButton();
    updateNextCallWorkflow();
}

// Update representative info in Step 4 using same tile as Step 2
function updateCallRepInfo() {
    const repInfo = document.getElementById('callRepInfo');
    const compactContainer = document.getElementById('compactRepList');

    if (selectedPhones.length > 0) {
        let html = '<div class="selected-reps-container">';
        
        // Group phones by representative
        const repsByPhone = {};
        selectedPhones.forEach(phone => {
            if (!repsByPhone[phone.repId]) {
                repsByPhone[phone.repId] = {
                    repName: phone.repName,
                    repPosition: phone.repPosition,
                    phones: []
                };
            }
            repsByPhone[phone.repId].phones.push(phone);
        });
        
        // Create tiles for each representative
        Object.keys(repsByPhone).forEach(repId => {
            const rep = repsByPhone[repId];
            html += `
                <div class="representative-tile mb-3">
                    <div class="rep-header">
                        <h6 class="mb-2">${rep.repName} <span class="position-badge">${rep.repPosition}</span></h6>
                    </div>
                    <div class="phone-list">
            `;
            
            rep.phones.forEach(phone => {
                const statusClass = getStatusClass(phone.status);
                const statusIcon = getStatusIcon(phone.status);
                
                html += `
                    <div class="phone-item ${statusClass}" id="call-phone-${phone.repId}-${phone.phoneIndex}">
                        <div class="phone-info">
                            <i class="fas fa-phone me-2"></i>
                            <span class="phone-type">${phone.phone_type}:</span>
                            <span class="phone-number">${phone.display_phone}</span>
                        </div>
                        <div class="phone-actions">
                            <span class="status-badge ${statusClass}">
                                <i class="${statusIcon}"></i>
                                ${phone.status.charAt(0).toUpperCase() + phone.status.slice(1)}
                            </span>
                            ${phone.status === 'pending' ? `
                                <button class="btn btn-primary btn-sm ms-2" onclick="setPhoneActive('${phone.repId}', ${phone.phoneIndex})">
                                    <i class="fas fa-play"></i> Start Call
                                </button>
                            ` : ''}
                            ${phone.status === 'active' ? `
                                <button class="btn btn-success btn-sm ms-2" onclick="completePhoneCall('${phone.repId}', ${phone.phoneIndex})">
                                    <i class="fas fa-check"></i> Complete
                                </button>
                            ` : ''}
                            ${phone.status === 'completed' ? `
                                <button class="btn btn-warning btn-sm ms-2" onclick="resetPhoneCall('${phone.repId}', ${phone.phoneIndex})">
                                    <i class="fas fa-undo"></i> Reset
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        repInfo.innerHTML = html;
        
        // Update compact display
        let compactHtml = '';
        Object.values(repsByPhone).forEach(rep => {
            compactHtml += `
                <div class="compact-rep-item">
                    <span class="compact-rep-name">${rep.repName}</span>
                    <span class="compact-rep-type">${rep.repPosition}</span>
                </div>
            `;
        });
        compactContainer.innerHTML = compactHtml;
    } else {
        repInfo.innerHTML = '<p class="text-muted">No phone numbers selected</p>';
        compactContainer.innerHTML = '<p class="text-muted">No phone numbers selected</p>';
    }
}

// Get CSS class for phone status
function getStatusClass(status) {
    switch (status) {
        case 'pending': return 'status-pending';
        case 'active': return 'status-active';
        case 'completed': return 'status-completed';
        default: return 'status-pending';
    }
}

// Get icon for phone status
function getStatusIcon(status) {
    switch (status) {
        case 'pending': return 'fas fa-clock';
        case 'active': return 'fas fa-phone-alt';
        case 'completed': return 'fas fa-check-circle';
        default: return 'fas fa-clock';
    }
}

// Set phone as active (currently being called)
function setPhoneActive(repId, phoneIndex) {
    const phone = selectedPhones.find(p => p.repId === repId && p.phoneIndex === phoneIndex);
    if (phone) {
        // Set all other phones back to pending
        selectedPhones.forEach(p => {
            if (p.status === 'active') {
                p.status = 'pending';
            }
        });
        
        // Set this phone as active
        phone.status = 'active';
        
        // Update the call button to use this phone
        selectedCallPhone = phone;
        
        updateCallInfo();
    }
}

// Complete a phone call
function completePhoneCall(repId, phoneIndex) {
    // Find the phone in selectedPhones
    const phone = selectedPhones.find(p => p.repId === repId && p.phoneIndex === phoneIndex);
    
    if (!phone) {
        console.error('Phone not found in selectedPhones');
        return;
    }
    
    // Open call logging modal instead of just marking as completed
    openCallLogModal(repId, phoneIndex);
}

// Reset a phone call to pending
function resetPhoneCall(repId, phoneIndex) {
    const phone = selectedPhones.find(p => p.repId === repId && p.phoneIndex === phoneIndex);
    if (phone) {
        phone.status = 'pending';
        updateCallInfo();
    }
}

// Process reference parameters in script content
function processScriptReferences(scriptContent, activePhone = null) {
    if (!scriptContent) return scriptContent;
    
    let processedContent = scriptContent;
    
    // Get current zip code
    const zipCode = document.getElementById('zipCode').value || 'Not set';
    
    if (activePhone) {
        // Extract last name from representative name
        const repNameParts = activePhone.repName.split(' ');
        const lastName = repNameParts[repNameParts.length - 1] || activePhone.repName;
        
        // Replace reference parameters
        processedContent = processedContent
            .replace(/@RepType/g, activePhone.repPosition)
            .replace(/@LastName/g, lastName)
            .replace(/@ZipCode/g, zipCode);
    } else {
        // If no active phone, just replace zip code
        processedContent = processedContent.replace(/@ZipCode/g, zipCode);
    }
    
    return processedContent;
}

// Update full script display in Step 4
function updateFullScriptDisplay() {
    console.log('updateFullScriptDisplay called');
    console.log('selectedCallScript:', selectedCallScript);
    console.log('callQueue.length:', callQueue.length);
    console.log('currentCallIndex:', currentCallIndex);
    
    // Make sure Step 4 is visible
    const callSection = document.getElementById('callSection');
    if (callSection) {
        callSection.style.display = 'block';
    }
    
    // Find the fullScriptDisplay div
    const fullScriptDisplay = document.getElementById('fullScriptDisplay');
    if (!fullScriptDisplay) {
        console.error('fullScriptDisplay not found');
        return;
    }
    
    // Ensure the script display section is always visible
    fullScriptDisplay.style.display = 'block';
    
    // Find or create the alert div inside fullScriptDisplay
    let alertDiv = fullScriptDisplay.querySelector('.alert.alert-info.script-display');
    if (!alertDiv) {
        // Create the alert div if it doesn't exist
        alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-info script-display';
        alertDiv.style.border = '2px solid #17a2b8';
        fullScriptDisplay.appendChild(alertDiv);
    }
    
    if (selectedCallScript) {
        // Get the current call from the queue for reference parameter processing
        let currentPhone = null;
        if (callQueue.length > 0 && currentCallIndex < callQueue.length) {
            currentPhone = callQueue[currentCallIndex];
        } else {
            // Fallback to active phone if no queue
            currentPhone = selectedPhones.find(p => p.status === 'active');
        }
        
        // Process reference parameters in the script content
        const processedContent = processScriptReferences(selectedCallScript.content, currentPhone);
        
        // Show the complete script with line breaks preserved
        const formattedContent = processedContent.replace(/\n/g, '<br>');
        alertDiv.innerHTML = `
            <h6><strong>${selectedCallScript.title}</strong></h6>
            <div class="script-content-full" style="max-height: 300px; overflow-y: auto; white-space: pre-wrap; text-align: left; padding-left: 0;">
                ${formattedContent}
            </div>
        `;
        
        // Ensure the alert div is visible
        alertDiv.style.display = 'block';
    } else {
        alertDiv.innerHTML = '<p class="text-muted">Select a script above to see the content here</p>';
        alertDiv.style.display = 'block';
    }
    
    // Set up a periodic check to ensure script display stays visible
    if (selectedCallScript && callQueue.length > 0) {
        setTimeout(() => {
            const scriptDisplay = document.getElementById('fullScriptDisplay');
            if (scriptDisplay && scriptDisplay.style.display === 'none') {
                console.log('Script display was hidden, restoring...');
                scriptDisplay.style.display = 'block';
                updateFullScriptDisplay();
            }
        }, 2000);
    }
}

// Update call button
function updateCallButton() {
    const workflowButton = document.getElementById('startWorkflowButton');
    const status = document.getElementById('callReadyStatus');

    // Check if we have multiple pending calls
    const pendingCalls = selectedPhones.filter(p => p.status === 'pending');
    const hasMultipleCalls = pendingCalls.length > 1;
    const hasActiveCall = selectedPhones.find(p => p.status === 'active');
    
    if (selectedPhones.length > 0 && selectedCallScript) {
        if (hasMultipleCalls && !hasActiveCall) {
            // Show workflow button for multiple calls
            workflowButton.style.display = 'inline-block';
            status.innerHTML = `
                <i class="fas fa-check-circle text-success me-2"></i>
                Ready to make ${selectedPhones.length} calls!
            `;
        } else if (hasActiveCall) {
            // Hide workflow button when there's an active call
            workflowButton.style.display = 'none';
            status.innerHTML = `
                <i class="fas fa-check-circle text-success me-2"></i>
                Ready to call ${hasActiveCall.repName} at ${hasActiveCall.display_phone}!
            `;
        } else {
            // Single pending call
            workflowButton.style.display = 'inline-block';
            status.innerHTML = `
                <i class="fas fa-check-circle text-success me-2"></i>
                Ready to make ${selectedPhones.length} call!
            `;
        }
    } else {
        workflowButton.style.display = 'none';
        let missingItems = [];
        if (selectedPhones.length === 0) missingItems.push('phone numbers');
        if (!selectedCallScript) missingItems.push('script');
        status.innerHTML = `Select phone numbers and a script above to enable calling (missing: ${missingItems.join(', ')}). <i class="fas fa-heart me-2"></i> <strong>Your representative wants to hear your voice!</strong> I can't simulate that (yet), so you'll have to make the calls and read the script yourself. <strong>You've got this!</strong> Just follow the workflow above and speak clearly.`;
    }
}

// Show alert messages
function showAlert(message, type) {
    // Remove existing alert messages (but not script displays)
    const existingAlertMessages = document.querySelectorAll('.alert-success, .alert-danger, .alert-warning, .alert-info:not(.script-display)');
    existingAlertMessages.forEach(alert => alert.remove());
    
    const alertClass = type === 'success' ? 'alert-success success-message' : 'alert-danger error-message';
    const icon = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
    
    const alertHtml = `
        <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
            <i class="${icon} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // Insert alert at the top of the container
    const container = document.querySelector('.container');
    container.insertAdjacentHTML('afterbegin', alertHtml);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const alert = document.querySelector('.alert');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

// Handle Enter key in zip code input
document.getElementById('zipCode').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        loadRepresentatives();
    }
});

// Update Step 2 zip code field when Step 1 zip code changes
document.getElementById('zipCode').addEventListener('input', function(e) {
    const step1ZipCode = e.target.value.trim();
    const newRepZipCode = document.getElementById('newRepZipCode');
    if (newRepZipCode && step1ZipCode) {
        newRepZipCode.value = step1ZipCode;
    }
});

// Handle Enter key in new representative form
document.getElementById('newRepFirstName').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addRepresentative();
    }
});

document.getElementById('newRepLastName').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addRepresentative();
    }
});

document.getElementById('newRepCustomPosition').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addRepresentative();
    }
});

// Handle Enter key in script form
document.getElementById('scriptTitle').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        saveScript();
    }
});

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    
    // Test if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded!');
    }
    
    // Check if elements exist
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const step4 = document.getElementById('step4');
    
    // Show all steps from the beginning
    if (step2) step2.style.display = 'block';
    if (step3) step3.style.display = 'block';
    if (step4) step4.style.display = 'block';
    
    // Also show callSection (Step 4) by default
    const callSection = document.getElementById('callSection');
    if (callSection) {
        callSection.style.display = 'block';
    } else {
        console.error('callSection not found!');
    }
    
    // Load initial data
    loadInitialRepresentatives();
    loadScripts();
    
    // Initialize session ID for call logging
    sessionId = generateSessionId();
    

    
    // Set up analytics tab event listener
    const analyticsTab = document.querySelector('a[data-bs-toggle="tab"][href="#analytics"]');
    if (analyticsTab) {
        analyticsTab.addEventListener('click', function() {
            loadCallAnalytics();
        });
    }
    
    // Set default date range for analytics (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const startDateElement = document.getElementById('startDate');
    const endDateElement = document.getElementById('endDate');
    
    if (startDateElement) startDateElement.value = startDate.toISOString().split('T')[0];
    if (endDateElement) endDateElement.value = endDate.toISOString().split('T')[0];
});

// Manual Script Form Functions
function showManualScriptForm() {
    document.getElementById('createOptions').style.display = 'none';
    document.getElementById('manualScriptForm').style.display = 'block';
}

// Hide manual script form
function hideManualScriptForm() {
    document.getElementById('createOptions').style.display = 'block';
    document.getElementById('manualScriptForm').style.display = 'none';
    // Clear form
    document.getElementById('scriptTitle').value = '';
    document.getElementById('scriptContent').value = '';
}

// AI Script Generation Functions
function openGenerateScriptModal() {
    // Reset the modal state
    document.getElementById('aiNotes').value = '';
    document.getElementById('generatedScriptTitle').value = '';
    document.getElementById('generatedScriptContent').value = '';
    
    // Show the notes step
    document.getElementById('aiNotesStep').style.display = 'block';
    document.getElementById('aiScriptStep').style.display = 'none';
    document.getElementById('aiLoadingStep').style.display = 'none';
    
    // Open the modal
    const modal = new bootstrap.Modal(document.getElementById('generateScriptModal'));
    modal.show();
}

function generateAIScript() {
    const notes = document.getElementById('aiNotes').value.trim();
    
    if (!notes) {
        alert('Please enter some notes about what you want to discuss.');
        return;
    }
    
    // Show loading state
    document.getElementById('aiNotesStep').style.display = 'none';
    document.getElementById('aiScriptStep').style.display = 'none';
    document.getElementById('aiLoadingStep').style.display = 'block';
    
    // Call the API
    fetch('/api/generate-script', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: notes })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (data.mode === 'local') {
                // Local mode - show generated script directly
                document.getElementById('generatedScriptContent').value = data.script;
                document.getElementById('generatedScriptTitle').value = data.title || 'AI Generated Script';
                
                document.getElementById('aiNotesStep').style.display = 'none';
                document.getElementById('aiScriptStep').style.display = 'block';
                document.getElementById('aiLoadingStep').style.display = 'none';
            } else {
                // External mode - show prompt for external AI tool
                showExternalAIPrompt(data.prompt, data.user_notes);
            }
        } else {
            alert('Error generating script: ' + (data.error || 'Unknown error'));
            // Go back to notes step
            document.getElementById('aiNotesStep').style.display = 'block';
            document.getElementById('aiScriptStep').style.display = 'none';
            document.getElementById('aiLoadingStep').style.display = 'none';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error generating script. Please try again.');
        // Go back to notes step
        document.getElementById('aiNotesStep').style.display = 'block';
        document.getElementById('aiScriptStep').style.display = 'none';
        document.getElementById('aiLoadingStep').style.display = 'none';
    });
}

function showExternalAIPrompt(prompt, userNotes) {
    // Create the external AI prompt step
    const modalBody = document.querySelector('#generateScriptModal .modal-body');
    
    // Hide all existing steps
    document.getElementById('aiNotesStep').style.display = 'none';
    document.getElementById('aiScriptStep').style.display = 'none';
    document.getElementById('aiLoadingStep').style.display = 'none';
    
    // Create external AI step if it doesn't exist
    let externalStep = document.getElementById('aiExternalStep');
    if (!externalStep) {
        externalStep = document.createElement('div');
        externalStep.id = 'aiExternalStep';
        modalBody.appendChild(externalStep);
    }
    
    externalStep.innerHTML = `
        <div class="text-center mb-4">
            <i class="fas fa-robot fa-3x text-primary mb-3"></i>
            <h5>Use External AI Tool</h5>
            <p class="text-muted">Copy the prompt below and paste it into ChatGPT or another AI tool, then copy the response back here.</p>
        </div>
        
        <div class="mb-3">
            <label class="form-label"><strong>Your Notes:</strong></label>
            <div class="alert alert-info">
                ${userNotes}
            </div>
        </div>
        
        <div class="mb-3">
            <label class="form-label"><strong>AI Prompt to Copy:</strong></label>
            <div class="d-flex gap-2 mb-2">
                <button class="btn btn-outline-primary btn-sm" onclick="copyToClipboard('aiPrompt')">
                    <i class="fas fa-copy me-1"></i>Copy Prompt
                </button>
                <a href="https://chat.openai.com" target="_blank" class="btn btn-outline-success btn-sm">
                    <i class="fas fa-external-link-alt me-1"></i>Open ChatGPT
                </a>
            </div>
            <textarea class="form-control" id="aiPrompt" rows="8" readonly>${prompt}</textarea>
        </div>
        
        <div class="mb-3">
            <label class="form-label"><strong>Paste AI Response Here:</strong></label>
            <textarea class="form-control" id="aiResponse" rows="6" placeholder="Paste the AI-generated script here..."></textarea>
        </div>
        
        <div class="mb-3">
            <label class="form-label"><strong>Script Title:</strong></label>
            <input type="text" class="form-control" id="externalScriptTitle" placeholder="Enter a title for your script">
        </div>
        
        <div class="d-flex justify-content-between">
            <button type="button" class="btn btn-secondary" onclick="backToNotes()">
                <i class="fas fa-arrow-left me-2"></i>Back to Notes
            </button>
            <button type="button" class="btn btn-success" onclick="saveExternalScript()">
                <i class="fas fa-save me-2"></i>Save Script
            </button>
        </div>
    `;
    
    externalStep.style.display = 'block';
}

function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    element.select();
    element.setSelectionRange(0, 99999); // For mobile devices
    document.execCommand('copy');
    
    // Show feedback
    const button = event.target.closest('button');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check me-1"></i>Copied!';
    setTimeout(() => {
        button.innerHTML = originalText;
    }, 2000);
}

function saveExternalScript() {
    const title = document.getElementById('externalScriptTitle').value.trim();
    const content = document.getElementById('aiResponse').value.trim();
    
    if (!title || !content) {
        alert('Please enter both a title and content for the script.');
        return;
    }
    
    // Save the script
    fetch('/api/scripts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            title: title,
            content: content
        })
    })
    .then(response => response.json())
    .then(data => {
        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('generateScriptModal'));
        modal.hide();
        
        // Show success message
        alert('Script saved successfully!');
        
        // Reload scripts to show the new one
        loadScripts();
    })
    .catch(error => {
        console.error('Error saving script:', error);
        alert('Error saving script. Please try again.');
    });
}

function backToNotes() {
    document.getElementById('aiNotesStep').style.display = 'block';
    document.getElementById('aiScriptStep').style.display = 'none';
    document.getElementById('aiLoadingStep').style.display = 'none';
    
    // Hide external step if it exists
    const externalStep = document.getElementById('aiExternalStep');
    if (externalStep) {
        externalStep.style.display = 'none';
    }
}

async function saveGeneratedScript() {
    const title = document.getElementById('generatedScriptTitle').value.trim();
    const content = document.getElementById('generatedScriptContent').value.trim();
    
    if (!title || !content) {
        alert('Please enter both a title and content for the script.');
        return;
    }
    
    try {
        const response = await fetch('/api/scripts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title,
                content: content
            })
        });
        
        if (response.ok) {
            const newScript = await response.json();
            
            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('generateScriptModal'));
            modal.hide();
            
            // Show success message
            alert('Script saved successfully!');
            
            // Reload scripts to show the new one
            loadScripts();
        } else {
            alert('Error saving script. Please try again.');
        }
    } catch (error) {
        console.error('Error saving script:', error);
        alert('Error saving script. Please try again.');
    }
} 

// ===== STREAMLINED CALL WORKFLOW FUNCTIONS =====

// Initialize the call queue and start the streamlined workflow
function startStreamlinedWorkflow() {
    if (selectedPhones.length === 0 || !selectedCallScript) {
        showAlert('Please select phone numbers and a script first', 'error');
        return;
    }
    
    // Build call queue from selected phones - include ALL selected phones, not just pending ones
    // This ensures we don't skip phones for the same representative
    callQueue = selectedPhones.map(phone => ({
        ...phone,
        status: 'pending' // Reset all statuses to pending for the workflow
    })); // Create a deep copy to avoid modifying original
    
    if (callQueue.length === 0) {
        showAlert('No phone numbers selected', 'info');
        return;
    }
    
    currentCallIndex = 0;
    
    // Update script display with first call information
    updateFullScriptDisplay();
    
    showNextCallWorkflow();
    updateNextCallWorkflow();
}

// Show the next call workflow interface
function showNextCallWorkflow() {
    document.getElementById('nextCallWorkflow').style.display = 'block';
}

// Hide the next call workflow interface
function hideNextCallWorkflow() {
    document.getElementById('nextCallWorkflow').style.display = 'none';
}

// Update the next call workflow display
function updateNextCallWorkflow() {
    if (callQueue.length === 0 || currentCallIndex >= callQueue.length) {
        hideNextCallWorkflow();
        return;
    }
    
    const currentCall = callQueue[currentCallIndex];
    const totalCalls = callQueue.length;
    const progress = ((currentCallIndex + 1) / totalCalls) * 100;
    
    // Get current zip code
    const zipCode = document.getElementById('zipCode').value || 'Not set';
    
    // Update display
    document.getElementById('currentCallRepName').textContent = currentCall.repName;
    document.getElementById('currentCallRepTitle').textContent = currentCall.repPosition;
    document.getElementById('currentCallPhone').textContent = `${currentCall.phone_type}: ${currentCall.display_phone}`;
    document.getElementById('currentCallZipCode').textContent = `Zip Code: ${zipCode}`;
    document.getElementById('callProgressBar').style.width = `${progress}%`;
    document.getElementById('callProgressText').textContent = `Call ${currentCallIndex + 1} of ${totalCalls}`;
    
    // Update button states
    const startCallButton = document.getElementById('startCallButton');
    const completeCallButton = document.getElementById('completeCallButton');
    const nextCallButton = document.getElementById('nextCallButton');
    
    if (currentCall.status === 'pending') {
        startCallButton.style.display = 'inline-block';
        completeCallButton.style.display = 'none';
        nextCallButton.style.display = 'none';
        // Use only the base 10-digit number, not the extension
        const basePhoneNumber = currentCall.display_phone.split(' x')[0].replace(/[^0-9]/g, '');
        // Ensure we only use exactly 10 digits
        const cleanPhoneNumber = basePhoneNumber.replace(/\D/g, '').substring(0, 10);
        startCallButton.href = `tel:${cleanPhoneNumber}`;
    } else if (currentCall.status === 'active') {
        startCallButton.style.display = 'none';
        completeCallButton.style.display = 'inline-block';
        nextCallButton.style.display = 'none';
    } else if (currentCall.status === 'completed') {
        startCallButton.style.display = 'none';
        completeCallButton.style.display = 'none';
        nextCallButton.style.display = 'inline-block';
    }
}

// Start the current call
function startCurrentCall() {
    if (currentCallIndex >= callQueue.length) return;
    
    const currentCall = callQueue[currentCallIndex];
    currentCall.status = 'active';
    
    // Update the corresponding phone in selectedPhones
    const phoneInSelected = selectedPhones.find(p => p.repId === currentCall.repId && p.phoneIndex === currentCall.phoneIndex);
    if (phoneInSelected) {
        phoneInSelected.status = 'active';
    }
    
    // Ensure script display is maintained
    updateFullScriptDisplay();
    
    updateNextCallWorkflow();
    updateCallInfo(); // Update the main rep list to show real-time status
}

// Complete the current call
function completeCurrentCall() {
    if (currentCallIndex >= callQueue.length) return;
    
    const currentCall = callQueue[currentCallIndex];
    
    // Ensure script display is maintained before opening modal
    updateFullScriptDisplay();
    
    openCallLogModal(currentCall.repId, currentCall.phoneIndex);
}

// Move to the next call
function nextCall() {
    currentCallIndex++;
    
    if (currentCallIndex >= callQueue.length) {
        // All calls completed
        showAlert('All calls completed! Great job! 🎉', 'success');
        hideNextCallWorkflow();
        return;
    }
    
    // Set the next call to pending (not active) so Start Call button appears
    const nextCall = callQueue[currentCallIndex];
    nextCall.status = 'pending';
    
    // Update the corresponding phone in selectedPhones
    const phoneInSelected = selectedPhones.find(p => p.repId === nextCall.repId && p.phoneIndex === nextCall.phoneIndex);
    if (phoneInSelected) {
        phoneInSelected.status = 'pending';
    }
    
    // Update script display with current call information
    updateFullScriptDisplay();
    
    updateNextCallWorkflow();
    updateCallInfo(); // Update the main rep list to show real-time status
    
    // Show appropriate message based on whether it's the same rep or a different one
    const currentCall = callQueue[currentCallIndex - 1]; // Previous call
    if (currentCall && nextCall.repId === currentCall.repId) {
        showAlert(`Next call: ${nextCall.repName} (${nextCall.phone_type})`, 'info');
    } else {
        showAlert(`Next call: ${nextCall.repName}`, 'info');
    }
}

// Toggle call rep section
function toggleCallRepSection() {
    const body = document.getElementById('callRepInfo');
    const compact = document.getElementById('callRepCompact');
    const icon = document.getElementById('callRepSectionIcon');
    
    if (body.style.display === 'none') {
        body.style.display = 'block';
        compact.style.display = 'none';
        icon.className = 'fas fa-chevron-down ms-auto';
    } else {
        body.style.display = 'none';
        compact.style.display = 'block';
        icon.className = 'fas fa-chevron-right ms-auto';
    }
}

// Script display is handled by updateFullScriptDisplay - no duplication needed

// Modified saveCallLog to work with streamlined workflow
function saveCallLogStreamlined() {
    if (!currentCallLog) return;
    
    const phone = currentCallLog.phone;
    const callDateTime = document.getElementById('callDateTime').value;
    const callOutcome = document.getElementById('callOutcome').value;
    const failureReason = document.getElementById('failureReason').value;
    const callNotes = document.getElementById('callNotes').value;
    
    // Combine notes
    let combinedNotes = callNotes;
    if (callOutcome === 'failed' && failureReason) {
        combinedNotes = `Failed: ${failureReason}${callNotes ? '\n\n' + callNotes : ''}`;
    }
    
    const callLogData = {
        user_id: 'default_user',
        representative_name: phone.repName,
        phone_number: phone.display_phone,
        phone_type: phone.phone_type,
        call_datetime: callDateTime + ':00Z',
        call_outcome: callOutcome,
        call_notes: combinedNotes,
        script_id: selectedCallScript ? selectedCallScript.id : null,
        script_title: selectedCallScript ? selectedCallScript.title : '',
        session_id: sessionId,
        is_test_data: document.getElementById('isTestData').checked
    };
    
    fetch('/api/call-logs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(callLogData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Mark call as completed
            phone.status = 'completed';
            
            // Update the call in the queue
            const queueCall = callQueue.find(c => c.repId === phone.repId && c.phoneIndex === phone.phoneIndex);
            if (queueCall) {
                queueCall.status = 'completed';
            }
            
            // Update the phone in selectedPhones
            const selectedPhone = selectedPhones.find(p => p.repId === phone.repId && p.phoneIndex === phone.phoneIndex);
            if (selectedPhone) {
                selectedPhone.status = 'completed';
            }
            
            updateCallInfo();
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('callLogModal'));
            modal.hide();
            
            // Show success message
            showAlert('Call logged successfully!', 'success');
            
            // Ensure script display is maintained
            updateFullScriptDisplay();
            
            // Automatically move to next call after a short delay
            setTimeout(() => {
                nextCall();
                // Ensure script display is maintained after nextCall
                setTimeout(() => {
                    updateFullScriptDisplay();
                }, 100);
            }, 1500);
            
        } else {
            showAlert('Error logging call: ' + data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Error logging call. Please try again.', 'danger');
    });
} 

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initDarkMode();
    loadInitialRepresentatives();
    loadScripts();
});

