// theme.js

function applyTheme() {
    const selectedTheme = document.querySelector('input[name="theme"]:checked')?.value;
    const themeStyle = document.getElementById("theme-style");
  
    if (!themeStyle) return;
  
    if (selectedTheme === "dark") {
      themeStyle.innerHTML = `
        body {
          background-color: #1e1e1e;
          color: #f5f5f5;
        }
      `;
      localStorage.setItem("theme", "dark");
    } else {
      themeStyle.innerHTML = `
        body {
          background-color: #FFE4E4;
          color: #333;
        }
      `;
      localStorage.setItem("theme", "light");
    }
  }
  
  function loadTheme() {
    const themeStyle = document.getElementById("theme-style");
    const savedTheme = localStorage.getItem("theme") || "light";
  
    if (!themeStyle) return;
  
    if (savedTheme === "dark") {
      themeStyle.innerHTML = `
        body {
          background-color: #1e1e1e;
          
        }
      `;
    } else {
      themeStyle.innerHTML = `
        body {
          background-color: #FFE4E4;
          
        }
      `;
    }
  
    // Optional: auto-check the saved radio button if available
    const radio = document.querySelector(`input[name="theme"][value="${savedTheme}"]`);
    if (radio) radio.checked = true;
  }
  
  document.addEventListener("DOMContentLoaded", loadTheme);
  