const prevent = (event) => event.preventDefault();
document.addEventListener("selectstart", prevent, true);
document.addEventListener("dragstart", prevent, true);
document.addEventListener("contextmenu", prevent, true);
