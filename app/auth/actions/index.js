"use server";

import { BASE_URL, fetchWithAuth } from "@/services/serverApi";
import { cookies } from "next/headers";
// import { cookies } from "next/headers"

// const { default: api } = require("@/services")

export const login = async (credentials) => {
  const res = await fetchWithAuth("auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  if (res.status === 200) {
    const data = await res.json();
    cookies().set("token", data.token);
    return data;
  } else {
    return { success: false, message: "Login failed" };
  }
};
export const getLoggedInUser = async () => {
  const res = await fetchWithAuth(`auth/me`);
  const data = await res.json();
  return data;
};

// Tell the API the session ended so the logout lands in the device/audit
// trail (recordAuthEvent). Best-effort — never blocks the client-side signOut.
export const apiLogout = async () => {
  try {
    const res = await fetchWithAuth("auth/logout");
    return res.json();
  } catch {
    return { success: false };
  }
};

export const getLoggedInCustomer = async () => {
  const res = await fetchWithAuth(`auth/me/customer`);
  const data = await res.json();
  return data;
};

export const registerAction = async (data) => {
  const res = await fetch(`${BASE_URL}auth/register`, {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
  });
  return res.json();
};

export const verifyOtp = async (data) => {
  const res = await fetch(`${BASE_URL}auth/confirm-user-by-otp`, {
    method: "PUT",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
  });
  return res.json();
};

export const resendOtp = async (data) => {
  const res = await fetch(`${BASE_URL}auth/re-send-opt`, {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
  });
  return res.json();
};

export const forgetPassword = async (data) => {
  const payload = {
    ...data,
    url: process.env.NEXT_PUBLIC_CLIENT_URL,
    clientUrl: process.env.NEXT_PUBLIC_CLIENT_URL,
  };
  const res = await fetch(`${BASE_URL}auth/forgot-password`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
  });
  return res.json();
};

export const resetPassword = async (data, token) => {
  const url = `${BASE_URL}auth/reset-password/${token}`;
  const res = await fetch(url, {
    method: "PUT",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
  });
  console.log("reset password url", url);
  console.log("reset password data", data);
  console.log("reset password response", res);
  return res.json();
};
