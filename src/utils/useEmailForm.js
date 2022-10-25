import { useState } from "react";

export const useEmailForm = (url ) => {
  const initStatusState = {
    loading: false,
    error: false,
    success: false,
  };
  const [status, setStatus] = useState(initStatusState);
  const [message, setMessage] = useState("");

  const handleSubmit = async (email) => {
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    };
    setStatus({ ...status, loading: true });
    setMessage("");
    try {
      const response = await fetch(url, requestOptions);

      if (response.ok) {
        setStatus({ ...initStatusState, success: true });
      } else {
        setStatus({ ...initStatusState, error: true });
      }
      const data = await response.json();
      setMessage(data.msg);
    } catch (error) {
      setStatus({ ...initStatusState, error: true });
      setMessage(getErrorMessage(error));
    }
  };

  const reset = () => {
    setMessage("");
    setStatus(initStatusState);
  };

  return {
    status: status,
    loading: status.loading,
    success: status.success,
    error: status.error,
    message,
    handleSubmit,
    reset,
  };
};
