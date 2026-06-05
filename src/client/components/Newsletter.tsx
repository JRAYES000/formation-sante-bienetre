import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const m = useMutation({ mutationFn: () => apiRequest("/api/public/newsletter", { method: "POST", body: JSON.stringify({ email }) }) });
  return (
    <section className="bg-ink text-white">
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold">Recevez les nouvelles formations bien-être</h2>
        <p className="text-white/70 mt-2">Conseils, financement CPF et opportunités — directement par email.</p>
        {m.isSuccess ? (
          <p className="mt-5 bg-white/10 rounded-naturo inline-block px-5 py-3" data-testid="text-newsletter-success">Merci, vous êtes inscrit(e) ! ✅</p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (email) m.mutate(); }} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md mx-auto" data-testid="form-newsletter">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Votre email" className="flex-1 rounded-[8px] px-4 py-3 text-ink outline-none" data-testid="input-newsletter" />
            <button className="btn-primary !rounded-[8px]" data-testid="button-newsletter">S'inscrire</button>
          </form>
        )}
      </div>
    </section>
  );
}
