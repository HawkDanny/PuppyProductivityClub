/**
 * Puppy Productivity Club
 * Created by Danny Hawk, 2017
 * 
 * I wanted a producitvity tool that complimented how I like to work,
 * so I created my own. It the conjunction of a to do list, and the
 * pomodoro technique. It allows you to work on a task to completion
 * without being interrupted by a timer, but quietly keeps track of 
 * the time you're spendng on a task. It will allot breaks for you in
 * order for you to stay productive and fresh.
 * 
 * This tool operates under the assumption that you know how to chunk
 * your tasks into smaller completable tasks.
 */

/**
 * Problems encountered making this:
    - Originally, I was just hard coding the dynamic html, but it became apparent that I would need
    to create a better method for constructing the html, after I started progamming the "remove" functionality
    - NodeList's don't have a remove feature. They're 'array-like'
    - Handling when the list was reordered.
    - Implementing a state system halfway through development really leaves the entire project messy.
 */

var APPSTATE = {
    ENTRY: 0,
    WORKING: 1,
    BREAK: 2
};
Object.freeze(state);

//The current state of the application
var state;

//Used for Keypress.js
var listener;

//The chunk elements, represented in an array
var chunks;

//The number of chunks in the list. chunks.length would get the same value. 
//This variable is just created for convenience and readabilty
var numChunks = 0;

//The innerHTML of the todo list, used to check if the html has been updated
var todoHTML;

//Used to keep track of the state of the tutorial
var tutorialCounter = -1;

//A bool that is used to track if the list has just been completed
var listCompleted;

//A date variable that keeps track of when the current session was started
var sessionTime;

//How long the work portion is
var workLength;

//The text being shown to the user while on break
var timerText;

//Variable to hold the interval data
var interval;

//Informatio state
var showInformation;


//Fired when the window has loaded.
//Initializes default values and triggers set up functions
function init() {
    state = APPSTATE.ENTRY;

    //Sortable
    var el = document.querySelector("ul");
    var sortable = new Sortable(el, {
        animation: 150,
        handle: ".handle"
    });

    //Get the todo list HTML
    todoHTML = document.querySelector(".todo").innerHTML;
    
    //Initialize chunks
    chunks = [];

    //List has not been completed
    listCompleted = false;

    //25 minutes
    workLength = 1200000;

    //Don't show information by default
    showInformation = false;

    //Start the page off with a chunk
    addChunk(true);

    //Run the first call of Autosize
    autosize(document.querySelectorAll('textarea'));

    //Keypress
    listener = new window.keypress.Listener();

    //Set up input initialization for Keypress
    listener.register_many([{
            "keys"              : "shift enter",
            "is_exclusive"      : true,
            "on_keydown"        : startWorking,
            "prevent_repeat"    : true,
        },
        {
            "keys"              : "shift backspace",
            "is_exclusive"      : true,
            "on_keydown"        : removeChunk,
            "prevent_repeat"    : true,
        },
        {
            "keys"              : "shift tab",
            "is_exclusive"      : true,
            "on_keydown"        : function() {
                moveFocusUp();   
            },
            "prevent_repeat"    : true,
        },
        {
            "keys"              : "tab",
            "is_solitary"       : true,
            "on_keydown"        : function() {
                addChunk(false);   
            },
            "prevent_repeat"    : true,
        }
    ]);

    //Add a click listener to the arrow
    document.querySelector(".expandArrow").addEventListener("click", toEntry);

    //Add a click listener to the item
    document.querySelector(".item p").addEventListener("click", completeTask);

    //Add a click listener to the information icon
    document.querySelector(".infoMouseover").addEventListener("click", toggleInformation);
}

//Moves the focus upward one chunk
//You can optionally pass in an index, which will be
//used in lieu of the current focus
function moveFocusUp(index) {

    //Update chunks to account for changes in order
    //TODO: There is a more elegant way to handle this
    updateChunks();

    /*PROCESSES BEFORE HTML CHANGES */

    //The currently focused element
    var currentChunk = chunks[index] || document.activeElement.parentElement.parentElement;

    //Iterate through the chunks array, looking for the currently focused element
    //Iterating backwards because the last element is the one most likely to be removed
    for (var i = chunks.length - 1; i > 0; i--) {
        if (chunks[i] === currentChunk) {
            //childNodes[0] is the div, and childNodes[1] is thetextarea
            chunks[i - 1].childNodes[0].childNodes[1].focus();
            return;
        }
    }
    //Only reached if the chunk is the top chunk (index 0)
    chunks[chunks.length - 1].childNodes[0].childNodes[1].focus();
}

//Move hte focus to the last chunk
function focusOnLast() {
    chunks[chunks.length - 1].childNodes[0].childNodes[1].focus();
}

