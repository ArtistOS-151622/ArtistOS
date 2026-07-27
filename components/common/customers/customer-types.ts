export type Customer = {
  id: number
  customer_name: string
  phone: string
  alt_phone?: string | null
  email: string
  address: string
  reference_by?: string | null
  created_at?: string
}

export type CustomerFormValues = {
  customer_name: string
  phone: string
  alt_phone: string
  email: string
  address: string
  reference_by: string
}

export const emptyCustomerForm: CustomerFormValues = {
  customer_name: "",
  phone: "",
  alt_phone: "",
  email: "",
  address: "",
  reference_by: "",
}
