"use server";

import { BASE_URL, fetchWithAuth, IMAGE_SERVER_URL } from "@/services/serverApi";

export const logout = async () => {
  const res = await fetch("/api/auth/logout", {
    method: "POST",
  });
  return res.json();
};

export const fileUploadOnCloudinary = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  //add headers
  const apiKey = process.env.IMAGE_API_KEY;
  // console.log("apiKey", apiKey);
  const res = await fetchWithAuth(
    `file-vault/upload`,
    {
      method: "POST",
      // headers: {
      //   "x-api-key": apiKey,
      // },
      body: formData,
    },
    false,
    false,
    true,
  );
  console.log("upload res", res);
  return res.json();
};

export const getLoggedInUser = async () => {
  const response = await fetchWithAuth("auth/me");
  return response.json();
};

export const chatWithNissa = async (message) => {
  const response = await fetchWithAuth(
    "query-json",
    {
      method: "POST",
      body: JSON.stringify(message),
    },
    false,
    true,
  );
  return response.json();
};

export const getChatStreams = async (message, onMessage) => {
  const response = await fetchWithAuth(
    "ask_stream_response_v1",
    {
      method: "POST",
      body: JSON.stringify(message),
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.NEXT_PUBLIC_NISA_API_KEY,
      },
    },
    false,
    true,
  );
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let done = false;
  while (!done) {
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    const chunkValue = decoder.decode(value);
    onMessage(chunkValue);
  }
};
