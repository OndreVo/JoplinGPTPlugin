async function onTestEventClicked(){
    //console.log("Test Event Clicked");
    await webviewApi.postMessage(['testEventClicked','Blah blah']);
}

async function onSubmitQueryClicked(){
    const query = document.getElementById("gpt-query").value;
    const collectionOptions = document.getElementsByClassName("q-opt");
    let queryOptions = {};
    for (let i = 0; i < collectionOptions.length; i++) {
        const opt = collectionOptions.item(i);
        queryOptions[opt.id] = opt.checked;
    }
    document.getElementById("gpt-query-button").style.display = "none";
    document.getElementById("gpt-query-wip").style.display = "block";
    //console.log("Submit Query Clicked " + query + ";;" + type);
    await webviewApi.postMessage(['submitQueryClicked',query,queryOptions]);
}

async function onUseResponseClicked(btn) {
    let response = btn.parentElement.parentElement.getElementsByTagName("p")[0].innerText;
    //console.log("Use Response Clicked " + response);
    await webviewApi.postMessage(['useResponseClicked',response]);
}

async function onClearClicked(btn) {
    //console.log("Clear Clicked");
    await webviewApi.postMessage(['clearClicked']);
}

