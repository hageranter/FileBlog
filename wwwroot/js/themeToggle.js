  if (localStorage.getItem("darkMode") === "true") {
    document.documentElement.classList.add("dark-mode");
  }







  document.addEventListener("DOMContentLoaded", () => {
  const checkbox = document.getElementById("checkbox");
  const prefersDark = localStorage.getItem("darkMode") === "true";

  if (prefersDark) {
    document.body.classList.add("dark-mode");
    if (checkbox) checkbox.checked = true;
  }

  if (checkbox) {
    checkbox.addEventListener("change", () => {
      const isDark = checkbox.checked;
      localStorage.setItem("darkMode", isDark);
      document.body.classList.toggle("dark-mode", isDark);
    });
  }
});


