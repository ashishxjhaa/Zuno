import AuthPage from "@/pages/AuthPage"
import { GuestLayout } from "@/pages/Layout"

const Register = () => {
  return (
    <GuestLayout>
      <AuthPage mode="register" />
    </GuestLayout>
  )
}

export default Register