//Reconstruct the chunks array to handle changes in chunk order
function updateChunks() {

    //Get the current state and reset the chunks array
    var newChunks = document.querySelector(".todo").childNodes;
    chunks = [];

    //Iterate through the current html, and add the new chunks to the array
    for (var i = 0; i < newChunks.length - 1; i++) {
        chunks.push(newChunks[i]);
    }
}

//Used to update the tutorial text based on context
function updateTutorial() {

    var tut = document.querySelector(".tutorial");

    //Set the contents of tutorial if the user is still learning
    if (tutorialCounter === 0) {
        tut.innerHTML = "Press tab to add a new item";
        tut.style.opacity = 1;
    } else if (tutorialCounter === 1) {
        tut.innerHTML = "Press shift + delete to remove an item";
        tut.style.opacity = 1;
    } else if (tutorialCounter === 2) {
        tut.innerHTML = "Press shift + enter to start working";
        tut.style.opacity = 1;
    } else {
        tut.innerHTML = "";
        tut.style.opacity = 0;
    }
}

//Loops through chunks, and appends all the elements to .todo
function constructTodoFromChunks() {

    var todo = document.querySelector(".todo");

    //Clear the html first
    todo.innerHTML = "";

    for (var i = 0; i < chunks.length; i++) {
        todo.appendChild(chunks[i]);
    }

    //Create the tutorial text <p>
    var tut = document.createElement("p");
    tut.setAttribute("class", "tutorial");
    todo.appendChild(tut);
}

//TODO: update description
function removeChunk() {

    //Update chunks to account for changes in order
    //TODO: There is a more elegant way to handle this
    updateChunks();

    //Progress the tutorial state
    ++tutorialCounter;

    //Cannot delete the last chunk
    if (chunks.length === 1)
        return;

    //The currently focused element
    var currentChunk = document.activeElement.parentElement.parentElement;

    //The index that was focused but then was deleted
    var formerFocusIndex;

    //Iterate through the chunks array, looking for the currently focused element
    //Iterating backwards because the last element is the one most likely to be removed
    for (var i = chunks.length - 1; i >= 0; i--) {
        if (chunks[i] === currentChunk) {
            chunks.splice(i, 1);
            formerFocusIndex = i;
            break;
        }
    }

    constructTodoFromChunks();

    //if the focused chunk is the top chunk, move the focus down one,
    //if not, then move the focus up one
    if (formerFocusIndex === 0)
        moveFocusUp(formerFocusIndex + 1);
    else
        moveFocusUp(formerFocusIndex);
}

//Adds a new chunk on to the end of the todo list
//FirstTimeOverride is a boolean that is true when
//addChunk is called for the first time, because
//there is no focused value, and document.activeElement
//will return undefined
function addChunk(FirstTimeOverride) {

    //Update chunks to account for changes in order
    //TODO: There is a more elegant way to handle this
    updateChunks();

    //Progress the tutorial state
    ++tutorialCounter;

    //The currently focused element
    var currentChunk = document.activeElement.parentElement.parentElement;

    //If the focus is on the last chunk, add a 
    //new chunk. If it is on any other chunk,
    //move the focus to the next chunk
    if (currentChunk === chunks[chunks.length - 1] || FirstTimeOverride) {

        //Insert a chunk at the end of the array
        insertChunk(chunks.length);
        constructTodoFromChunks();

        //For the newest chunk: run autosize and set the focus
        var areas = document.querySelectorAll(".todo textarea");

        //Check to see if we're doing this again
        if (!listCompleted) {
            areas[areas.length - 1].focus();
        }
        listCompleted = false;

        autosize(areas[areas.length - 1]);
    }
    else {
        //Iterate through the chunks array, and stop on the currentChunk
        for (var i = 0; i < chunks.length; i++) {
            if (chunks[i] === currentChunk) {
                //childNodes[0] is the div, and childNodes[1] is thetextarea
                chunks[i + 1].childNodes[0].childNodes[1].focus();
                return;
            }
        }
    }
}

//Places a new chunk immediately after the index passed in
function insertChunk(index) {
    chunks.splice(index, 0, freshChunk());
}

//Returns a blank chunk, increments numChunks
function freshChunk() {
    //chunk
    var chunk = document.createElement("li");

    //div
    var div = document.createElement("div");
    div.setAttribute("class", "chunk");
    chunk.appendChild(div);

    //span
    var icon = document.createElement("i");
    icon.setAttribute("class", "fa fa-bars cursor_drag handle");
    div.appendChild(icon);

    //textarea
    var textarea = document.createElement("textarea");
    textarea.setAttribute("cols", "35");
    textarea.setAttribute("rows", "1");
    textarea.setAttribute("class", "c" + ++numChunks);

    //Add an onchange event to the first chunk's textarea,
    if (chunks.length === 0 || chunks.length === 1 || chunks.length === 2) {
        textarea.addEventListener("input", updateTutorial);
    }

    div.appendChild(textarea);

    return chunk;
}

