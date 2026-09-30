(() => {
  const signedIn = document.getElementById("signed-in-actions");
  const username = document.getElementById("account-username");
  const logout = document.getElementById("logout-button");

  if (!signedIn || !username || !logout) return;

  async function refreshAccount() {
    try {
      const response = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (!response.ok) throw new Error("Not signed in");
      const result = await response.json();
      username.textContent = `Signed in as ${result.user.username}`;
      signedIn.hidden = false;
    } catch {
      window.location.replace("/login.html");
    }
  }

  logout.addEventListener("click", async () => {
    logout.disabled = true;
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("Could not log out");
      window.location.replace("/login.html");
    } catch {
      logout.disabled = false;
    }
  });

  refreshAccount();
})();
