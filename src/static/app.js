document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  
  // Auth elements
  const userIcon = document.getElementById("user-icon");
  const userMenu = document.getElementById("user-menu");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const loggedInUserDiv = document.getElementById("logged-in-user");
  const closeModal = document.querySelector(".close");
  
  // Authentication state
  let isLoggedIn = false;
  let currentUser = null;
  
  // Load authentication state from localStorage
  function loadAuthState() {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      isLoggedIn = true;
      currentUser = savedUser;
      updateAuthUI();
    }
  }
  
  // Update UI based on authentication state
  function updateAuthUI() {
    if (isLoggedIn) {
      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
      loggedInUserDiv.classList.remove("hidden");
      loggedInUserDiv.textContent = `Logged in as: ${currentUser}`;
      
      // Show delete buttons and signup form for teachers
      document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.style.display = "block";
      });
      signupForm.style.display = "block";
    } else {
      loginBtn.classList.remove("hidden");
      logoutBtn.classList.add("hidden");
      loggedInUserDiv.classList.add("hidden");
      
      // Hide delete buttons and signup form for students
      document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.style.display = "none";
      });
      signupForm.style.display = "none";
    }
  }
  
  // User icon menu toggle
  userIcon.addEventListener("click", () => {
    userMenu.classList.toggle("hidden");
  });
  
  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".user-icon-container")) {
      userMenu.classList.add("hidden");
    }
  });
  
  // Login button
  loginBtn.addEventListener("click", () => {
    userMenu.classList.add("hidden");
    loginModal.classList.remove("hidden");
  });
  
  // Logout button
  logoutBtn.addEventListener("click", () => {
    isLoggedIn = false;
    currentUser = null;
    localStorage.removeItem("currentUser");
    userMenu.classList.add("hidden");
    updateAuthUI();
    fetchActivities();
    messageDiv.textContent = "Logged out successfully";
    messageDiv.className = "success";
    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  });
  
  // Close modal button
  closeModal.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });
  
  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === loginModal) {
      loginModal.classList.add("hidden");
    }
  });
  
  // Login form submission
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    
    try {
      const response = await fetch(
        `/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );
      
      const result = await response.json();
      
      if (response.ok) {
        isLoggedIn = true;
        currentUser = username;
        localStorage.setItem("currentUser", username);
        updateAuthUI();
        loginForm.reset();
        loginModal.classList.add("hidden");
        loginMessage.classList.add("hidden");
        fetchActivities();
        messageDiv.textContent = `Welcome, ${username}!`;
        messageDiv.className = "success";
        messageDiv.classList.remove("hidden");
        setTimeout(() => {
          messageDiv.classList.add("hidden");
        }, 5000);
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Failed to login. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Login error:", error);
    }
  });

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons (only shown to teachers)
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}" style="display: ${isLoggedIn ? 'block' : 'none'};">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality (teachers only)
  async function handleUnregister(event) {
    event.preventDefault();
    
    if (!isLoggedIn) {
      messageDiv.textContent = "You must be logged in as a teacher to unregister students";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
      return;
    }
    
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission (teachers only)
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isLoggedIn) {
      messageDiv.textContent = "You must be logged in as a teacher to sign up students";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  loadAuthState();
  fetchActivities();
});
