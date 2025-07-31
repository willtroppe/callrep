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
        
        // Show scripts section and call section
        document.getElementById('scriptsSection').style.display = 'block';
        showCallSection();
        
    } catch (error) {
        console.error('Error loading representatives:', error);
        showAlert('Error loading representatives. Please try again.', 'error');
    }
}

// Load representatives without requiring zip code (for initialization)
async function loadInitialRepresentatives() {
    console.log('loadInitialRepresentatives called');
    try {
        // Just clear the representatives list and show the add form
        document.getElementById('representativesList').innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                Enter a zip code above to find your representatives, or add them manually below.
            </div>
        `;
    } catch (error) {
        console.error('Error in loadInitialRepresentatives:', error);
    }
}

// Display representatives in the UI
function displayRepresentatives(representatives) {
    const container = document.getElementById('representativesList');
    
    if (representatives.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No representatives found for this zip code.
            </div>
        `;
        return;
    }

    let html = `
        <div class="mb-3">
            <button class="btn btn-outline-primary btn-sm me-2" onclick="selectAllPhones()">
                <i class="fas fa-check-square me-1"></i>Select All
            </button>
            <button class="btn btn-outline-secondary btn-sm" onclick="deselectAllPhones()">
                <i class="fas fa-square me-1"></i>Deselect All
            </button>
        </div>
    `;

    representatives.forEach(rep => {
        html += `
            <div class="representative-card mb-3" id="rep-${rep.id}">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6>${rep.full_name} <span class="position-badge">${rep.display_position}</span></h6>
                        <div class="phone-numbers">
                            <div class="phone-checkbox-group">
        `;
        
        rep.phone_numbers.forEach((phone, index) => {
            html += `
                <div class="phone-checkbox-item" id="phone-${rep.id}-${index}">
                    <input type="checkbox" id="radio-${rep.id}-${index}" 
                           value="${rep.id}-${index}" onchange="selectPhoneNumber('${rep.id}', ${index}, '${rep.full_name}', '${phone.display_phone}', '${phone.phone_type}', '${phone.phone_link}')">
                    <label for="radio-${rep.id}-${index}">
                        <i class="fas fa-phone me-2"></i>
                        <span class="phone-type">${phone.phone_type}:</span>
                        <span class="phone-number">${phone.display_phone}</span>
                    </label>
                    <button class="btn btn-outline-danger btn-sm ms-2" onclick="deletePhoneNumber(${rep.id}, ${phone.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        });
        
        html += `
                            </div>
                        </div>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-success btn-sm" onclick="addPhoneToRepresentative('${rep.id}', '${rep.full_name}')">
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
        `;
    });

    container.innerHTML = html;
}

// Add a new representative
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
    
    fetch('/api/representatives', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            position: finalPosition,
            zip_code: document.getElementById('zipCode').value
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Clear form
            document.getElementById('newRepFirstName').value = '';
            document.getElementById('newRepLastName').value = '';
            document.getElementById('newRepPosition').value = 'Senator';
            document.getElementById('newRepCustomPosition').value = '';
            document.getElementById('newRepCustomPosition').style.display = 'none';
            
            // Reload representatives
            loadRepresentatives();
            showAlert('Representative added successfully!', 'success');
        } else {
            showAlert('Error adding representative: ' + data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Error adding representative. Please try again.', 'danger');
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

// Add phone to representative
function addPhoneToRepresentative(repId, repName) {
    // Get all phone number entries
    const phoneEntries = document.querySelectorAll('.phone-number-entry');
    const phones = [];
    
    phoneEntries.forEach(entry => {
        const phone = entry.querySelector('[data-phone="phone"]').value.trim();
        const extension = entry.querySelector('[data-phone="extension"]').value.trim();
        const type = entry.querySelector('[data-phone="type"]').value;
        const customType = entry.querySelector('[data-phone="custom-type"]').value.trim();
        
        if (phone) {
            const finalType = type === 'Other' ? customType : type;
            if (type === 'Other' && !customType) {
                showAlert('Please enter a custom phone type for all entries.', 'danger');
                return;
            }
            
            phones.push({
                phone: phone,
                extension: extension,
                phone_type: finalType
            });
        }
    });
    
    if (phones.length === 0) {
        showAlert('Please enter at least one phone number.', 'danger');
        return;
    }
    
    // Add each phone number
    phones.forEach(phoneData => {
        fetch('/api/representatives/' + repId + '/phones', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(phoneData)
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                showAlert('Error adding phone number: ' + data.error, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Error adding phone number. Please try again.', 'danger');
        });
    });
    
    // Clear phone number entries
    const phoneList = document.getElementById('phoneNumbersList');
    phoneList.innerHTML = `
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
    
    // Reload representatives after a short delay
    setTimeout(() => {
        loadRepresentatives();
        showAlert('Phone numbers added successfully!', 'success');
    }, 500);
}

// Delete representative
function deleteRepresentative(repId) {
    if (confirm('Are you sure you want to delete this representative?')) {
        fetch('/api/representatives/' + repId, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadRepresentatives();
                showAlert('Representative deleted successfully!', 'success');
            } else {
                showAlert('Error deleting representative: ' + data.error, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Error deleting representative. Please try again.', 'danger');
        });
    }
}

// Delete phone number
function deletePhoneNumber(repId, phoneId) {
    if (confirm('Are you sure you want to delete this phone number?')) {
        fetch('/api/representatives/' + repId + '/phones/' + phoneId, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadRepresentatives();
                showAlert('Phone number deleted successfully!', 'success');
            } else {
                showAlert('Error deleting phone number: ' + data.error, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Error deleting phone number. Please try again.', 'danger');
        });
    }
}

// Load scripts (global)
async function loadScripts() {
    console.log('loadScripts called');
    try {
        const response = await fetch('/api/scripts');
        const scripts = await response.json();
        console.log('Scripts loaded:', scripts);
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
        const previewText = script.content.length > 100 ? 
            script.content.substring(0, 100) + '...' : 
            script.content;
        
        html += `
            <div class="script-radio-item" id="script-${script.id}">
                <input type="radio" name="scriptSelection" id="radio-script-${script.id}"
                       value="${script.id}" onchange="selectScriptById('${script.id}')">
                <div class="script-radio-content">
                    <div class="script-title">${script.title}</div>
                    <div class="script-preview" id="preview-${script.id}">${previewText}</div>
                    <div class="script-full" id="full-${script.id}" style="display: none;">${script.content.replace(/\n/g, '<br>')}</div>
                    <div class="script-actions mt-2">
                        <button class="btn btn-link btn-sm p-0 me-3" onclick="toggleScriptExpand(${script.id})" id="toggle-${script.id}">
                            <i class="fas fa-chevron-down"></i> Show more
                        </button>
                        <button class="btn btn-link btn-sm p-0 me-3" onclick="editScript(${script.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    </div>
                </div>
                <button class="btn btn-outline-danger btn-sm" onclick="event.stopPropagation(); deleteScript(${script.id})">
                    <i class="fas fa-trash"></i>
                </button>
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
    const preview = document.getElementById(`preview-${scriptId}`);
    const full = document.getElementById(`full-${scriptId}`);
    const toggle = document.getElementById(`toggle-${scriptId}`);
    
    if (full.style.display === 'none') {
        // Expand
        preview.style.display = 'none';
        full.style.display = 'block';
        toggle.innerHTML = '<i class="fas fa-chevron-up"></i> Show less';
    } else {
        // Collapse
        preview.style.display = 'block';
        full.style.display = 'none';
        toggle.innerHTML = '<i class="fas fa-chevron-down"></i> Show more';
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
    console.log('openCallLogModal called with:', repId, phoneIndex);
    
    const phone = selectedPhones.find(p => p.repId === repId && p.phoneIndex === phoneIndex);
    if (!phone) {
        console.error('Phone not found in openCallLogModal');
        return;
    }
    
    console.log('Found phone for modal:', phone);
    
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
    
    console.log('Opening modal...');
    
    // Open modal
    try {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        console.log('Modal should be open now');
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
        session_id: sessionId
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
    console.log('=== loadCallAnalytics called ===');
    
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const outcomeFilter = document.getElementById('outcomeFilter').value;
    
    console.log('Filter values:', { startDate, endDate, outcomeFilter });
    
    // Convert dates to ISO format for API
    const startDateTime = startDate ? new Date(startDate + 'T00:00:00Z').toISOString() : '';
    const endDateTime = endDate ? new Date(endDate + 'T23:59:59Z').toISOString() : '';
    
    console.log('API date format:', { startDateTime, endDateTime });
    
    // Build query parameters
    const params = new URLSearchParams();
    if (startDateTime) params.append('start_date', startDateTime);
    if (endDateTime) params.append('end_date', endDateTime);
    if (outcomeFilter) params.append('outcome', outcomeFilter);
    
    const queryString = params.toString();
    console.log('Query string:', queryString);
    
    // Fetch call logs
    fetch(`/api/call-logs?${queryString}`)
        .then(response => response.json())
        .then(data => {
            console.log('Call logs received:', data);
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
            console.log('Stats received:', stats);
            displayCallStats(stats);
        })
        .catch(error => {
            console.error('Error loading stats:', error);
        });
}

// Display call statistics
function displayCallStats(stats) {
    console.log('displayCallStats called with:', stats);
    
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
    
    console.log('About to create charts with data:', {
        outcomeData: stats.calls_by_outcome,
        dateData: stats.calls_by_date
    });
    
    // Create charts
    createOutcomeChart(stats.calls_by_outcome);
    createDateChart(stats.calls_by_date);
    createRepChart(stats.calls_by_rep);
    createScriptChart(stats.calls_by_script);
}

// Create outcome pie chart
function createOutcomeChart(outcomeData) {
    console.log('createOutcomeChart called with:', outcomeData);
    
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
    
    console.log('Chart data:', { labels, data, colors: colors.slice(0, labels.length) });
    
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
        console.log('Outcome chart created successfully');
    } catch (error) {
        console.error('Error creating outcome chart:', error);
    }
}

// Create date line chart
function createDateChart(dateData) {
    console.log('createDateChart called with:', dateData);
    
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
    
    console.log('Date chart data:', { sortedDates, data });
    
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
        console.log('Date chart created successfully');
    } catch (error) {
        console.error('Error creating date chart:', error);
    }
}

// Create representative bar chart
function createRepChart(repData) {
    console.log('createRepChart called with:', repData);
    
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
    
    console.log('Rep chart data:', { labels, data });
    
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
        console.log('Rep chart created successfully');
    } catch (error) {
        console.error('Error creating rep chart:', error);
    }
}

// Create script pie chart
function createScriptChart(scriptData) {
    console.log('createScriptChart called with:', scriptData);
    
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
    
    console.log('Script chart data:', { labels, data, colors: colors.slice(0, labels.length) });
    
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
        console.log('Script chart created successfully');
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
        <tr>
            <td>${new Date(log.call_datetime).toLocaleString()}</td>
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
}

// Deselect all phone numbers
function deselectAllPhones() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        // Trigger the onchange event to update selectedPhones array
        checkbox.dispatchEvent(new Event('change'));
    });
}

// Handle phone number selection (now supports multiple selections)
function selectPhoneNumber(repId, phoneIndex, repName, phoneNumber, phoneType, phoneLink) {
    const phoneKey = `${repId}-${phoneIndex}`;
    const phoneData = {
        repId: repId,
        phoneIndex: phoneIndex,
        repName: repName,
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

// Test function to manually set a script (for debugging)
function testScriptDisplay() {
    console.log('Testing script display...');
    selectedCallScript = {
        id: 'test',
        title: 'Test Script',
        content: 'This is a test script content to see if the display works.'
    };
    updateCallInfo();
}

// Update call information display
function updateCallInfo() {
    updateCallRepInfo();
    updateFullScriptDisplay();
    updateCallButton();
}

// Update representative info in Step 4 using same tile as Step 2
function updateCallRepInfo() {
    const repInfo = document.getElementById('callRepInfo');

    if (selectedPhones.length > 0) {
        let html = '<div class="selected-reps-container">';
        
        // Group phones by representative
        const repsByPhone = {};
        selectedPhones.forEach(phone => {
            if (!repsByPhone[phone.repId]) {
                repsByPhone[phone.repId] = {
                    repName: phone.repName,
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
                        <h6 class="mb-2">${rep.repName}</h6>
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
    } else {
        repInfo.innerHTML = '<p class="text-muted">No phone numbers selected</p>';
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
    console.log('completePhoneCall called with:', repId, phoneIndex);
    
    // Find the phone in selectedPhones
    const phone = selectedPhones.find(p => p.repId === repId && p.phoneIndex === phoneIndex);
    console.log('Found phone:', phone);
    
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

// Update full script display in Step 4
function updateFullScriptDisplay() {
    // Make sure Step 4 is visible
    const callSection = document.getElementById('callSection');
    if (callSection) {
        callSection.style.display = 'block';
    }
    
    // Find the fullScriptDisplay div
    const fullScriptDisplay = document.getElementById('fullScriptDisplay');
    if (!fullScriptDisplay) {
        return;
    }
    
    // Find or create the alert div inside fullScriptDisplay
    let alertDiv = fullScriptDisplay.querySelector('.alert.alert-info');
    if (!alertDiv) {
        // Create the alert div if it doesn't exist
        alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-info';
        alertDiv.style.border = '2px solid #17a2b8';
        fullScriptDisplay.appendChild(alertDiv);
    }
    
    if (selectedCallScript) {
        // Show the complete script with line breaks preserved
        const formattedContent = selectedCallScript.content.replace(/\n/g, '<br>');
        alertDiv.innerHTML = `
            <h6><strong>${selectedCallScript.title}</strong></h6>
            <div class="script-content-full" style="max-height: 300px; overflow-y: auto; white-space: pre-wrap;">
                ${formattedContent}
            </div>
        `;
    } else {
        alertDiv.innerHTML = '<p class="text-muted">Select a script above to see the content here</p>';
    }
}

// Update call button
function updateCallButton() {
    const callButton = document.getElementById('makeCallButton');
    const status = document.getElementById('callReadyStatus');

    // Find the active phone (the one currently being called)
    const activePhone = selectedPhones.find(p => p.status === 'active');
    
    if (activePhone && selectedCallScript) {
        callButton.style.display = 'inline-block';
        callButton.href = `tel:${activePhone.phone_link}`;
        status.innerHTML = `
            <i class="fas fa-check-circle text-success me-2"></i>
            Ready to call ${activePhone.repName} at ${activePhone.display_phone}!
        `;
    } else {
        callButton.style.display = 'none';
        let missingItems = [];
        if (!activePhone) missingItems.push('active phone number');
        if (!selectedCallScript) missingItems.push('script');
        status.innerHTML = `Select a phone number and script above to enable calling (missing: ${missingItems.join(', ')})`;
    }
}

// Show alert messages
function showAlert(message, type) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
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
    console.log('=== DOMContentLoaded event fired ===');
    console.log('Initializing application...');
    
    // Test if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded!');
    } else {
        console.log('Chart.js is loaded successfully');
    }
    
    // Check if elements exist
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const step4 = document.getElementById('step4');
    
    console.log('Step elements found:', {
        step2: !!step2,
        step3: !!step3,
        step4: !!step4
    });
    
    // Show all steps from the beginning
    if (step2) step2.style.display = 'block';
    if (step3) step3.style.display = 'block';
    if (step4) step4.style.display = 'block';
    
    console.log('Loading initial data...');
    
    // Load initial data
    console.log('About to call loadInitialRepresentatives...');
    loadInitialRepresentatives();
    
    console.log('About to call loadScripts...');
    loadScripts();
    
    // Initialize session ID for call logging
    sessionId = generateSessionId();
    
    // Set up analytics tab event listener
    const analyticsTab = document.querySelector('a[data-bs-toggle="tab"][href="#analytics"]');
    if (analyticsTab) {
        analyticsTab.addEventListener('click', function() {
            console.log('Analytics tab clicked');
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
    
    console.log('=== Initialization complete ===');
});

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
            // Show the script step with generated content
            document.getElementById('generatedScriptContent').value = data.script;
            document.getElementById('generatedScriptTitle').value = 'AI Generated Script';
            
            document.getElementById('aiNotesStep').style.display = 'none';
            document.getElementById('aiScriptStep').style.display = 'block';
            document.getElementById('aiLoadingStep').style.display = 'none';
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

function backToNotes() {
    document.getElementById('aiNotesStep').style.display = 'block';
    document.getElementById('aiScriptStep').style.display = 'none';
    document.getElementById('aiLoadingStep').style.display = 'none';
}

function saveGeneratedScript() {
    const title = document.getElementById('generatedScriptTitle').value.trim();
    const content = document.getElementById('generatedScriptContent').value.trim();
    
    if (!title || !content) {
        alert('Please enter both a title and content for the script.');
        return;
    }
    
    // Save the script using the existing saveScript function
    saveScript(title, content);
    
    // Close the modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('generateScriptModal'));
    modal.hide();
    
    // Show success message
    alert('Script saved successfully!');
} 
