"use client";

import { useState } from "react";
import { fulfillOrder } from "./actions";

export default function FulfillButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleFulfill = async () => {
    setLoading(true);
    setError("");
    const res = await fulfillOrder(orderId);
    if (res.error) {
      setError(res.error);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return null; // The parent component will render the "Evaso" badge since we can revalidate the path
  }

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-sm text-red-500">{error}</span>}
      <button
        onClick={handleFulfill}
        disabled={loading}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium text-sm shadow-sm transition-colors disabled:opacity-50"
      >
        {loading ? "Evasione in corso..." : "Segna come Evaso"}
      </button>
    </div>
  );
}
