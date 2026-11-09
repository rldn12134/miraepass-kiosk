import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "관리자 로그인" };

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm target="admin" />
    </Suspense>
  );
}
