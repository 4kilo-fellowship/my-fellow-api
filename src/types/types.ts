// type safety for signing-up
export interface SignUpDTO {
  fullName: string;
  phoneNumber: string;
  team?: string | null;
  department?: string | null;
  yearOfStudy?: string | null;
  telegramUserName?: string | null;
  password: string;
  otpToken: string;
}

// type safety for signing-in
export interface SignInDTO {
  phoneNumber: string;
  password: string;
}

// type safety for updating phone number
export interface UpdatePhoneDTO {
  phoneNumber: string;
  password: string;
  otpToken: string;
}

// chapa init types safety
export interface ChapaInitResponse {
  status: string;
  message: string;
  data: {
    checkout_url: string;
  };
}

// chapa verify response types safety
export interface ChapaVerifyResponse {
  status: string;
  message: string;
  data: {
    amount: number;
    currency: string;
    status: string;
    reference: string;
    tx_ref: string;
  };
}

// chapa init payload types safety
export interface ChapaInitPayload {
  amount: number;
  currency: string;
  email: string;
  first_name: string;
  last_name: string;
  tx_ref: string;
  callback_url?: string;
  return_url?: string;
  customization?: {
    title?: string;
    description?: string;
  };
}
