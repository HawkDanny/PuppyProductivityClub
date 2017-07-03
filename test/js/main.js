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
 */

//Used for Keypress.js
var listener;

//The chunk elements, represented in an array
var chunks;

//The number of chunks in the list. chunks.length would get the same value. 
//This variable is just created for convenience and readabilty
var numChunks = 0;

//The innerHTML of the todo list, used to check if the html has been updated
var todoHTML;

//Fired when the window has loaded.
//Initializes default values and triggers set up functions
function init() {
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

    //Start the page off with a chunk
    addChunk(true);

    //Run the first call of Autosize
    autosize(document.querySelectorAll('textarea'));

    //Keypress
    listener = new window.keypress.Listener();

    //Set up input initialization for Keypress
    listener.register_many([{
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
    console.log("addChunk called");

    //Update chunks to account for changes in order
    //TODO: There is a more elegant way to handle this
    updateChunks();

    /*PROCESSES BEFORE HTML CHANGES */

    //The currently focused element
    var currentChunk = document.activeElement.parentElement.parentElement;

    //If the focus is on the last chunk, add a 
    //new chunk. If it is on any other chunk,
    //move the focus to the next chunk
    if (currentChunk === chunks[chunks.length - 1] || FirstTimeOverride) {
        /*HTML CHANGES */

        //Insert a chunk at the end of the array
        insertChunk(chunks.length);
        constructTodoFromChunks();

        /*PROCESSES AFTER THE HTML CHANGES */

        //For the newest chunk: run autosize and set the focus
        var areas = document.querySelectorAll(".todo textarea");
        areas[areas.length - 1].focus();
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
    var span = document.createElement("span");
    span.setAttribute("class", "fa fa-bars cursor_drag handle");
    div.appendChild(span);

    //textarea
    var textarea = document.createElement("textarea");
    textarea.setAttribute("cols", "35");
    textarea.setAttribute("rows", "1");
    textarea.setAttribute("class", "c" + ++numChunks);
    div.appendChild(textarea);

    return chunk;
}


window.onload = init;