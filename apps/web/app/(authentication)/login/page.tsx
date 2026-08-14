import AuthPage from "@/pages/AuthPage"
import { GuestLayout } from "@/pages/Layout"

const Login = () => {
  return (
    <GuestLayout>
      <AuthPage mode="login" />
    </GuestLayout>
  )
}

export default Login
