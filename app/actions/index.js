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

// export const getChatStreams = async (body, onChunk, signal) => {
//   const response = await fetch(`${process.env.NEXT_PUBLIC_CHAT_URL}/ask_stream_response_v1`, {
//     method: "POST",
//     body: JSON.stringify(body),
//     headers: {
//       "Content-Type": "application/json",
//       "X-API-Key": process.env.NEXT_PUBLIC_NISA_API_KEY,
//     },
//   });
//   if (!response.ok || !response.body) {
//     throw new Error("Network response was not ok");
//   }
//   const reader = response.body.getReader();
//   const decoder = new TextDecoder("utf-8");
//   let buffer = "";

// };
export const getChatStreams = async (body, onChunk, signal) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_CHAT_URL}/ask_stream_response_v1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.NEXT_PUBLIC_NISA_API_KEY,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error("Network response was not ok");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Pass each newly received text chunk to the client.
      onChunk(buffer);
    }

    buffer += decoder.decode();

    if (buffer) {
      onChunk(buffer);
    }
  } finally {
    reader.releaseLock();
  }
};
