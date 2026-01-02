export interface SignUpDTO {
  fullName: string;
  phoneNumber: string;
  team?: string | null;
  department?: string | null;
  yearOfStudy?: number | null;
  telegramUserName?: string | null;
  password: string;
  confirmPassword?: string; // validation
}

export interface SignInDTO {
  phoneNumber: string;
  password: string;
}
