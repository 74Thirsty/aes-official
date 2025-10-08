// recurring.js

// Placeholder for managing recurring journal entries
let recurringEntries = [];

// This function will check if any recurring entries need to be added for the current date
function checkRecurringEntries() {
    const today = new Date();
    const recurringJournalEntries = getRecurringEntriesFromLocalStorage();

    recurringJournalEntries.forEach(entry => {
        const startDate = new Date(entry.startDate);
        const endDate = new Date(entry.endDate);
        const frequency = entry.frequency;
        
        // Check if the entry is within the start and end date range
        if (today >= startDate && today <= endDate) {
            if (shouldCreateRecurringEntry(frequency, today, startDate)) {
                // Create the recurring entry if the conditions are met
                createRecurringEntry(entry);
            }
        }
    });
}

// Placeholder function for determining if we should create a new entry based on frequency
function shouldCreateRecurringEntry(frequency, today, startDate) {
    switch (frequency) {
        case 'daily':
            return isSameDay(today, startDate);
        case 'weekly':
            return isSameWeek(today, startDate);
        case 'monthly':
            return isSameMonth(today, startDate);
        default:
            return false;
    }
}

// Helper function to check if two dates fall on the same day
function isSameDay(today, startDate) {
    return today.getDate() === startDate.getDate() &&
           today.getMonth() === startDate.getMonth() &&
           today.getFullYear() === startDate.getFullYear();
}

// Helper function to check if two dates fall in the same week
function isSameWeek(today, startDate) {
    const todayWeek = getWeekNumber(today);
    const startDateWeek = getWeekNumber(startDate);
    return todayWeek === startDateWeek;
}

// Helper function to get the week number of a given date
function getWeekNumber(date) {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + 1) / 7);
}

// Helper function to check if two dates fall in the same month
function isSameMonth(today, startDate) {
    return today.getMonth() === startDate.getMonth() &&
           today.getFullYear() === startDate.getFullYear();
}

// Function to create a recurring journal entry and add it to the journal entries list
function createRecurringEntry(entry) {
    const journalEntry = {
        journalNumber: `R-${Date.now()}`,  // Unique journal number with prefix 'R' for recurring entries
        postDate: new Date().toISOString().split('T')[0],  // Today's date
        description: entry.description,
        entries: entry.entries,
        isRecurring: true,  // Mark the entry as recurring
    };

    // Add the recurring entry to the journal entries list (you may need to integrate it with localStorage or other mechanisms)
    journalEntries.push(journalEntry);
    localStorage.setItem('journalEntries', JSON.stringify(journalEntries));

    // Optionally display the journal entry
    displayJournalEntries();
}

// Function to save a recurring journal entry
function saveRecurringEntry(entry) {
    recurringEntries.push(entry);
    localStorage.setItem('recurringEntries', JSON.stringify(recurringEntries));
}

// Function to get all recurring journal entries from storage
function getRecurringEntriesFromLocalStorage() {
    const recurringEntriesFromStorage = localStorage.getItem('recurringEntries');
    return recurringEntriesFromStorage ? JSON.parse(recurringEntriesFromStorage) : [];
}

// Function to add a new recurring entry (triggered from UI)
function addRecurringEntry() {
    const account1Type = document.getElementById("account1Type").value;
    const account1Name = document.getElementById("account1Name").value;
    const debitAmount1 = parseFloat(document.getElementById("debitAmount1").value) || 0;
    const creditAmount1 = parseFloat(document.getElementById("creditAmount1").value) || 0;

    const account2Type = document.getElementById("account2Type").value;
    const account2Name = document.getElementById("account2Name").value;
    const debitAmount2 = parseFloat(document.getElementById("debitAmount2").value) || 0;
    const creditAmount2 = parseFloat(document.getElementById("creditAmount2").value) || 0;

    const description = document.getElementById("description").value;
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;
    const frequency = document.getElementById("frequency").value;

    const recurringEntry = {
        description,
        entries: [
            {
                accountType: account1Type,
                accountName: account1Name,
                debit: debitAmount1,
                credit: creditAmount1
            },
            {
                accountType: account2Type,
                accountName: account2Name,
                debit: debitAmount2,
                credit: creditAmount2
            }
        ],
        startDate,
        endDate,
        frequency,
    };

    saveRecurringEntry(recurringEntry);
}

// Trigger the recurring entries check every day or whenever appropriate
setInterval(checkRecurringEntries, 24 * 60 * 60 * 1000);  // Check daily
