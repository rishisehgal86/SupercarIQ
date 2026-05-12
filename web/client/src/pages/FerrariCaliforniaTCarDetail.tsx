import { useEffect } from "react";
import { useLocation } from "wouter";

export default function RedirectToResearch() {
  const [, navigate] = useLocation();
  useEffect(() => { navigate("/research"); }, [navigate]);
  return null;
}
