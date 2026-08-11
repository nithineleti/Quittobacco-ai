import type { Metadata } from "next";
import { ForgotPasswordScreen } from "@/components/feature/ForgotPasswordScreen";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a link to choose a new QuitTobacco password.",
};

export default function ForgotPage() {
  return <ForgotPasswordScreen />;
}
