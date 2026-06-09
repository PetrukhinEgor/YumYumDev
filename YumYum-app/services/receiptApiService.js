import axios from "axios";

const PROVERKA_API_URL = "https://proverkacheka.com/api/v1/check/get";

function getProverkaToken() {
  return process.env.EXPO_PUBLIC_PROVERKA_TOKEN || "";
}

export async function fetchReceiptByQr(qr) {
  const token = getProverkaToken();

  if (!token) {
    throw new Error(
      "Не задан EXPO_PUBLIC_PROVERKA_TOKEN для обращения к API проверки чека"
    );
  }

  const formData = new URLSearchParams();
  formData.append("token", token);
  formData.append("qrraw", String(qr || ""));

  const response = await axios.post(PROVERKA_API_URL, formData.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    timeout: 15000,
  });

  const rawItems = response.data?.data?.json?.items || [];

  return {
    rawItems,
    rawResponse: response.data,
  };
}
