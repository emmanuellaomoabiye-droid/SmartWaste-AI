import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
  auth,
  googleProvider
} from "./firebase.js";

document.addEventListener("DOMContentLoaded", () => {
  const box = document.createElement("section");

  box.style.cssText = `
    max-width: 500px;
    margin: 20px auto;
    padding: 20px;
    border-radius: 16px;
    background: #eaffef;
    color: #183b27;
    text-align: center;
    font-family: Arial, sans-serif;
  `;

  box.innerHTML = `
    <h2>♻️ EcoSort AI Account</h2>
    <p id="auth-status">Sign in to your account</p>

    <input id="auth-email" type="email"
      placeholder="Email address"
      autocomplete="email"
      style="box-sizing:border-box;width:100%;padding:12px;margin:6px 0">

    <input id="auth-password" type="password"
      placeholder="Password"
      autocomplete="current-password"
      style="box-sizing:border-box;width:100%;padding:12px;margin:6px 0">

    <button id="auth-signin" type="button">Sign In</button>
    <button id="auth-signup" type="button">Create Account</button>
    <button id="auth-google" type="button">Continue with Google</button>
    <button id="auth-signout" type="button" hidden>Sign Out</button>

    <p id="auth-message" role="status"></p>
  `;

  document.body.prepend(box);

  const email = document.getElementById("auth-email");
  const password = document.getElementById("auth-password");
  const status = document.getElementById("auth-status");
  const message = document.getElementById("auth-message");
  const signin = document.getElementById("auth-signin");
  const signup = document.getElementById("auth-signup");
  const google = document.getElementById("auth-google");
  const signout = document.getElementById("auth-signout");

  signup.addEventListener("click", async () => {
    message.textContent = "";

    try {
      await createUserWithEmailAndPassword(
        auth,
        email.value.trim(),
        password.value
      );
      message.textContent = "Account created successfully!";
    } catch (error) {
      message.textContent = error.message;
    }
  });

  signin.addEventListener("click", async () => {
    message.textContent = "";

    try {
      await signInWithEmailAndPassword(
        auth,
        email.value.trim(),
        password.value
      );
      message.textContent = "Signed in successfully!";
    } catch (error) {
      message.textContent = error.message;
    }
  });

  google.addEventListener("click", async () => {
    message.textContent = "";

    try {
      await signInWithPopup(auth, googleProvider);
      message.textContent = "Signed in with Google!";
    } catch (error) {
      message.textContent = error.message;
    }
  });

  signout.addEventListener("click", async () => {
    try {
      await signOut(auth);
      message.textContent = "Signed out.";
    } catch (error) {
      message.textContent = error.message;
    }
  });

  onAuthStateChanged(auth, user => {
    status.textContent = user
      ? "Signed in: " + user.email
      : "Sign in to your account";

    signin.hidden = !!user;
    signup.hidden = !!user;
    google.hidden = !!user;
    email.hidden = !!user;
    password.hidden = !!user;
    signout.hidden = !user;
  });
});
