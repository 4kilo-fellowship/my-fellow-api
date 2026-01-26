// type safety for signing-up
export interface SignUpDTO {
  fullName: string;
  phoneNumber: string;
  team?: string | null;
  department?: string | null;
  yearOfStudy?: string | null;
  telegramUserName?: string | null;
  password: string;
  confirmPassword?: string;
}

// type safety for signing-in
export interface SignInDTO {
  phoneNumber: string;
  password: string;
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
