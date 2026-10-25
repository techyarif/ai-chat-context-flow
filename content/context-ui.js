(function (root) {
  function createButton(parent, id, label, onClick) {
    if (document.getElementById(id)) {
      return document.getElementById(id);
    }
    const button = document.createElement("button");
    button.id = id;
    button.type = "button";
    button.className = "context-flow-button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    parent.insertBefore(button, parent.firstChild);
    return button;
  }

  root.ContextUi = { createButton };
})(globalThis);
