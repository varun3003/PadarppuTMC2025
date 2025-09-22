// Tab switching logic
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    // deactivate all buttons
    document
      .querySelectorAll(".nav-btn")
      .forEach((b) => b.classList.remove("active"));
    // activate clicked button
    btn.classList.add("active");

    // hide all tabs
    document
      .querySelectorAll(".tab")
      .forEach((tab) => tab.classList.remove("active"));
    // show target tab
    const target = document.getElementById(btn.dataset.tab);
    if (target) target.classList.add("active");
  });
});