//Shows the todo-list and records the time
function startWorking() {
    state = APPSTATE.WORKING;

    document.activeElement.blur();

    //Set the session starting time on the first start of the todo list
    if (sessionTime === undefined)
        sessionTime = Date.now();

    //Get the todolist off screen
    updateTodoListPosition();

    //Get the item on screen
    updateItemPosition();

    //Change the arrows visibility
    setTimeout(updateArrowVisibility, 400);
}

//Move the todo list to the spot that corresponds to the state
function updateTodoListPosition() {

    switch (state) {
        case APPSTATE.ENTRY:
            document.querySelector(".container").style.marginRight = "0px";
        break;
        case APPSTATE.WORKING:
            var width = window.innerWidth;
            var todoWidth = document.querySelector(".todo").offsetWidth;
            var offset = width + todoWidth;

            document.querySelector(".container").style.marginRight = "-" + offset + "px";
        break;
    }
    
}

//Changes the arrows visibility based on th current state
function updateArrowVisibility() {
    switch (state) {
        case APPSTATE.ENTRY:
            document.querySelector(".expandArrow").style.opacity = 0;
        break;
        case APPSTATE.WORKING:
            document.querySelector(".expandArrow").style.opacity = 1;
        break;
    }
}

//Move the current item to the spot that corresponds to the state
function updateItemPosition() {

    updateItemContent();

    var item = document.querySelector(".item");
    var p = document.querySelector(".item p");

    switch (state) {
        case APPSTATE.ENTRY:
            item.style.marginLeft = "-150vw";
            item.style.opacity = 0; //opacity is also set, so that when you resize the window, the item won't be seen briefly
        break;
        case APPSTATE.WORKING:
            item.style.marginLeft = "0px";
            item.style.opacity = 1;
            p.removeAttribute("class");
            p.setAttribute("class", "hvr-bounce-to-bottom");
        break;
    }
}

//Sets the value of item to reflect the current chunks
function updateItemContent() {
    var p = document.querySelector(".item p");

    //Check the time
    var d = Date.now();

    if (p.innerHTML === "Back at it?") {
        sessionTime = d;
    }

    //If more than 15 minutes have passes
    if (d - sessionTime > workLength) {
        startBreak();
        return;
    }

    //check to see if there is nothing in the array
    if (chunks.length === 0) {
        p.innerHTML = "All done!";
        p.setAttribute("class", "cutItOut");
        listCompleted = true;
        return;
    }

    var chunkValue = chunks[0].childNodes[0].childNodes[1].value;
    
    if (chunkValue === "") {
        if (listCompleted) return; //Prevents the "All done!" from turning into "[empty]" on animation
        p.innerHTML = "[empty]";
    } else {
        p.innerHTML = chunkValue;
    }

}

//Transitions back to the entry state
function toEntry() {
    state = APPSTATE.ENTRY;

    //Make sure we're not heading back to an empty chunk array
    if (chunks.length === 0) {
        addChunk(true);
    }

    //Get the todolist on screen
    setTimeout(updateTodoListPosition, 400);

    //Get the item off screen
    setTimeout(updateItemPosition, 400);

    //This cannot be good programming
    setTimeout(focusOnLast, 1000);

    //Change the arrows visibility
    updateArrowVisibility();
}

//Called when the current item has been completed
function completeTask() {

    //remove the current chunk
    chunks.splice(0, 1);

    //reconstruct the chunks
    constructTodoFromChunks();

    updateItemContent();
}

//Called to kick off the 5 minute break
function startBreak() {
    state = APPSTATE.BREAK;

    createTimer();

    //Call updateTimer every minute
    interval = setInterval(updateTimer, 60000);
}

function createTimer() {
    timerText = 5;

    var p = document.querySelector(".item p");
    p.setAttribute("class", "cutItOut");
    p.style.fontSize = "150vh";
    p.style.color = "#3392C7";

    p.innerHTML = timerText;
}

function updateTimer() {

    var p = document.querySelector(".item p");

    if (timerText === 1) {
        state = APPSTATE.WORKING;
        clearInterval(interval);
        p.style.color = "#464637";
        p.style.fontSize = "30px";
        p.innerHTML = "Back at it?";
        p.removeAttribute("class");
        p.setAttribute("class", "hvr-bounce-to-bottom");
        return;
    }

    //Decrement the timer
    p.innerHTML = --timerText;
}

//Called to swap between showing the information and not
function toggleInformation() {

    //Swap to the new state
    showInformation = !showInformation;
    
    //Get the div that will be toggled
    var info = document.querySelector(".information");
    
    if (showInformation) {
        info.style.visibility = "visible";
        info.style.opacity = "0.75";
    } else {
        setTimeout(function() { info.style.visibility = "hidden"; }, 250);
        info.style.opacity = "0";
    }
}




window.onload = init;