import * as yup from 'yup';

export const loginSchema = yup.object().shape({
  email: yup.string().email("Invalid email format").required("Email is required"),
  password: yup.string().required("Password is required"),
});

export const signupSchema = yup.object().shape({
  full_name: yup.string().min(3, "Min 3 characters").required("Full name is required"),
  email: yup.string().email("Invalid email format").required("Email is required"),
  password: yup.string().min(8, "Minimum 8 characters").required("Password is required"),
  confirm_password: yup.string()
    .oneOf([yup.ref('password'), null], "Passwords must match")
    .required("Please confirm your password"),
  role: yup.string().oneOf(["Admin", "HR", "Manager"], "Please select a valid role").required("Role is required"),
  company_name: yup.string().required("Company name is required"),
});

export const forgotPasswordSchema = yup.object().shape({
  email: yup.string().email("Invalid email format").required("Email is required"),
})