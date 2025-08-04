document.addEventListener("DOMContentLoaded", () => {
  const checkbox = document.getElementById("checkbox");
  const prefersDark = localStorage.getItem("darkMode") === "true";

  // Apply dark mode immediately if saved
  if (prefersDark) {
    document.body.classList.add("dark-mode");
    if (checkbox) checkbox.checked = true;
  }

  // Toggle handler
  if (checkbox) {
    checkbox.addEventListener("change", () => {
      const isDark = checkbox.checked;
      localStorage.setItem("darkMode", isDark);
      document.body.classList.toggle("dark-mode", isDark);
    });
  }
});
