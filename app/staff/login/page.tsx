import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "직원 로그인" };

export default function StaffLoginPage() {
  return (
    <Suspense>
      <LoginForm target="staff" />
    </Suspense>
  );
}
